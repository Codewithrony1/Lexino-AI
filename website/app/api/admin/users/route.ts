import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { logAdminAction } from '../../../../lib/adminSecurity';

export async function GET(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  try {
    const client = await clerkClient();
    let clerkUsers: any[] = [];
    let totalClerkCount = 0;

    // 1. Fetch Real Clerk Users
    if (search) {
      if (search.startsWith('user_')) {
        try {
          const singleUser = await client.users.getUser(search);
          if (singleUser) clerkUsers = [singleUser];
        } catch (_) {
          clerkUsers = [];
        }
      }

      if (clerkUsers.length === 0) {
        const listRes = await client.users.getUserList({
          query: search,
          limit,
          offset,
        });
        clerkUsers = (listRes as any).data || listRes;
      }
    } else {
      const listRes = await client.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at',
      });
      clerkUsers = (listRes as any).data || listRes;
    }

    try {
      totalClerkCount = await client.users.getCount();
    } catch (_) {
      totalClerkCount = clerkUsers.length;
    }

    const clerkIds = clerkUsers.map((u) => u.id);

    // 2. Query Neon PostgreSQL User and Audit records
    let dbUserMap = new Map<string, any>();
    let auditMap = new Map<string, any[]>();

    if (process.env.DATABASE_URL && clerkIds.length > 0) {
      try {
        const dbUsers = await prisma.user.findMany({
          where: { id: { in: clerkIds } },
          include: {
            payments: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
        dbUsers.forEach((u) => dbUserMap.set(u.id, u));

        if ((prisma as any)?.adminAuditLog) {
          const auditLogs = await (prisma as any).adminAuditLog.findMany({
            where: { targetUserId: { in: clerkIds } },
            orderBy: { createdAt: 'desc' },
            take: 30,
          });
          auditLogs.forEach((log: any) => {
            const list = auditMap.get(log.targetUserId) || [];
            list.push(log);
            auditMap.set(log.targetUserId, list);
          });
        }
      } catch (dbErr: any) {
        console.warn('⚠️ [Admin Users] Neon Database query warning:', dbErr.message);
      }
    }

    // 3. Join Clerk + Neon Data
    const combinedUsers = clerkUsers.map((cu) => {
      const dbUser = dbUserMap.get(cu.id);
      const userAudit = auditMap.get(cu.id) || [];
      const primaryEmail =
        cu.emailAddresses?.find((e: any) => e.id === cu.primaryEmailAddressId)?.emailAddress ||
        cu.emailAddresses?.[0]?.emailAddress ||
        'No email registered';

      const firstName = cu.firstName || '';
      const lastName = cu.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || dbUser?.name || 'Lexino User';

      const tier = dbUser?.tier || (cu.publicMetadata?.tier as string) || 'FREE';
      const subscriptionStatus =
        dbUser?.subscriptionStatus || (cu.publicMetadata?.subscriptionStatus as string) || (tier !== 'FREE' ? 'active' : 'inactive');
      const subscriptionExpiresAt = dbUser?.subscriptionExpiresAt
        ? dbUser.subscriptionExpiresAt.toISOString()
        : (cu.publicMetadata?.subscriptionExpiresAt as string) || null;
      const subscriptionStartedAt = dbUser?.subscriptionStartedAt
        ? dbUser.subscriptionStartedAt.toISOString()
        : null;

      const syncStatus = dbUser ? 'MATCHED' : 'NOT_SYNCED';

      return {
        id: cu.id,
        name: fullName,
        email: primaryEmail,
        avatarUrl: cu.imageUrl || dbUser?.avatarUrl || '',
        tier,
        subscriptionStatus,
        subscriptionStartedAt,
        subscriptionExpiresAt,
        cooldownUntil: dbUser?.cooldownUntil ? dbUser.cooldownUntil.toISOString() : null,
        messageCountToday: dbUser?.messageCountToday || 0,
        createdAt: cu.createdAt ? new Date(cu.createdAt).toISOString() : (dbUser?.createdAt ? dbUser.createdAt.toISOString() : new Date().toISOString()),
        syncStatus,
        payments: dbUser?.payments || [],
        auditLogs: userAudit,
      };
    });

    return NextResponse.json({
      success: true,
      users: combinedUsers,
      totalClerkUsers: totalClerkCount,
      page,
      limit,
      dbConnected: !!process.env.DATABASE_URL,
    });
  } catch (err: any) {
    console.error('❌ [Admin Users] fetch error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { targetUserId, action, tier, banDays, reason, months = 1 } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing targetUserId or action' }, { status: 400 });
    }

    const client = await clerkClient();

    // Ban / Unban actions
    if (action === 'banUser') {
      const banUntil = new Date(Date.now() + 3600000 * 24 * (Number(banDays) || 365));
      if (process.env.DATABASE_URL) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { cooldownUntil: banUntil },
        });
      }
      try {
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: { cooldownUntil: banUntil.toISOString() },
        });
      } catch (_) {}
      await logAdminAction(authCheck.userId!, 'BAN_USER', { targetUserId, banDays, banUntil: banUntil.toISOString() }, request);
      return NextResponse.json({ success: true });
    }

    if (action === 'unbanUser') {
      if (process.env.DATABASE_URL) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { cooldownUntil: null },
        });
      }
      try {
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: { cooldownUntil: null },
        });
      } catch (_) {}
      await logAdminAction(authCheck.userId!, 'UNBAN_USER', { targetUserId }, request);
      return NextResponse.json({ success: true });
    }

    // Central Subscription Action Resolution
    let centralAction: 'ACTIVATE' | 'EXTEND' | 'CHANGE_PLAN' | 'DEACTIVATE' = 'ACTIVATE';
    let targetTier: 'FREE' | 'STUDENT' | 'PRO' = 'STUDENT';

    if (action === 'activateStudent' || (action === 'setTier' && (tier || '').toUpperCase() === 'STUDENT')) {
      centralAction = 'ACTIVATE';
      targetTier = 'STUDENT';
    } else if (
      action === 'activateUnlimited' ||
      action === 'activatePro' ||
      (action === 'setTier' && ((tier || '').toUpperCase() === 'PRO' || (tier || '').toUpperCase() === 'UNLIMITED'))
    ) {
      centralAction = 'ACTIVATE';
      targetTier = 'PRO';
    } else if (action === 'extendSubscription') {
      centralAction = 'EXTEND';
      targetTier = (tier || 'STUDENT').toUpperCase() === 'PRO' ? 'PRO' : 'STUDENT';
    } else if (action === 'changePlan') {
      centralAction = 'CHANGE_PLAN';
      targetTier = (tier || 'STUDENT').toUpperCase() === 'PRO' || (tier || '').toUpperCase() === 'UNLIMITED' ? 'PRO' : 'STUDENT';
    } else if (action === 'deactivateSubscription' || (action === 'setTier' && (tier || '').toUpperCase() === 'FREE')) {
      centralAction = 'DEACTIVATE';
      targetTier = 'FREE';
    }

    const { applyCentralSubscription } = await import('../../../../lib/subscriptionService');
    const result = await applyCentralSubscription({
      userId: targetUserId,
      email: body.email || null,
      targetTier,
      action: centralAction,
      months: Number(months) || 1,
      source: 'admin',
      adminUserId: authCheck.userId || 'admin',
      reason: reason || `Admin manual ${action}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Subscription update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (err) {
    console.error('Admin user action error:', err);
    return NextResponse.json({ error: 'Action failed. Please verify userId is valid.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    // 1. Delete from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);

    // 2. Delete from DB if online
    if (process.env.DATABASE_URL) {
      await prisma.user.delete({
        where: { id: targetUserId },
      });
    }

    await logAdminAction(authCheck.userId!, 'DELETE_USER', { targetUserId }, request);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin user delete error:', err);
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 });
  }
}
