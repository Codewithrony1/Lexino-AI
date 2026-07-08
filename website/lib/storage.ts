import { prisma } from './prisma';

export const STORAGE_LIMITS = {
  FREE: 5 * 1024 * 1024,      // 5 MB
  STUDENT: 25 * 1024 * 1024,  // 25 MB
  PRO: 50 * 1024 * 1024,      // 50 MB
};

export const HOT_THRESHOLD_DAYS = {
  FREE: 7,
  STUDENT: 12,
  PRO: 12,
};

export const LIFECYCLE_THRESHOLD_DAYS = {
  FREE: 21,
  STUDENT: 45,
  PRO: 75,
};

/**
 * Calculates the size of a single message's metadata and content.
 */
export function calculateMessageSize(content: string, role: string, modelUsed: string | null): number {
  const contentBytes = Buffer.byteLength(content || '', 'utf-8');
  const roleBytes = Buffer.byteLength(role || '', 'utf-8');
  const modelBytes = Buffer.byteLength(modelUsed || '', 'utf-8');
  return contentBytes + roleBytes + modelBytes + 100; // 100 bytes fixed overhead for indexes/metadata
}

/**
 * Recalculates the exact storage utilization for a user and updates the User record.
 */
export async function recalculateUserStorage(userId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        storageState: true,
        compressedData: true,
        messages: {
          select: {
            content: true,
            role: true,
            modelUsed: true,
          },
        },
      },
    });

    let totalBytes = 0;

    for (const session of sessions) {
      // Session metadata overhead (fixed 500 bytes) + title
      totalBytes += 500 + Buffer.byteLength(session.title || '', 'utf-8');

      if (session.storageState === 'COMPRESSED') {
        // Size of the raw base64 compressed data stored in the database
        if (session.compressedData) {
          totalBytes += Buffer.byteLength(session.compressedData, 'utf-8');
        }
      } else {
        // Calculate size of active message rows
        for (const msg of session.messages) {
          totalBytes += calculateMessageSize(msg.content, msg.role, msg.modelUsed);
        }
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsedBytes: totalBytes },
    });

    return totalBytes;
  } catch (error) {
    console.error(`Failed to recalculate storage for user ${userId}:`, error);
    return 0;
  }
}

/**
 * Adjusts user storage counter incrementally without scanning the whole database.
 */
export async function adjustUserStorage(userId: string, bytesChange: number) {
  if (!process.env.DATABASE_URL) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsedBytes: true },
    });

    if (!user) return;

    let newTotal = Number(user.storageUsedBytes) + bytesChange;
    if (newTotal < 0) newTotal = 0;

    await prisma.user.update({
      where: { id: userId },
      data: { storageUsedBytes: newTotal },
    });
  } catch (error) {
    console.error(`Failed to adjust user storage for ${userId}:`, error);
  }
}

/**
 * Checks storage status for a user against their plan limits.
 */
export async function getStorageInfo(userId: string) {
  const defaultInfo = {
    tier: 'FREE',
    storageUsedBytes: 0,
    storageLimitBytes: STORAGE_LIMITS.FREE,
    usagePercentage: 0,
    isBlocked: false,
  };

  if (!process.env.DATABASE_URL) return defaultInfo;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, storageUsedBytes: true },
    });

    if (!user) return defaultInfo;

    const tier = (user.tier || 'FREE').toUpperCase() as keyof typeof STORAGE_LIMITS;
    const limitBytes = STORAGE_LIMITS[tier] || STORAGE_LIMITS.FREE;
    const usedBytes = Number(user.storageUsedBytes);
    const usagePercentage = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;

    return {
      tier,
      storageUsedBytes: usedBytes,
      storageLimitBytes: limitBytes,
      usagePercentage,
      isBlocked: usagePercentage >= 100,
    };
  } catch (error) {
    console.error(`Error getting storage info for user ${userId}:`, error);
    return defaultInfo;
  }
}
