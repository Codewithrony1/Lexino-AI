import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
    const avatarUrl = user.imageUrl;

    let dbUser: any = null;
    let effectiveSub: any = { tier: 'FREE', isActive: false, isExpired: false, status: 'inactive' };

    if (process.env.DATABASE_URL) {
      try {
        const { ensureDbTables } = await import('@/lib/ensureDbTables');
        await ensureDbTables();
      } catch (_) {}

      dbUser = await prisma.user.upsert({
        where: { id: userId },
        update: {
          email,
          name,
          avatarUrl,
        },
        create: {
          id: userId,
          email,
          name,
          avatarUrl,
        },
      });

      if (dbUser) {
        const { evaluateSubscription } = await import('@/lib/subscription');
        effectiveSub = evaluateSubscription(dbUser);

        if (effectiveSub.isExpired && dbUser.tier !== 'FREE') {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: {
                tier: 'FREE',
                subscriptionStatus: 'expired',
              },
            });
            dbUser.tier = 'FREE';
            dbUser.subscriptionStatus = 'expired';
          } catch (_) {}
        }
      }
    } else {
      console.warn('DATABASE_URL is not set. Running in database-offline mode.');
      dbUser = {
        id: userId,
        email,
        name,
        avatarUrl,
        tier: 'FREE',
        subscriptionStatus: 'inactive',
        cooldownUntil: null,
        messageCountToday: 0,
        lastMessageAt: null,
      };
    }

    const userTier = effectiveSub.tier;
    const quotaLimit = userTier === 'PRO' ? 1500 : (userTier === 'STUDENT' ? 300 : 50);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        avatarUrl,
        tier: userTier,
        subscriptionStatus: effectiveSub.status,
        subscriptionExpiresAt: effectiveSub.expiresAt ? effectiveSub.expiresAt.toISOString() : null,
        preferences: dbUser?.preferences || {},
        limit: quotaLimit,
        messageCountToday: dbUser?.messageCountToday || 0,
        cooldownUntil: dbUser?.cooldownUntil ? dbUser.cooldownUntil.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Failed to sync user database-side' }, { status: 500 });
  }
}
