import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { createRazorpayOrder, getRazorpayKeyId } from '../../../../lib/razorpay';

export async function POST(request: Request) {
  try {
    let authData: any = null;
    try {
      authData = await auth();
    } catch {
      authData = null;
    }

    if (!authData?.userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Please log in to upgrade your subscription plan.' },
        { status: 401 }
      );
    }

    const userId = authData.userId;
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

    // Ensure student plan has student ID confirmation
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

    // Get user details for prefill
    let userEmail = '';
    let userName = 'User';
    try {
      const user = await currentUser();
      if (user) {
        userEmail = user.emailAddresses[0]?.emailAddress || '';
        userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
      }
    } catch (e) {
      console.warn('Could not fetch user details for prefill:', e);
    }

    const receipt = `rcpt_${plan.id}_${Date.now().toString().slice(-8)}`;

    const order = await createRazorpayOrder({
      amount: plan.amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        planId: plan.id,
        tier: plan.tier,
        studentIdNote: studentIdNote.slice(0, 200),
      },
    });

    // Save pending payment record in database
    if (process.env.DATABASE_URL) {
      try {
        await prisma.payment.upsert({
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
      userEmail,
      userName,
    });
  } catch (error: any) {
    console.error('Error in /api/razorpay/create-order:', error);
    return NextResponse.json(
      { error: 'order_creation_failed', message: error.message || 'Failed to create payment order.' },
      { status: 500 }
    );
  }
}
