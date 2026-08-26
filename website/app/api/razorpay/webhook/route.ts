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

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderEntity = event.payload?.order?.entity || {};
      const orderId = paymentEntity.order_id || orderEntity.id;
      const paymentId = paymentEntity.id;

      const notes = {
        ...(orderEntity.notes || {}),
        ...(paymentEntity.notes || {}),
      };

      let userId = notes.userId;
      let planId = (notes.planId || '').toLowerCase();

      console.log('🔍 [Razorpay Webhook] Event details:', {
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

          if (!userId && existingPayment?.userId) {
            userId = existingPayment.userId;
            console.log(`ℹ️ [Razorpay Webhook] Recovered userId (${userId}) from database record`);
          }

          if (!planId && existingPayment?.planId) {
            planId = existingPayment.planId;
          }

          const targetPlan = PLANS[planId] || PLANS['pro'];
          const targetTier = targetPlan.tier;

          // 1. Upgrade User tier in PostgreSQL
          if (userId && userId !== 'unknown') {
            try {
              await prisma.user.upsert({
                where: { id: userId },
                update: {
                  tier: targetTier,
                  cooldownUntil: null,
                  messageCountToday: 0,
                },
                create: {
                  id: userId,
                  email: `${userId}@placeholder.clerk.accounts`,
                  name: 'User',
                  tier: targetTier,
                },
              });
              console.log(`✅ [Razorpay Webhook] Successfully upgraded user ${userId} to ${targetTier} tier`);
            } catch (userDbErr) {
              console.error('❌ [Razorpay Webhook] Failed to update User table in DB:', userDbErr);
            }
          } else {
            console.warn(`⚠️ [Razorpay Webhook] Payment captured for order ${orderId} but no userId could be identified.`);
          }

          // 2. Record Payment record in PostgreSQL
          if ((prisma as any)?.payment) {
            try {
              await (prisma as any).payment.upsert({
                where: { orderId },
                update: {
                  paymentId: paymentId || undefined,
                  status: 'paid',
                  tier: targetTier,
                  planId: targetPlan.id,
                },
                create: {
                  userId: userId || 'unknown',
                  orderId,
                  paymentId,
                  status: 'paid',
                  tier: targetTier,
                  planId: targetPlan.id,
                  amount: paymentEntity.amount || targetPlan.amountInPaise,
                  currency: paymentEntity.currency || 'INR',
                },
              });
            } catch (payDbErr) {
              console.warn('⚠️ [Razorpay Webhook] Note on recording Payment row:', payDbErr);
            }
          }
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

