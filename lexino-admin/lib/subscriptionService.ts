import { prisma } from './prisma';
import { getClerkServerClient } from './clerk';

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

  // 1. Fetch authentic Clerk user
  const clerk = getClerkServerClient();
  let clerkUser: any = null;
  try {
    clerkUser = await clerk.users.getUser(targetUserId);
  } catch (err: any) {
    throw new Error(`Clerk user lookup failed: ${err.message || 'User not found in Clerk directory'}`);
  }

  const primaryEmail =
    clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    '';

  // 2. Fetch existing DB user if database is online
  let dbUser: any = null;
  if (process.env.DATABASE_URL && prisma) {
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
    } catch (_) {}
  }

  const now = new Date();
  const oldPlan = dbUser?.tier || (clerkUser.publicMetadata?.tier as string) || 'FREE';
  const oldStatus = dbUser?.subscriptionStatus || (clerkUser.publicMetadata?.subscriptionStatus as string) || 'inactive';
  const oldExpiresAt = dbUser?.subscriptionExpiresAt || (clerkUser.publicMetadata?.subscriptionExpiresAt ? new Date(clerkUser.publicMetadata.subscriptionExpiresAt as string) : null);

  let newPlan = oldPlan;
  let newStatus = oldStatus;
  let newExpiresAt: Date | null = oldExpiresAt;
  let newStartedAt: Date | null = dbUser?.subscriptionStartedAt || now;

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

  // 3. Update or Upsert in PostgreSQL Database (if DATABASE_URL is present)
  if (process.env.DATABASE_URL && prisma) {
    try {
      await prisma.user.upsert({
        where: { id: targetUserId },
        update: {
          tier: newPlan,
          subscriptionStatus: newStatus,
          subscriptionStartedAt: newStatus === 'active' ? newStartedAt : null,
          subscriptionExpiresAt: newExpiresAt,
          cooldownUntil: null,
          messageCountToday: 0,
        },
        create: {
          id: targetUserId,
          email: primaryEmail || `${targetUserId}@lexinoai.in`,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
          tier: newPlan,
          subscriptionStatus: newStatus,
          subscriptionStartedAt: newStatus === 'active' ? newStartedAt : null,
          subscriptionExpiresAt: newExpiresAt,
        },
      });

      // Record Admin Audit Log (No fake payments created)
      if ((prisma as any)?.adminAuditLog) {
        await (prisma as any).adminAuditLog.create({
          data: {
            adminUserId,
            action: action.toUpperCase(),
            targetUserId,
            targetEmail: primaryEmail,
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
    } catch (dbErr: any) {
      console.warn('⚠️ [Admin Subscription] Note on Neon DB sync:', dbErr.message);
    }
  }

  // 4. Update in Clerk publicMetadata for instant cross-device JWT session propagation
  try {
    await clerk.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        tier: newPlan,
        subscriptionStatus: newStatus,
        subscriptionExpiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
      },
    });
  } catch (clerkErr: any) {
    console.warn('⚠️ [Admin Subscription] Clerk metadata update note:', clerkErr.message);
  }

  return {
    success: true,
    user: {
      id: targetUserId,
      email: primaryEmail,
      tier: newPlan,
      subscriptionStatus: newStatus,
      subscriptionStartedAt: newStartedAt ? newStartedAt.toISOString() : null,
      subscriptionExpiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
    },
  };
}
