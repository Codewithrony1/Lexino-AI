import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { createRazorpayOrder, getRazorpayKeyId } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Please log in to upgrade your subscription plan.' },
        { status: 401 }
      );
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || '';
    const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User';

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const planId = (body.planId || '').toLowerCase().trim();
    const studentIdNote = (body.studentIdNote || '').toString().trim();

    const plan = PLANS[planId];
    if (!plan || plan.id === 'explorer' || plan.priceInr <= 0) {
      return NextResponse.json(
        { error: 'invalid_plan', message: 'Invalid or free plan selected for checkout.' },
        { status: 400 }
      );
    }

    if (plan.requiresStudentId && !studentIdNote) {
      return NextResponse.json(
        { error: 'student_id_required', message: 'Valid Student ID / Institution details are required for the Student Plan.' },
        { status: 400 }
      );
    }

    const keyId = getRazorpayKeyId();
    if (!keyId) {
      return NextResponse.json(
        { error: 'gateway_offline', message: 'Payment gateway is currently initializing. Please try again shortly.' },
        { status: 503 }
      );
    }

    const receipt = `rcpt_${plan.id}_${Date.now().toString().slice(-8)}`;

    const order = await createRazorpayOrder({
      amount: plan.amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        email: userEmail,
        userName,
        planId: plan.id,
        tier: plan.tier,
        studentIdNote: studentIdNote.slice(0, 200),
      },
    });

    if (process.env.DATABASE_URL) {
      try {
        const { ensureDbTables } = await import('@/lib/ensureDbTables');
        await ensureDbTables();
        if ((prisma as any)?.payment) {
          await (prisma as any).payment.upsert({
            where: { orderId: order.id },
            update: {
              amount: plan.amountInPaise,
              status: 'created',
              tier: plan.tier,
              planId: plan.id,
              studentIdUploaded: studentIdNote || null,
            },
            create: {
              userId,
              orderId: order.id,
              amount: plan.amountInPaise,
              currency: 'INR',
              status: 'created',
              tier: plan.tier,
              planId: plan.id,
              studentIdUploaded: studentIdNote || null,
              receipt,
            },
          });
        }
      } catch (dbErr) {
        console.error('Error recording payment in DB:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: plan.amountInPaise,
      currency: 'INR',
      keyId,
      planId: plan.id,
      planName: plan.name,
      tier: plan.tier,
    });
  } catch (error: any) {
    console.error('Error in /api/razorpay/create-order:', error);
    return NextResponse.json(
      { error: 'order_creation_failed', message: error.message || 'Failed to create payment order.' },
      { status: 500 }
    );
  }
}
