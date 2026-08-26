import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS } from '@/lib/plans';
import { fetchRazorpayOrderPayments, fetchRazorpayOrder } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = (url.searchParams.get('order_id') || url.searchParams.get('orderId') || '').trim();

  if (!orderId) {
    return NextResponse.json({ error: 'missing_order_id', message: 'Order ID is required' }, { status: 400 });
  }

  try {
    if (process.env.DATABASE_URL) {
      try {
        const { ensureDbTables } = await import('@/lib/ensureDbTables');
        await ensureDbTables();
      } catch (_) {}
    }

    // 1. Check if DB already recorded it as paid (e.g. via webhook or parallel verify)
    let dbPayment: any = null;
    if (process.env.DATABASE_URL && (prisma as any)?.payment) {
      try {
        dbPayment = await (prisma as any).payment.findUnique({
          where: { orderId },
        });
      } catch (_) {}
    }

    if (dbPayment?.status === 'paid') {
      const planId = (dbPayment.planId || 'pro').toLowerCase();
      const plan = PLANS[planId] || PLANS['pro'];
      return NextResponse.json({
        success: true,
        isPaid: true,
        status: 'paid',
        tier: dbPayment.tier || plan.tier,
        planName: plan.name,
      });
    }

    // 2. Poll Razorpay API for live payment status (catches UPI QR scans in real-time)
    const payments = await fetchRazorpayOrderPayments(orderId);
    const capturedPayment = payments.find(
      (p: any) => p.status === 'captured' || p.status === 'authorized'
    );

    let isOrderPaid = false;
    if (!capturedPayment) {
      const order = await fetchRazorpayOrder(orderId);
      if (order && order.status === 'paid') {
        isOrderPaid = true;
      }
    }

    if (capturedPayment || isOrderPaid) {
      const paymentId = capturedPayment?.id || null;
      const notes = capturedPayment?.notes || {};
      let userId = notes.userId || dbPayment?.userId || null;
      let planId = (notes.planId || dbPayment?.planId || 'pro').toLowerCase();
      const targetPlan = PLANS[planId] || PLANS['pro'];
      const targetTier = targetPlan.tier;

      if (process.env.DATABASE_URL) {
        if (userId && userId !== 'unknown') {
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
          console.log(`✅ [Polling Detection] Activated ${targetTier} plan for user ${userId} on order ${orderId}`);
        }

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
                amount: targetPlan.amountInPaise,
                currency: 'INR',
              },
            });
          } catch (payDbErr) {
            console.warn('⚠️ [Check Payment Status] Note on recording Payment row:', payDbErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        isPaid: true,
        status: 'paid',
        tier: targetTier,
        planName: targetPlan.name,
      });
    }

    // 3. Still pending/unpaid
    return NextResponse.json({
      success: true,
      isPaid: false,
      status: 'pending',
      message: 'Waiting for UPI QR payment completion',
    });
  } catch (error: any) {
    console.error(`❌ [Check Payment Status] Error checking order ${orderId}:`, error);
    return NextResponse.json({
      error: 'polling_error',
      message: error.message || 'Error checking payment status',
      isPaid: false,
    }, { status: 500 });
  }
}
