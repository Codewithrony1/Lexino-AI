import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { verifyWebhookSignature } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('⚡ [Razorpay Webhook] Received webhook POST event at', new Date().toISOString());

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      console.error('❌ [Razorpay Webhook] Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('❌ [Razorpay Webhook] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`🔔 [Razorpay Webhook] Verified event: ${eventType} (ID: ${event.id || 'n/a'})`);

    if (
      eventType === 'payment.captured' ||
      eventType === 'order.paid' ||
      eventType === 'subscription.activated' ||
      eventType === 'subscription.charged'
    ) {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderEntity = event.payload?.order?.entity || {};
      const subscriptionEntity = event.payload?.subscription?.entity || {};
      
      const orderId = paymentEntity.order_id || orderEntity.id || subscriptionEntity.id;
      const paymentId = paymentEntity.id || `subpay_${Date.now()}`;

      const notes = {
        ...(orderEntity.notes || {}),
        ...(paymentEntity.notes || {}),
        ...(subscriptionEntity.notes || {}),
      };

      let userId = notes.userId || notes.user_id;
      let planId = (notes.planId || notes.plan_id || '').toLowerCase();

      console.log('🔍 [Razorpay Webhook] Event details:', {
        eventType,
        orderId,
        paymentId,
        notesUserId: userId,
        notesPlanId: planId,
      });

      if (process.env.DATABASE_URL && orderId) {
        try {
          const { ensureDbTables } = await import('@/lib/ensureDbTables');
          await ensureDbTables();
        } catch (_) {}

        try {
          // Look up existing order in DB to recover userId or planId if missing from webhook notes
          let existingPayment: any = null;
          if ((prisma as any)?.payment) {
            try {
              existingPayment = await (prisma as any).payment.findUnique({
                where: { orderId },
              });
            } catch (_) {}
          }

          // Idempotency: Skip duplicate webhook processing if this payment was already recorded as paid
          if (existingPayment?.status === 'paid' && existingPayment?.paymentId === paymentId) {
            console.log(`ℹ️ [Razorpay Webhook] Order ${orderId} already processed (idempotent duplicate event). Returning 200 OK.`);
            return NextResponse.json({ status: 'ok', duplicate: true });
          }

          if (!userId && existingPayment?.userId) {
            userId = existingPayment.userId;
            console.log(`ℹ️ [Razorpay Webhook] Recovered userId (${userId}) from database record`);
          }

          if (!planId && existingPayment?.planId) {
            planId = existingPayment.planId;
          }

          const targetPlan = PLANS[planId] || PLANS['pro'];
          const targetTier = targetPlan.tier;

          const { activateSubscriptionForUser } = await import('@/lib/userAccount');
          await activateSubscriptionForUser({
            userId,
            email: notes.email || notes.userEmail || null,
            targetTier,
            planId: targetPlan.id,
            orderId,
            paymentId,
            amount: paymentEntity.amount || targetPlan.amountInPaise,
          });
          console.log(`✅ [Razorpay Webhook] Activated ${targetPlan.name} for user ${userId || 'unknown'} via ${eventType}`);
        } catch (dbErr) {
          console.error('❌ [Razorpay Webhook] Database update failed:', dbErr);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      if (process.env.DATABASE_URL && orderId) {
        try {
          if ((prisma as any)?.payment) {
            await (prisma as any).payment.updateMany({
              where: { orderId },
              data: { status: 'failed' },
            });
            console.log(`ℹ️ [Razorpay Webhook] Marked order ${orderId} as failed`);
          }
        } catch (dbErr) {
          console.error('❌ [Razorpay Webhook] Failed to record payment failure:', dbErr);
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true, processed: true });
  } catch (error: any) {
    console.error('❌ [Razorpay Webhook] Internal handler error:', error);
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 });
  }
}
