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
      users: users.map((u: any) => ({
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
    const { targetUserId, action, tier, months = 1, reason = 'Admin Action' } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing targetUserId or action' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const now = new Date();
    const oldPlan = targetUser.tier;
    const oldStatus = targetUser.subscriptionStatus || 'inactive';
    const oldExpiresAt = targetUser.subscriptionExpiresAt;

    let newPlan = oldPlan;
    let newStatus = oldStatus;
    let newExpiresAt = oldExpiresAt;
    let newStartedAt = targetUser.subscriptionStartedAt || now;

    if (action === 'activateStudent') {
      newPlan = 'STUDENT';
      newStatus = 'active';
      newStartedAt = now;
      newExpiresAt = new Date(now.getTime() + Number(months) * 30 * 24 * 60 * 60 * 1000);
    } else if (action === 'activateUnlimited' || action === 'activatePro') {
      newPlan = 'PRO';
      newStatus = 'active';
      newStartedAt = now;
      newExpiresAt = new Date(now.getTime() + Number(months) * 30 * 24 * 60 * 60 * 1000);
    } else if (action === 'extendSubscription') {
      const activeExpiry = oldExpiresAt && new Date(oldExpiresAt) > now ? new Date(oldExpiresAt) : now;
      newExpiresAt = new Date(activeExpiry.getTime() + Number(months) * 30 * 24 * 60 * 60 * 1000);
      newStatus = 'active';
      if (newPlan === 'FREE') newPlan = 'STUDENT';
    } else if (action === 'changePlan') {
      const targetTier = (tier || 'STUDENT').toUpperCase();
      newPlan = targetTier === 'PRO' || targetTier === 'UNLIMITED' ? 'PRO' : 'STUDENT';
      newStatus = 'active';
      if (!newExpiresAt || new Date(newExpiresAt) <= now) {
        newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else if (action === 'deactivateSubscription') {
      newPlan = 'FREE';
      newStatus = 'inactive';
      newExpiresAt = null;
    }

    // 1. Update in Database
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        tier: newPlan,
        subscriptionStatus: newStatus,
        subscriptionStartedAt: newStatus === 'active' ? newStartedAt : null,
        subscriptionExpiresAt: newExpiresAt,
        cooldownUntil: null,
        messageCountToday: 0,
      },
    });

    // 2. Record Admin Audit Log
    if ((prisma as any)?.adminAuditLog) {
      await (prisma as any).adminAuditLog.create({
        data: {
          adminUserId: 'local-admin',
          action: action.toUpperCase(),
          targetUserId,
          targetEmail: targetUser.email,
          oldPlan,
          newPlan,
          oldStatus,
          newStatus,
          oldExpiresAt,
          newExpiresAt,
          reason,
          ipAddress: '127.0.0.1',
          userAgent: 'Lexino Standalone Local Admin',
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        tier: updatedUser.tier,
        subscriptionStatus: updatedUser.subscriptionStatus,
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt ? updatedUser.subscriptionExpiresAt.toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error('Error modifying user subscription in local admin:', error);
    return NextResponse.json({ error: 'Failed to apply subscription action' }, { status: 500 });
  }
}
