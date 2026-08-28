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
