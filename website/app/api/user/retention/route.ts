import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { updateUserActivity } from '../../../../lib/activity';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update activity on access
    await updateUserActivity(userId);

    let dbUser = null;
    let conversationCount = 0;
    let messageCount = 0;

    if (process.env.DATABASE_URL) {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      conversationCount = await prisma.chatSession.count({
        where: { userId },
      });
      messageCount = await prisma.message.count({
        where: { userId },
      });
    }

    const tier = (dbUser?.tier || 'FREE').toUpperCase();
    const lastActiveAt = dbUser?.lastActiveAt || new Date();
    
    // Retention period calculation
    let retentionPeriodDays = 45;
    if (tier === 'STUDENT') {
      retentionPeriodDays = 180;
    } else if (tier === 'PRO') {
      retentionPeriodDays = 365;
    }

    const autoDeletionDate = new Date(lastActiveAt.getTime() + retentionPeriodDays * 24 * 60 * 60 * 1000);

    // Calculate estimated storage size (Prisma user row, sessions, message texts)
    // 1 text character is 1 byte in UTF-8. Average message is ~500 chars.
    const averageMessageSizeBytes = 500;
    const estimatedStorageBytes = messageCount * averageMessageSizeBytes + (conversationCount * 120);

    // Format Storage size
    let storageFormatted = '0 KB';
    if (estimatedStorageBytes > 0) {
      if (estimatedStorageBytes < 1024 * 1024) {
        storageFormatted = `${(estimatedStorageBytes / 1024).toFixed(1)} KB`;
      } else {
        storageFormatted = `${(estimatedStorageBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    }

    return NextResponse.json({
      success: true,
      currentPlan: tier,
      retentionPeriodDays,
      lastActiveDate: lastActiveAt.toISOString(),
      autoDeletionDate: autoDeletionDate.toISOString(),
      storageUsed: storageFormatted,
      conversationCount,
      messageCount,
    });
  } catch (error) {
    console.error('Error fetching user retention statistics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
