import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { evaluateSubscription } from '@/lib/subscription';
import { PLANS } from '@/lib/plans';
import { ensureDbTables } from '@/lib/ensureDbTables';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let authUserId: string | null = null;
    try {
      const authResult = await auth();
      authUserId = authResult?.userId || null;
    } catch (_) {}

    if (!authUserId) {
      return NextResponse.json({
        authenticated: false,
        isFree: true,
        tier: 'FREE',
        plan: 'explorer',
        planName: 'Explorer (Free Tier)',
        status: 'inactive',
        message: 'No active session. User is on Explorer Free tier.',
      });
    }

    if (process.env.DATABASE_URL) {
      try {
        await ensureDbTables();
      } catch (_) {}
    }

    let userEmail: string = '';
    let userName: string = '';
    let avatarUrl: string = '';

    try {
      const curUser = await currentUser();
      if (curUser) {
        userEmail = (curUser.emailAddresses[0]?.emailAddress || '').toLowerCase().trim();
        userName = `${curUser.firstName || ''} ${curUser.lastName || ''}`.trim() || curUser.username || 'User';
        avatarUrl = curUser.imageUrl || '';
      }
    } catch (_) {}

    let dbUser: any = null;

    if (process.env.DATABASE_URL) {
      try {
        dbUser = await prisma.user.findUnique({
          where: { id: authUserId },
          include: {
            payments: {
              where: { status: 'paid' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        // If user not found by ID, look up by verified email
        if (!dbUser && userEmail) {
          dbUser = await prisma.user.findUnique({
            where: { email: userEmail },
            include: {
              payments: {
                where: { status: 'paid' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [Subscription Status API] Database lookup warning:', dbErr);
      }
    }

    // Evaluate subscription with automatic expiry enforcement
    const subInfo = evaluateSubscription(dbUser);
    const activeTier = subInfo.tier;
    const isExpired = subInfo.isExpired;
    const status = subInfo.status; // 'active' | 'expired' | 'inactive'

    // Auto-expire in database if past expiration date
    if (isExpired && dbUser && dbUser.tier !== 'FREE' && process.env.DATABASE_URL) {
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            tier: 'FREE',
            subscriptionStatus: 'expired',
          },
        });
      } catch (updateErr) {
        console.warn('⚠️ [Subscription Status API] Auto-expiry sync note:', updateErr);
      }
    }

    const latestPayment = dbUser?.payments?.[0] || null;
    const planKey = activeTier === 'PRO' ? 'pro' : (activeTier === 'STUDENT' ? 'student' : 'explorer');
    const planDetails = PLANS[planKey] || PLANS['explorer'];

    const dailyLimit = activeTier === 'PRO' ? 1500 : (activeTier === 'STUDENT' ? 300 : 50);
    const queriesUsedToday = dbUser?.messageCountToday || 0;
    const queriesRemainingToday = Math.max(0, dailyLimit - queriesUsedToday);

    return NextResponse.json({
      authenticated: true,
      userId: authUserId,
      email: userEmail || dbUser?.email || '',
      name: userName || dbUser?.name || 'User',
      avatarUrl: avatarUrl || dbUser?.avatarUrl || '',
      isFree: activeTier === 'FREE',
      tier: activeTier,
      plan: planKey,
      planName: planDetails.name,
      status, // 'active' | 'expired' | 'inactive'
      isActive: subInfo.isActive,
      isExpired: subInfo.isExpired,
      startedOn: subInfo.startedAt ? subInfo.startedAt.toISOString() : null,
      currentPeriodEnd: subInfo.expiresAt ? subInfo.expiresAt.toISOString() : null,
      daysRemaining: subInfo.daysRemaining,
      autoRenew: false,
      lastPaymentId: latestPayment?.paymentId || null,
      lastOrderId: latestPayment?.orderId || null,
      amountPaid: latestPayment?.amount || 0,
      dailyQueryLimit: dailyLimit,
      queriesUsedToday,
      queriesRemainingToday,
      features: planDetails.features,
    });
  } catch (error: any) {
    console.error('❌ [Subscription Status API] Error:', error);
    return NextResponse.json(
      { error: 'failed_to_fetch_status', message: error.message || 'Could not retrieve subscription status' },
      { status: 500 }
    );
  }
}
