import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ users: [] });
    }

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name || 'User',
        email: u.email,
        tier: u.tier,
        subscriptionStatus: u.subscriptionStatus || (u.tier !== 'FREE' ? 'active' : 'inactive'),
        subscriptionStartedAt: u.subscriptionStartedAt ? u.subscriptionStartedAt.toISOString() : null,
        subscriptionExpiresAt: u.subscriptionExpiresAt ? u.subscriptionExpiresAt.toISOString() : null,
        avatarUrl: u.avatarUrl || '',
        cooldownUntil: u.cooldownUntil ? u.cooldownUntil.toISOString() : null,
        messageCountToday: u.messageCountToday || 0,
        createdAt: u.createdAt.toISOString(),
        payments: u.payments || [],
      })),
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { targetUserId, action, tier, months = 1, reason = 'Local Admin Action' } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing targetUserId or action' }, { status: 400 });
    }

    const { applyAdminSubscription } = await import('@/lib/subscriptionService');
    const result = await applyAdminSubscription({
      targetUserId,
      action,
      tier,
      months: Number(months) || 1,
      reason,
      adminUserId: 'local-admin',
    });

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error: any) {
    console.error('Error modifying user subscription in local admin:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply subscription action' }, { status: 500 });
  }
}
