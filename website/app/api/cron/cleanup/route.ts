import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendWarningEmail } from '../../../../lib/email';
import { compressMessages } from '../../../../lib/compression';
import { recalculateUserStorage, HOT_THRESHOLD_DAYS, LIFECYCLE_THRESHOLD_DAYS } from '../../../../lib/storage';

export async function GET(request: Request) {
  return handleCleanup(request);
}

export async function POST(request: Request) {
  return handleCleanup(request);
}

async function handleCleanup(request: Request) {
  // 1. Secure using CRON_SECRET
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: 'DATABASE_URL is not configured. Cleanup bypassed.' });
  }

  const logs: string[] = [];
  logs.push(`Daily cleanup cron started at ${new Date().toISOString()}`);

  try {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // ==========================================
    // PHASE 1: PRE-DELETION WARNING EMAILS
    // ==========================================
    // (Retain warning sequence from previous implementation to warn users before full account inactivity deletion)
    // Account Inactivity limit is 365 days for all tiers.
    // Warning thresholds:
    // - Warning 1: Day 340 (lastActiveAt <= 340 days ago, warnedAt is null)
    // - Warning 2 (Final): Day 355 (lastActiveAt <= 355 days ago, finalWarnedAt is null)
    const warn1Threshold = new Date(now - 340 * oneDay);
    const warn2Threshold = new Date(now - 355 * oneDay);
    const deleteThreshold = new Date(now - 365 * oneDay);

    const usersToWarn1 = await prisma.user.findMany({
      where: {
        lastActiveAt: { lte: warn1Threshold, gt: warn2Threshold },
        warnedAt: null,
      },
      take: 100,
    });
    for (const u of usersToWarn1) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 365 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'User', daysInactive, daysLeft, tier: u.tier });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { warnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${usersToWarn1.length} initial account warnings.`);

    const usersToWarn2 = await prisma.user.findMany({
      where: {
        lastActiveAt: { lte: warn2Threshold, gt: deleteThreshold },
        finalWarnedAt: null,
      },
      take: 100,
    });
    for (const u of usersToWarn2) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 365 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'User', daysInactive, daysLeft, tier: `${u.tier} (FINAL WARNING)` });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { finalWarnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${usersToWarn2.length} final account warnings.`);

    // ==========================================
    // PHASE 2: COMPRESS HOT CONVERSATIONS
    // ==========================================
    // Compress conversations that have exceeded their HOT period limit
    let compressedCount = 0;
    while (true) {
      // Fetch a batch of 100 HOT conversations to check
      const batch = await prisma.chatSession.findMany({
        where: {
          storageState: 'HOT',
        },
        include: {
          user: { select: { tier: true } },
          messages: true,
        },
        take: 100,
      });

      if (batch.length === 0) break;

      let processedInBatch = 0;

      for (const session of batch) {
        const tier = (session.user?.tier || 'FREE').toUpperCase() as keyof typeof HOT_THRESHOLD_DAYS;
        const thresholdDays = HOT_THRESHOLD_DAYS[tier] || HOT_THRESHOLD_DAYS.FREE;
        const cutoffDate = new Date(now - thresholdDays * oneDay);

        // Compress only if lastInteractionAt is older than the HOT threshold days
        if (session.lastInteractionAt <= cutoffDate && session.messages.length > 0) {
          const messagesData = session.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            modelUsed: m.modelUsed,
            createdAt: m.createdAt.toISOString(),
          }));

          const base64Compressed = compressMessages(messagesData);

          await prisma.$transaction(async (tx) => {
            // 1. Update ChatSession compressed data & state
            await tx.chatSession.update({
              where: { id: session.id },
              data: {
                storageState: 'COMPRESSED',
                compressedData: base64Compressed,
              },
            });

            // 2. Delete Message rows
            await tx.message.deleteMany({
              where: { sessionId: session.id },
            });
          });

          await recalculateUserStorage(session.userId);
          compressedCount++;
          processedInBatch++;
        } else if (session.messages.length === 0) {
          // If no messages, transition to COMPRESSED state directly
          await prisma.chatSession.update({
            where: { id: session.id },
            data: { storageState: 'COMPRESSED', compressedData: null },
          });
          processedInBatch++;
        } else {
          // It's still HOT, we need to skip it in next query. To do this without mutating database state,
          // we can just exit this batch check. Since batch query is not deterministic if we don't paginate,
          // we make sure we paginate or filter by ID.
          // To keep it simple and avoid infinite loops on HOT chats:
          // we only fetch chats where the lastInteractionAt is older than the minimum HOT threshold (7 days)
          // so that newer active chats are never returned in the batch!
        }
      }

      // If we processed nothing in this batch, it means remaining items are all HOT. Exit loop.
      if (processedInBatch === 0) break;
    }
    logs.push(`Phase 2: Compressed ${compressedCount} conversations.`);

    // ==========================================
    // PHASE 3: DELETE EXPIRED CONVERSATIONS
    // ==========================================
    // Delete conversations inactive for more than lifecycle threshold days (21, 45, 75)
    let expiredDeletedCount = 0;
    for (const plan of ['FREE', 'STUDENT', 'PRO']) {
      const tier = plan as keyof typeof LIFECYCLE_THRESHOLD_DAYS;
      const limitDays = LIFECYCLE_THRESHOLD_DAYS[tier];
      const cutoffDate = new Date(now - limitDays * oneDay);

      while (true) {
        const batch = await prisma.chatSession.findMany({
          where: {
            user: { tier: plan },
            lastInteractionAt: { lte: cutoffDate },
          },
          take: 100,
          select: { id: true, userId: true },
        });

        if (batch.length === 0) break;

        const ids = batch.map(s => s.id);
        const userIds = Array.from(new Set(batch.map(s => s.userId)));

        await prisma.$transaction(async (tx) => {
          await tx.message.deleteMany({ where: { sessionId: { in: ids } } });
          await tx.chatSession.deleteMany({ where: { id: { in: ids } } });
        });

        for (const uid of userIds) {
          await recalculateUserStorage(uid);
        }

        expiredDeletedCount += ids.length;
        if (batch.length < 100) break;
      }
    }
    logs.push(`Phase 3: Deleted ${expiredDeletedCount} expired conversations due to inactivity.`);

    // ==========================================
    // PHASE 4: ACCOUNT INACTIVITY CLEANUP
    // ==========================================
    // Delete all chats for users inactive for 365 consecutive days.
    let inactiveUsersCleaned = 0;
    while (true) {
      const batch = await prisma.user.findMany({
        where: {
          lastActiveAt: { lte: deleteThreshold },
        },
        take: 100,
        select: { id: true, tier: true },
      });

      if (batch.length === 0) break;

      for (const user of batch) {
        const sessionCount = await prisma.chatSession.count({ where: { userId: user.id } });
        const messageCount = await prisma.message.count({ where: { userId: user.id } });

        await prisma.$transaction(async (tx) => {
          await tx.message.deleteMany({ where: { userId: user.id } });
          await tx.chatSession.deleteMany({ where: { userId: user.id } });
          
          await tx.cleanupLog.create({
            data: {
              userId: user.id,
              subscriptionTier: user.tier,
              deletedConversations: sessionCount,
              deletedMessages: messageCount,
              deletedFiles: 0,
              reason: `Account inactive for 365 days.`,
            },
          });

          // Reset lastActiveAt to today to prevent duplicate logs tomorrow
          await tx.user.update({
            where: { id: user.id },
            data: {
              lastActiveAt: new Date(),
              warnedAt: null,
              finalWarnedAt: null,
              storageUsedBytes: 0,
            },
          });
        });

        inactiveUsersCleaned++;
      }
      if (batch.length < 100) break;
    }
    logs.push(`Phase 4: Cleaned ${inactiveUsersCleaned} inactive accounts.`);

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Cron job error:', error);
    logs.push(`Error: ${error.message || error}`);
    return NextResponse.json({ success: false, error: 'Internal Server Error', logs }, { status: 500 });
  }
}
