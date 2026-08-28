import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { verifyPaymentSignature } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

async function handleRazorpayCallback(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<{ success: boolean; tier?: string; error?: string }> {
  if (!orderId || !paymentId || !signature) {
    return { success: false, error: 'Missing required callback parameters' };
  }

  const isValid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!isValid) {
    console.error(`❌ [Razorpay Callback] Signature mismatch for order: ${orderId}`);
    return { success: false, error: 'Signature verification failed' };
  }

  if (process.env.DATABASE_URL) {
    try {
      let existingPayment: any = null;
      if ((prisma as any)?.payment) {
        existingPayment = await (prisma as any).payment.findUnique({
          where: { orderId },
        });
      }

      const planId = (existingPayment?.planId || 'student').toLowerCase();
      const targetPlan = PLANS[planId] || PLANS['student'];
      const targetTier = targetPlan.tier;
      const targetUserId = existingPayment?.userId;

      // Strict 1-Month Subscription Expiry & Renewal Calculation
      const { calculateSubscriptionExpiry } = await import('@/lib/subscription');
      let existingUser: any = null;
      if (targetUserId && targetUserId !== 'unknown') {
        try {
          existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        } catch (_) {}
      }

      const expiryInfo = calculateSubscriptionExpiry(
        existingUser?.subscriptionExpiresAt,
        targetTier,
        existingUser?.tier
      );

      if (targetUserId && targetUserId !== 'unknown') {
        await prisma.user.upsert({
          where: { id: targetUserId },
          update: {
            tier: targetTier,
            subscriptionStatus: 'active',
            subscriptionStartedAt: expiryInfo.startedAt,
            subscriptionExpiresAt: expiryInfo.expiresAt,
            cooldownUntil: null,
            messageCountToday: 0,
          },
          create: {
            id: targetUserId,
            email: `${targetUserId}@placeholder.clerk.accounts`,
            name: 'User',
            tier: targetTier,
            subscriptionStatus: 'active',
            subscriptionStartedAt: expiryInfo.startedAt,
            subscriptionExpiresAt: expiryInfo.expiresAt,
          },
        });
        console.log(`✅ [Razorpay Callback] Upgraded user ${targetUserId} to ${targetTier} until ${expiryInfo.expiresAt.toISOString()}`);
      }

      if ((prisma as any)?.payment) {
        await (prisma as any).payment.upsert({
          where: { orderId },
          update: {
            paymentId,
            signature,
            status: 'paid',
            tier: targetTier,
            planId: targetPlan.id,
            expiresAt: expiryInfo.expiresAt,
          },
          create: {
            userId: targetUserId || 'unknown',
            orderId,
            paymentId,
            signature,
            status: 'paid',
            tier: targetTier,
            planId: targetPlan.id,
            amount: targetPlan.amountInPaise,
            currency: 'INR',
            expiresAt: expiryInfo.expiresAt,
          },
        });
      }

      return { success: true, tier: targetTier };
    } catch (e: any) {
      console.error('❌ [Razorpay Callback] Database error:', e);
      return { success: false, error: e.message };
    }
  }

  return { success: true };
}

export async function POST(request: Request) {
  console.log('⚡ [Razorpay Callback] Incoming POST redirect callback');
  try {
    const contentType = request.headers.get('content-type') || '';
    let orderId = '';
    let paymentId = '';
    let signature = '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      orderId = (formData.get('razorpay_order_id') as string) || '';
      paymentId = (formData.get('razorpay_payment_id') as string) || '';
      signature = (formData.get('razorpay_signature') as string) || '';
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      orderId = body.razorpay_order_id || '';
      paymentId = body.razorpay_payment_id || '';
      signature = body.razorpay_signature || '';
    }

    const result = await handleRazorpayCallback(orderId, paymentId, signature);
    const host = request.headers.get('host') || 'lexinoai.in';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;

    if (result.success) {
      return NextResponse.redirect(`${origin}/chat?payment=success&tier=${result.tier || 'PRO'}`, {
        status: 303,
      });
    } else {
      return NextResponse.redirect(`${origin}/pricing?payment=failed&reason=${encodeURIComponent(result.error || '')}`, {
        status: 303,
      });
    }
  } catch (err: any) {
    console.error('❌ [Razorpay Callback] Error:', err);
    return NextResponse.redirect('/pricing?payment=error', { status: 303 });
  }
}

export async function GET(request: Request) {
  console.log('⚡ [Razorpay Callback] Incoming GET redirect callback');
  const url = new URL(request.url);
  const orderId = url.searchParams.get('razorpay_order_id') || '';
  const paymentId = url.searchParams.get('razorpay_payment_id') || '';
  const signature = url.searchParams.get('razorpay_signature') || '';

  const result = await handleRazorpayCallback(orderId, paymentId, signature);
  const origin = url.origin;

  if (result.success) {
    return NextResponse.redirect(`${origin}/chat?payment=success&tier=${result.tier || 'PRO'}`, {
      status: 303,
    });
  } else {
    return NextResponse.redirect(`${origin}/pricing?payment=failed&reason=${encodeURIComponent(result.error || '')}`, {
      status: 303,
    });
  }
}
