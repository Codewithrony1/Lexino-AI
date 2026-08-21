import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { verifyPaymentSignature } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'User session expired. Please log in.' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Missing required Razorpay payment verification parameters.' },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error(`Invalid payment signature attempt for order: ${razorpay_order_id}`);
      if (process.env.DATABASE_URL) {
        try {
          if ((prisma as any)?.payment) {
            await (prisma as any).payment.updateMany({
              where: { orderId: razorpay_order_id },
              data: { status: 'failed' },
            });
          }
        } catch (e) {}
      }
      return NextResponse.json(
        { error: 'invalid_signature', message: 'Payment signature verification failed. Security alert logged.' },
        { status: 400 }
      );
    }

    // Determine tier from planId or existing payment record
    const targetPlan = PLANS[planId] || PLANS['pro'];
    const updatedTier = targetPlan.tier;

    if (process.env.DATABASE_URL) {
      try {
        if ((prisma as any)?.payment) {
          await (prisma as any).payment.upsert({
            where: { orderId: razorpay_order_id },
            update: {
              paymentId: razorpay_payment_id,
              signature: razorpay_signature,
              status: 'paid',
              tier: updatedTier,
              planId: targetPlan.id,
            },
            create: {
              userId,
              orderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              signature: razorpay_signature,
              status: 'paid',
              tier: updatedTier,
              planId: targetPlan.id,
              amount: targetPlan.amountInPaise,
              currency: 'INR',
            },
          });
        }

        await prisma.user.upsert({
          where: { id: userId },
          update: {
            tier: updatedTier,
            cooldownUntil: null,
            messageCountToday: 0,
          },
          create: {
            id: userId,
            email: `${userId}@placeholder.clerk.accounts`,
            name: 'User',
            tier: updatedTier,
          },
        });

        console.log(`Successfully upgraded user ${userId} to ${updatedTier} tier via order ${razorpay_order_id}`);
      } catch (dbErr) {
        console.error('Error updating DB during payment verification:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      tier: updatedTier,
      planName: targetPlan.name,
      message: `Your account has been upgraded to ${targetPlan.name} Plan! 🎉`,
    });
  } catch (error: any) {
    console.error('Error in /api/razorpay/verify:', error);
    return NextResponse.json(
      { error: 'verification_failed', message: error.message || 'Payment verification processing failed.' },
      { status: 500 }
    );
  }
}
