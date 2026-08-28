// Subscription Tier & Strict 1-Month Lifecycle Utilities
export type SubscriptionTier = 'FREE' | 'STUDENT' | 'PRO';
export type SubscriptionStatus = 'active' | 'expired' | 'inactive';

export const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days (1 Month)

export interface UserSubscriptionInfo {
  tier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionStartedAt?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
}

export interface EffectiveSubscription {
  tier: SubscriptionTier;
  rawTier: string;
  isActive: boolean;
  isExpired: boolean;
  status: SubscriptionStatus;
  startedAt: Date | null;
  expiresAt: Date | null;
  daysRemaining: number;
}

/**
 * Server-side evaluation of whether a subscription is currently valid.
 * If a user has a paid tier but expiresAt <= now, they are automatically downgraded to FREE.
 */
export function evaluateSubscription(user: UserSubscriptionInfo | null | undefined): EffectiveSubscription {
  const rawTier = ((user?.tier || 'FREE') as string).toUpperCase();
  const expiresAt = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const startedAt = user?.subscriptionStartedAt ? new Date(user.subscriptionStartedAt) : null;
  const now = new Date();

  if (rawTier === 'FREE' || !rawTier) {
    return {
      tier: 'FREE',
      rawTier: 'FREE',
      isActive: false,
      isExpired: false,
      status: 'inactive',
      startedAt: null,
      expiresAt: null,
      daysRemaining: 0,
    };
  }

  // If user has a paid tier (STUDENT or PRO), check expiry date
  if (!expiresAt || isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    // Subscription has expired
    return {
      tier: 'FREE', // Enforce Free access
      rawTier,
      isActive: false,
      isExpired: true,
      status: 'expired',
      startedAt,
      expiresAt,
      daysRemaining: 0,
    };
  }

  // Subscription is currently active and within valid 1-month window
  const validTier: SubscriptionTier = rawTier === 'PRO' ? 'PRO' : 'STUDENT';
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    tier: validTier,
    rawTier,
    isActive: true,
    isExpired: false,
    status: 'active',
    startedAt,
    expiresAt,
    daysRemaining,
  };
}

/**
 * Calculates new 1-month subscription expiry with renewal stacking support.
 * If the user currently has an active subscription of the same tier, stack +30 days from existing expiry.
 * Otherwise, start 30 days from current time.
 */
export function calculateSubscriptionExpiry(
  existingExpiresAt: Date | string | null | undefined,
  targetTier: SubscriptionTier,
  currentTier?: string | null
): { startedAt: Date; expiresAt: Date } {
  const now = new Date();
  const existingDate = existingExpiresAt ? new Date(existingExpiresAt) : null;
  const isSameTierActive =
    existingDate &&
    !isNaN(existingDate.getTime()) &&
    existingDate.getTime() > now.getTime() &&
    (currentTier || '').toUpperCase() === targetTier.toUpperCase();

  let expiresAt: Date;
  if (isSameTierActive && existingDate) {
    // Seamlessly stack 30 days onto current expiry date
    expiresAt = new Date(existingDate.getTime() + SUBSCRIPTION_DURATION_MS);
  } else {
    // Fresh 1-month window starting now
    expiresAt = new Date(now.getTime() + SUBSCRIPTION_DURATION_MS);
  }

  return {
    startedAt: now,
    expiresAt,
  };
}

export function isPremiumTier(tier: string): boolean {
  return tier === 'STUDENT' || tier === 'PRO';
}
