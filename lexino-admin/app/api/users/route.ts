import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClerkServerClient } from '@/lib/clerk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    let clerkUsers: any[] = [];
    let totalClerkCount = 0;

    // 1. Fetch Real Users from Clerk Server-side API
    try {
      const clerk = getClerkServerClient();
      
      if (search) {
        if (search.startsWith('user_')) {
          // Direct Clerk ID lookup
          try {
            const singleUser = await clerk.users.getUser(search);
            if (singleUser) clerkUsers = [singleUser];
          } catch (_) {
            clerkUsers = [];
          }
        }
        
        if (clerkUsers.length === 0) {
          // Query by email, name, username
          const listRes = await clerk.users.getUserList({
            query: search,
            limit,
            offset,
          });
          clerkUsers = (listRes as any).data || listRes;
        }
      } else {
        // Empty Search -> Fetch first page of all real users
        const listRes = await clerk.users.getUserList({
          limit,
          offset,
          orderBy: '-created_at',
        });
        clerkUsers = (listRes as any).data || listRes;
      }

      try {
        totalClerkCount = await clerk.users.getCount();
      } catch (_) {
        totalClerkCount = clerkUsers.length;
      }
    } catch (clerkErr: any) {
      console.error('❌ [Admin Users] Clerk API fetch failure:', clerkErr);
      return NextResponse.json(
        { error: `Clerk Connection Error: ${clerkErr.message || 'Failed to communicate with Clerk'}` },
        { status: 500 }
      );
    }

    const clerkIds = clerkUsers.map((u) => u.id);

    // 2. Query Neon PostgreSQL User, Payment & Audit records for these Clerk IDs
    let dbUserMap = new Map<string, any>();
    let auditMap = new Map<string, any[]>();

    if (process.env.DATABASE_URL && prisma && clerkIds.length > 0) {
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

    // 3. Join Clerk Identity with Neon Subscription Data
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

    // 4. Handle Edge Case: If searching and zero Clerk users found, check if query matches an orphaned Neon user
    if (search && combinedUsers.length === 0 && process.env.DATABASE_URL && prisma) {
      try {
        const orphanDbUsers = await prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { id: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
          include: { payments: { take: 5, orderBy: { createdAt: 'desc' } } },
        });

        orphanDbUsers.forEach((ou) => {
          combinedUsers.push({
            id: ou.id,
            name: ou.name || 'User',
            email: ou.email,
            avatarUrl: ou.avatarUrl || '',
            tier: ou.tier,
            subscriptionStatus: ou.subscriptionStatus || 'inactive',
            subscriptionStartedAt: ou.subscriptionStartedAt ? ou.subscriptionStartedAt.toISOString() : null,
            subscriptionExpiresAt: ou.subscriptionExpiresAt ? ou.subscriptionExpiresAt.toISOString() : null,
            cooldownUntil: ou.cooldownUntil ? ou.cooldownUntil.toISOString() : null,
            messageCountToday: ou.messageCountToday || 0,
            createdAt: ou.createdAt.toISOString(),
            syncStatus: 'ORPHANED',
            payments: ou.payments || [],
            auditLogs: [],
          });
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      users: combinedUsers,
      totalClerkUsers: totalClerkCount,
      page,
      limit,
      dbConnected: !!process.env.DATABASE_URL,
    });
  } catch (error: any) {
    console.error('❌ [Admin Users] Unhandled GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error while searching users' },
      { status: 500 }
    );
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

    // Also update Clerk publicMetadata so the user's active session receives the change immediately
    try {
      const clerk = getClerkServerClient();
      await clerk.users.updateUserMetadata(targetUserId, {
        publicMetadata: {
          tier: result.user.tier,
          subscriptionStatus: result.user.subscriptionStatus,
          subscriptionExpiresAt: result.user.subscriptionExpiresAt,
        },
      });
    } catch (clerkSyncErr: any) {
      console.warn('⚠️ [Admin Action] Note on Clerk metadata update:', clerkSyncErr.message);
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error: any) {
    console.error('❌ [Admin Users] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to apply subscription action' }, { status: 500 });
  }
}
