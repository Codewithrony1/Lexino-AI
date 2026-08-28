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
  const search = searchParams.get('search')?.toLowerCase() || '';

  try {
    let usersList: any[] = [];

    if (process.env.DATABASE_URL) {
      const dbUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      usersList = dbUsers.map((u) => ({
        id: u.id,
        name: u.name || 'User',
        email: u.email,
        tier: u.tier,
        subscriptionStatus: u.subscriptionStatus || (u.tier !== 'FREE' ? 'active' : 'inactive'),
        subscriptionExpiresAt: u.subscriptionExpiresAt ? u.subscriptionExpiresAt.toISOString() : null,
        avatarUrl: u.avatarUrl || '',
        cooldownUntil: u.cooldownUntil ? u.cooldownUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      }));
    } else {
      // Mock Users for Offline Local Development
      usersList = [
        { id: 'user_1', name: 'Aarav Mehta', email: 'aarav@example.com', tier: 'PRO', subscriptionStatus: 'active', subscriptionExpiresAt: null, avatarUrl: '', cooldownUntil: null, createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString() },
        { id: 'user_2', name: 'Rohan Sharma', email: 'rohan@example.com', tier: 'STUDENT', subscriptionStatus: 'active', subscriptionExpiresAt: null, avatarUrl: '', cooldownUntil: null, createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString() },
        { id: 'user_3', name: 'Kavya Nair', email: 'kavya@example.com', tier: 'FREE', subscriptionStatus: 'inactive', subscriptionExpiresAt: null, avatarUrl: '', cooldownUntil: new Date(Date.now() + 3600000 * 24 * 365).toISOString(), createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString() }, // Banned
        { id: 'user_4', name: 'Neha Gupta', email: 'neha@example.com', tier: 'FREE', subscriptionStatus: 'inactive', subscriptionExpiresAt: null, avatarUrl: '', cooldownUntil: null, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
        { id: 'user_5', name: 'Kabir Singh', email: 'kabir@example.com', tier: 'PRO', subscriptionStatus: 'active', subscriptionExpiresAt: null, avatarUrl: '', cooldownUntil: null, createdAt: new Date(Date.now() - 3600000 * 48).toISOString() },
      ];
    }

    if (search) {
      usersList = usersList.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ users: usersList });
  } catch (err) {
    console.error('Admin users fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    let targetUser: any = null;
    if (process.env.DATABASE_URL) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    }

    const client = await clerkClient();
    const now = new Date();
    const oldPlan = targetUser?.tier || 'FREE';
    const oldStatus = targetUser?.subscriptionStatus || 'inactive';
    const oldExpiresAt = targetUser?.subscriptionExpiresAt || null;

    let newPlan = oldPlan;
    let newStatus = oldStatus;
    let newExpiresAt = oldExpiresAt;
    let newStartedAt = targetUser?.subscriptionStartedAt || now;

    if (action === 'activateStudent' || (action === 'setTier' && (tier || '').toUpperCase() === 'STUDENT')) {
      newPlan = 'STUDENT';
      newStatus = 'active';
      newStartedAt = now;
      newExpiresAt = new Date(now.getTime() + (Number(months) || 1) * 30 * 24 * 60 * 60 * 1000);
    } else if (
      action === 'activateUnlimited' ||
      action === 'activatePro' ||
      (action === 'setTier' && ((tier || '').toUpperCase() === 'PRO' || (tier || '').toUpperCase() === 'UNLIMITED'))
    ) {
      newPlan = 'PRO';
      newStatus = 'active';
      newStartedAt = now;
      newExpiresAt = new Date(now.getTime() + (Number(months) || 1) * 30 * 24 * 60 * 60 * 1000);
    } else if (action === 'extendSubscription') {
      const activeExpiry = oldExpiresAt && new Date(oldExpiresAt) > now ? new Date(oldExpiresAt) : now;
      newExpiresAt = new Date(activeExpiry.getTime() + (Number(months) || 1) * 30 * 24 * 60 * 60 * 1000);
      newStatus = 'active';
      if (newPlan === 'FREE') newPlan = 'STUDENT';
    } else if (action === 'changePlan') {
      const targetTier = (tier || 'STUDENT').toUpperCase();
      newPlan = targetTier === 'PRO' || targetTier === 'UNLIMITED' ? 'PRO' : 'STUDENT';
      newStatus = 'active';
      if (!newExpiresAt || new Date(newExpiresAt) <= now) {
        newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    } else if (action === 'deactivateSubscription' || (action === 'setTier' && (tier || '').toUpperCase() === 'FREE')) {
      newPlan = 'FREE';
      newStatus = 'inactive';
      newExpiresAt = null;
    }

    // 1. Sync in Database
    if (process.env.DATABASE_URL) {
      if (action.includes('banUser') || action === 'banUser') {
        const banUntil = new Date(Date.now() + 3600000 * 24 * (Number(banDays) || 365));
        await prisma.user.update({
          where: { id: targetUserId },
          data: { cooldownUntil: banUntil },
        });
      } else if (action === 'unbanUser') {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { cooldownUntil: null },
        });
      } else {
        await prisma.user.update({
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
      }
    }

    // 2. Sync in Clerk publicMetadata for fast JWT validation
    try {
      if (action === 'banUser') {
        const banUntil = new Date(Date.now() + 3600000 * 24 * (Number(banDays) || 365));
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: { cooldownUntil: banUntil.toISOString() },
        });
      } else if (action === 'unbanUser') {
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: { cooldownUntil: null },
        });
      } else {
        await client.users.updateUserMetadata(targetUserId, {
          publicMetadata: {
            tier: newPlan,
            subscriptionStatus: newStatus,
            subscriptionExpiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
          },
        });
      }
    } catch (clerkMetaErr) {
      console.warn('⚠️ [Admin Action] Note on updating Clerk metadata:', clerkMetaErr);
    }

    // 3. Log into AdminAuditLog in Neon DB and file
    await logAdminAction(
      authCheck.userId!,
      action.toUpperCase(),
      {
        targetUserId,
        targetEmail: targetUser?.email,
        oldPlan,
        newPlan,
        oldStatus,
        newStatus,
        oldExpiresAt,
        newExpiresAt,
        reason: reason || `Admin manual ${action}`,
      },
      request
    );

    return NextResponse.json({
      success: true,
      user: {
        id: targetUserId,
        tier: newPlan,
        subscriptionStatus: newStatus,
        subscriptionExpiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
      },
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
