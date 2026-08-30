import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { verifyPaymentSignature } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('⚡ [Razorpay Verify] Incoming payment verification request received at', new Date().toISOString());

  try {
    let authUserId: string | null = null;
    try {
      const authResult = await auth();
      authUserId = authResult?.userId || null;
    } catch (e) {
      console.warn('⚠️ [Razorpay Verify] Could not retrieve session from Clerk auth():', e);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = body;

    console.log('🔍 [Razorpay Verify] Params:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      hasSignature: !!razorpay_signature,
      planId,
      sessionUserId: authUserId,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ [Razorpay Verify] Missing required parameters in payload');
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
      console.error(`❌ [Razorpay Verify] Invalid payment signature for order: ${razorpay_order_id}`);
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
        { error: 'invalid_signature', message: 'Payment signature verification failed. Please contact support.' },
        { status: 400 }
      );
    }

    let existingPayment: any = null;
    let targetUserId = authUserId;

    if (process.env.DATABASE_URL) {
      try {
        const { ensureDbTables } = await import('@/lib/ensureDbTables');
        await ensureDbTables();
      } catch (_) {}

      try {
        if ((prisma as any)?.payment) {
          try {
            existingPayment = await (prisma as any).payment.findUnique({
              where: { orderId: razorpay_order_id },
            });
          } catch (_) {}
        }
      } catch (_) {}
    }

    if (!targetUserId && existingPayment?.userId) {
      targetUserId = existingPayment.userId;
      console.log(`ℹ️ [Razorpay Verify] Recovered userId (${targetUserId}) from database payment record for order: ${razorpay_order_id}`);
    }

    if (!targetUserId) {
      console.error('❌ [Razorpay Verify] Unable to associate payment with a user ID (no session & no order record)');
      return NextResponse.json(
        { error: 'unauthorized', message: 'User session not found. Please log in.' },
        { status: 401 }
      );
    }

    // Security: Determine target plan from server-side order record (prevent client planId tampering)
    const trustedPlanId = (existingPayment?.planId || planId || 'student').toLowerCase();
    const targetPlan = PLANS[trustedPlanId] || PLANS['student'];
    const updatedTier = targetPlan.tier;

    let authUserEmail: string | null = null;
    try {
      const { currentUser } = await import('@clerk/nextjs/server');
      const curUser = await currentUser();
      authUserEmail = curUser?.emailAddresses[0]?.emailAddress || null;
    } catch (_) {}

    const { activateSubscriptionForUser } = await import('@/lib/userAccount');
    const { expiryInfo } = await activateSubscriptionForUser({
      userId: targetUserId,
      email: authUserEmail,
      targetTier: updatedTier,
      planId: targetPlan.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      amount: targetPlan.amountInPaise,
    });

    return NextResponse.json({
      success: true,
      tier: updatedTier,
      planName: targetPlan.name,
      expiresAt: expiryInfo?.expiresAt ? expiryInfo.expiresAt.toISOString() : null,
      message: `Your account has been upgraded to ${targetPlan.name} Plan for 1 month! 🎉`,
    });
  } catch (error: any) {
    console.error('❌ [Razorpay Verify] Unhandled error in /api/razorpay/verify:', error);
    return NextResponse.json(
      { error: 'verification_failed', message: error.message || 'Payment verification processing failed.' },
      { status: 500 }
    );
  }
}

