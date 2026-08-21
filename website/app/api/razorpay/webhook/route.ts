import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { PLANS } from '../../../../lib/plans';
import { verifyWebhookSignature } from '../../../../lib/razorpay';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid Razorpay Webhook signature received.');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`Received verified Razorpay webhook event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes || {};
      const userId = notes.userId;
      const planId = (notes.planId || 'pro').toLowerCase();
      const targetPlan = PLANS[planId] || PLANS['pro'];

      if (process.env.DATABASE_URL && orderId) {
        try {
          if (userId) {
            await prisma.user.upsert({
              where: { id: userId },
              update: {
                tier: targetPlan.tier,
                cooldownUntil: null,
                messageCountToday: 0,
              },
              create: {
                id: userId,
                email: `${userId}@placeholder.clerk.accounts`,
                name: 'User',
                tier: targetPlan.tier,
              },
            });
          }

          if ((prisma as any).payment) {
            await (prisma as any).payment.upsert({
              where: { orderId },
              update: {
                paymentId: paymentId || undefined,
                status: 'paid',
                tier: targetPlan.tier,
                planId: targetPlan.id,
              },
              create: {
                userId: userId || 'unknown',
                orderId,
                paymentId,
                status: 'paid',
                tier: targetPlan.tier,
                planId: targetPlan.id,
                amount: paymentEntity.amount || targetPlan.amountInPaise,
                currency: paymentEntity.currency || 'INR',
              },
            });
          }
          console.log(`Webhook successfully processed ${eventType} for order ${orderId}`);
        } catch (dbErr) {
          console.error('Database update failed in webhook handler:', dbErr);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      if (process.env.DATABASE_URL && orderId) {
        try {
          if ((prisma as any).payment) {
            await (prisma as any).payment.updateMany({
              where: { orderId },
              data: { status: 'failed' },
            });
          }
        } catch (dbErr) {
          console.error('Failed to record payment failure in webhook:', dbErr);
        }
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('Error handling Razorpay webhook:', error);
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 });
  }
}
