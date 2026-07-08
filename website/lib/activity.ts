import { prisma } from './prisma';

/**
 * Updates the user's lastActiveAt timestamp in the database
 * and resets warnedAt and finalWarnedAt flags to allow future warnings if they go inactive again.
 */
export async function updateUserActivity(userId: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date(),
        warnedAt: null,
        finalWarnedAt: null,
      },
    });
  } catch (error) {
    console.error(`Error updating activity for user ${userId}:`, error);
  }
}
