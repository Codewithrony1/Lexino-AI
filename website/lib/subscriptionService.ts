import { prisma } from './prisma';
import { ensureDbTables } from './ensureDbTables';
import { calculateSubscriptionExpiry, evaluateSubscription, SubscriptionTier } from './subscription';
import { logAdminAction } from './adminSecurity';
import { clerkClient } from '@clerk/nextjs/server';

export type SubscriptionSource = 'razorpay' | 'admin' | 'system';

export interface ApplySubscriptionParams {
  userId?: string | null;
  email?: string | null;
  targetTier: 'FREE' | 'STUDENT' | 'PRO';
  action?: 'ACTIVATE' | 'EXTEND' | 'CHANGE_PLAN' | 'DEACTIVATE';
  months?: number;
  source: SubscriptionSource;
  adminUserId?: string;
  reason?: string;
  // Razorpay-specific financial metadata
  orderId?: string;
  paymentId?: string | null;
  signature?: string | null;
  amount?: number;
  planId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CentralSubscriptionResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    tier: string;
    subscriptionStatus: string;
    subscriptionStartedAt: string | null;
    subscriptionExpiresAt: string | null;
  } | null;
  expiryInfo: {
    startedAt: Date;
    expiresAt: Date | null;
  };
  error?: string;
}

/**
 * ============================================================================
 * CENTRAL SUBSCRIPTION SERVICE (Single Authoritative Source of Truth)
 * ============================================================================
 * Both User Razorpay payments and Admin manual grants converge here.
 * - Same validation
 * - Same 1-month calendar expiry & renewal stacking rules
 * - Same PostgreSQL User table updates
 * - Genuine Payment records for Razorpay (no fake payments for Admin)
 * - Structured AdminAuditLog records for Admin actions
 * - Instant cross-device synchronization
 */
