// Subscription Tier utilities
export type SubscriptionTier = 'FREE' | 'STUDENT' | 'PRO';

export function isPremiumTier(tier: string): boolean {
  return tier === 'STUDENT' || tier === 'PRO';
}
