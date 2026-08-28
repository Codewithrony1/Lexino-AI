import { evaluateSubscription, SubscriptionTier } from './subscription';

export interface UserEntitlements {
  tier: SubscriptionTier;
  rawTier: string;
  isActive: boolean;
  isExpired: boolean;
  status: 'active' | 'expired' | 'inactive';
  startedAt: Date | null;
  expiresAt: Date | null;
  daysRemaining: number;
  dailyQueryLimit: number;
  allowedModels: string[];
  hasGpt4o: boolean;
  hasClaudeSonnet: boolean;
  hasTimetableAi: boolean;
  hasAllWallpapers: boolean;
  canUploadFiles: boolean;
  maxFileUploads: number;
  prioritySpeed: boolean;
  badgeLabel: string;
}

export const BASE_MODELS = ['llama-3.1-8b-instant', 'default'];
export const STUDENT_MODELS = ['llama-3.1-8b-instant', 'gpt-4o', 'timetable-ai', 'default'];
export const PRO_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'gpt-4o', 'claude-3-5-sonnet', 'timetable-ai', 'default'];

/**
 * Authoritative server-side entitlement resolution.
 * Decouples billing storage from application feature gating.
 */
export function getUserEntitlements(user: {
  tier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionStartedAt?: Date | string | null;
  subscriptionExpiresAt?: Date | string | null;
} | null | undefined): UserEntitlements {
  const sub = evaluateSubscription(user);
  const tier = sub.tier;

  if (tier === 'PRO') {
    return {
      ...sub,
      dailyQueryLimit: 1500,
      allowedModels: PRO_MODELS,
      hasGpt4o: true,
      hasClaudeSonnet: true,
      hasTimetableAi: true,
      hasAllWallpapers: true,
      canUploadFiles: true,
      maxFileUploads: 20,
      prioritySpeed: true,
      badgeLabel: 'PRO / UNLIMITED',
    };
  }

  if (tier === 'STUDENT') {
    return {
      ...sub,
      dailyQueryLimit: 300,
      allowedModels: STUDENT_MODELS,
      hasGpt4o: true,
      hasClaudeSonnet: false,
      hasTimetableAi: true,
      hasAllWallpapers: true,
      canUploadFiles: true,
      maxFileUploads: 10,
      prioritySpeed: true,
      badgeLabel: 'STUDENT',
    };
  }

  // Fallback Free Plan Entitlements
  return {
    ...sub,
    dailyQueryLimit: 50,
    allowedModels: BASE_MODELS,
    hasGpt4o: false,
    hasClaudeSonnet: false,
    hasTimetableAi: false,
    hasAllWallpapers: false,
    canUploadFiles: true,
    maxFileUploads: 3,
    prioritySpeed: false,
    badgeLabel: 'FREE',
  };
}

/**
 * Verifies if a user has access to a specific AI model.
 */
export function isModelAllowedForUser(modelId: string, user: any): boolean {
  const entitlements = getUserEntitlements(user);
  const targetModel = (modelId || '').toLowerCase().trim();
  
  if (targetModel.includes('claude')) {
    return entitlements.hasClaudeSonnet;
  }
  if (targetModel.includes('gpt-4') || targetModel.includes('gpt4')) {
    return entitlements.hasGpt4o;
  }
  if (targetModel.includes('timetable')) {
    return entitlements.hasTimetableAi;
  }

  return true;
}