export async function applyCentralSubscription(params: ApplySubscriptionParams): Promise<CentralSubscriptionResult> {
  const {
    userId,
    email,
    targetTier,
    action = 'ACTIVATE',
    months = 1,
    source,
    adminUserId = 'admin',
    reason = source === 'admin' ? 'Manual Admin Action' : 'Razorpay Purchase',
    orderId,
    paymentId,
    signature,
    amount,
    planId = targetTier === 'PRO' ? 'pro' : (targetTier === 'STUDENT' ? 'student' : 'explorer'),
    ipAddress = '127.0.0.1',
    userAgent = 'Lexino Central Subscription Engine',
  } = params;

  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!process.env.DATABASE_URL) {
    const fakeExpiry = calculateSubscriptionExpiry(null, targetTier === 'FREE' ? 'STUDENT' : targetTier);
    return {
      success: true,
      user: null,
      expiryInfo: {
        startedAt: fakeExpiry.startedAt,
        expiresAt: targetTier === 'FREE' ? null : fakeExpiry.expiresAt,
      },
    };
  }

  try {
    await ensureDbTables();

    // 1. Locate existing User by userId or verified email
    let user: any = null;
    if (userId && userId !== 'unknown') {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && normalizedEmail) {
      user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    }

    const now = new Date();
    const oldPlan = user?.tier || 'FREE';
    const oldStatus = user?.subscriptionStatus || 'inactive';
    const oldExpiresAt = user?.subscriptionExpiresAt || null;

    let newPlan = targetTier;
    let newStatus = targetTier === 'FREE' ? 'inactive' : 'active';
    let newStartedAt: Date | null = now;
    let newExpiresAt: Date | null = null;

    if (action === 'DEACTIVATE' || targetTier === 'FREE') {
      newPlan = 'FREE';
      newStatus = 'inactive';
      newStartedAt = null;
      newExpiresAt = null;
    } else if (action === 'EXTEND') {
      const activeExpiry = oldExpiresAt && new Date(oldExpiresAt) > now ? new Date(oldExpiresAt) : now;
      newExpiresAt = new Date(activeExpiry.getTime() + (Number(months) || 1) * 30 * 24 * 60 * 60 * 1000);
      newStatus = 'active';
      newPlan = oldPlan === 'FREE' ? 'STUDENT' : (oldPlan as any);
      newStartedAt = user?.subscriptionStartedAt || now;
    } else {
      // ACTIVATE or CHANGE_PLAN
      const expiryCalc = calculateSubscriptionExpiry(
        oldExpiresAt,
        targetTier,
        oldPlan
      );
      newStartedAt = expiryCalc.startedAt;
      newExpiresAt = expiryCalc.expiresAt;
      newStatus = 'active';
    }

    // 2. Persist to PostgreSQL User Table
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          tier: newPlan,
          subscriptionStatus: newStatus,
          subscriptionStartedAt: newStartedAt,
          subscriptionExpiresAt: newExpiresAt,
          cooldownUntil: null,
          messageCountToday: 0,
        },
      });
      console.log(`✅ [Central Subscription] Updated ${user.id} (${user.email}) to ${newPlan} [${newStatus}] until ${newExpiresAt?.toISOString() || 'never'} via ${source}`);
    } else if (userId && userId !== 'unknown') {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: normalizedEmail || `${userId}@lexinoai.in`,
          name: 'User',
          tier: newPlan,
          subscriptionStatus: newStatus,
          subscriptionStartedAt: newStartedAt,
          subscriptionExpiresAt: newExpiresAt,
        },
      });
      console.log(`✅ [Central Subscription] Created new user ${userId} with ${newPlan} [${newStatus}] via ${source}`);
    }

    const resolvedUserId = user?.id || userId || 'unknown';
    const resolvedEmail = user?.email || normalizedEmail || '';

    // 3. Handle Financial Record vs. Audit Log
    if (source === 'razorpay' && orderId) {
      // Genuine User Purchase: Store in Payment table
      if ((prisma as any)?.payment) {
        try {
          await (prisma as any).payment.upsert({
            where: { orderId },
            update: {
              paymentId: paymentId || undefined,
              signature: signature || undefined,
              status: 'paid',
              tier: newPlan,
              planId,
              expiresAt: newExpiresAt,
              userId: resolvedUserId,
            },
            create: {
              userId: resolvedUserId,
              orderId,
              paymentId: paymentId || undefined,
              signature: signature || undefined,
              status: 'paid',
              tier: newPlan,
              planId,
              amount: amount || (newPlan === 'PRO' ? 29900 : 4900),
              currency: 'INR',
              expiresAt: newExpiresAt,
            },
          });
        } catch (payErr) {
          console.warn('⚠️ [Central Subscription] Payment upsert note:', payErr);
        }
      }
    } else if (source === 'admin') {
      // Admin Manual Grant: Create AdminAuditLog (No fake Razorpay payments)
      await logAdminAction(
        adminUserId,
        action === 'DEACTIVATE' ? 'DEACTIVATE_SUBSCRIPTION' : (action === 'EXTEND' ? 'EXTEND_SUBSCRIPTION' : `ACTIVATE_${newPlan}`),
        {
          targetUserId: resolvedUserId,
          targetEmail: resolvedEmail,
          oldPlan,
          newPlan,
          oldStatus,
          newStatus,
          oldExpiresAt,
          newExpiresAt,
          reason,
          source: 'admin',
        }
      );
    }

    // 4. Sync Clerk Metadata for fast client validation & JWT claims
    try {
      if (resolvedUserId && !resolvedUserId.startsWith('mock_')) {
        const client = await clerkClient();
        await client.users.updateUserMetadata(resolvedUserId, {
          publicMetadata: {
            tier: newPlan,
            subscriptionStatus: newStatus,
            subscriptionExpiresAt: newExpiresAt ? newExpiresAt.toISOString() : null,
          },
        });
      }
    } catch (clerkErr) {
      // Non-blocking metadata note
    }

    return {
      success: true,
      user: user
        ? {
            id: user.id,
            email: user.email,
            tier: user.tier,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartedAt: user.subscriptionStartedAt ? user.subscriptionStartedAt.toISOString() : null,
            subscriptionExpiresAt: user.subscriptionExpiresAt ? user.subscriptionExpiresAt.toISOString() : null,
          }
        : null,
      expiryInfo: {
        startedAt: newStartedAt || now,
        expiresAt: newExpiresAt,
      },
    };
  } catch (error: any) {
    console.error('❌ [Central Subscription] Engine failure:', error);
    return {
      success: false,
      user: null,
      expiryInfo: { startedAt: new Date(), expiresAt: null },
      error: error.message || 'Central subscription update failed',
    };
  }
}
