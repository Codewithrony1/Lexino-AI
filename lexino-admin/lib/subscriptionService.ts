import { prisma } from './prisma';

export type SubscriptionTier = 'FREE' | 'STUDENT' | 'PRO';

export function calculateSubscriptionExpiry(
  existingExpiresAt: Date | string | null | undefined,
  targetTier: SubscriptionTier,
  currentTier?: string | null,
  months: number = 1
): { startedAt: Date; expiresAt: Date } {
  const now = new Date();
  const durationMs = months * 30 * 24 * 60 * 60 * 1000;
  const existingDate = existingExpiresAt ? new Date(existingExpiresAt) : null;
  const isSameTierActive =
    existingDate &&
    !isNaN(existingDate.getTime()) &&
    existingDate.getTime() > now.getTime() &&
    (currentTier || '').toUpperCase() === targetTier.toUpperCase();

  let expiresAt: Date;
  if (isSameTierActive && existingDate) {
    expiresAt = new Date(existingDate.getTime() + durationMs);
  } else {
    expiresAt = new Date(now.getTime() + durationMs);
  }

  return {
    startedAt: now,
    expiresAt,
  };
}

export interface CentralSubscriptionParams {
  targetUserId: string;
  action: 'activateStudent' | 'activateUnlimited' | 'activatePro' | 'extendSubscription' | 'changePlan' | 'deactivateSubscription';
  tier?: string;
  months?: number;
  reason?: string;
  adminUserId?: string;
}

export async function applyAdminSubscription(params: CentralSubscriptionParams) {
  const { targetUserId, action, tier, months = 1, reason = 'Local Admin Action', adminUserId = 'local-admin' } = params;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error('User not found in database');
  }

  const now = new Date();
  const oldPlan = targetUser.tier;
  const oldStatus = targetUser.subscriptionStatus || 'inactive';
  const oldExpiresAt = targetUser.subscriptionExpiresAt;

  let newPlan = oldPlan;
  let newStatus = oldStatus;
  let newExpiresAt: Date | null = oldExpiresAt;
  let newStartedAt: Date | null = targetUser.subscriptionStartedAt || now;

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
    newStartedAt = null;
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

  // 2. Record Admin Audit Log (No fake payments created)
  if ((prisma as any)?.adminAuditLog) {
    await (prisma as any).adminAuditLog.create({
      data: {
        adminUserId,
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

  return {
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      tier: updatedUser.tier,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionStartedAt: updatedUser.subscriptionStartedAt ? updatedUser.subscriptionStartedAt.toISOString() : null,
      subscriptionExpiresAt: updatedUser.subscriptionExpiresAt ? updatedUser.subscriptionExpiresAt.toISOString() : null,
    },
  };
}
