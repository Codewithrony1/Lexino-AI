import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendWarningEmail } from '../../../../lib/email';

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
  logs.push(`Cleanup cron started at ${new Date().toISOString()}`);

  try {
    const now = Date.now();

    // Define thresholds in milliseconds
    const oneDay = 24 * 60 * 60 * 1000;
    
    // FREE thresholds
    const freeWarnThreshold = new Date(now - 30 * oneDay);
    const freeFinalWarnThreshold = new Date(now - 40 * oneDay);
    const freeLimitThreshold = new Date(now - 45 * oneDay);

    // STUDENT thresholds
    const studentWarnThreshold = new Date(now - 150 * oneDay);
    const studentFinalWarnThreshold = new Date(now - 170 * oneDay);
    const studentLimitThreshold = new Date(now - 180 * oneDay);

    // PRO thresholds
    const proWarnThreshold = new Date(now - 335 * oneDay);
    const proFinalWarnThreshold = new Date(now - 355 * oneDay);
    const proLimitThreshold = new Date(now - 365 * oneDay);

    // ==========================================
    // PHASE 1: WARNING EMAILS
    // ==========================================

    // FREE Warning 1 (30-39 days inactive, warnedAt is null)
    const freeWarn1 = await prisma.user.findMany({
      where: {
        tier: 'FREE',
        lastActiveAt: { lte: freeWarnThreshold, gt: freeFinalWarnThreshold },
        warnedAt: null,
      },
    });
    for (const u of freeWarn1) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 45 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'User', daysInactive, daysLeft, tier: 'FREE' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { warnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${freeWarn1.length} warning emails to FREE users.`);

    // FREE Warning 2 (40-44 days inactive, finalWarnedAt is null)
    const freeWarn2 = await prisma.user.findMany({
      where: {
        tier: 'FREE',
        lastActiveAt: { lte: freeFinalWarnThreshold, gt: freeLimitThreshold },
        finalWarnedAt: null,
      },
    });
    for (const u of freeWarn2) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 45 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'User', daysInactive, daysLeft, tier: 'FREE (FINAL WARNING)' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { finalWarnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${freeWarn2.length} final warning emails to FREE users.`);

    // STUDENT Warning 1 (150-169 days inactive)
    const studentWarn1 = await prisma.user.findMany({
      where: {
        tier: 'STUDENT',
        lastActiveAt: { lte: studentWarnThreshold, gt: studentFinalWarnThreshold },
        warnedAt: null,
      },
    });
    for (const u of studentWarn1) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 180 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'Student', daysInactive, daysLeft, tier: 'STUDENT' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { warnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${studentWarn1.length} warning emails to STUDENT users.`);

    // STUDENT Warning 2 (170-179 days inactive)
    const studentWarn2 = await prisma.user.findMany({
      where: {
        tier: 'STUDENT',
        lastActiveAt: { lte: studentFinalWarnThreshold, gt: studentLimitThreshold },
        finalWarnedAt: null,
      },
    });
    for (const u of studentWarn2) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 180 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'Student', daysInactive, daysLeft, tier: 'STUDENT (FINAL WARNING)' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { finalWarnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${studentWarn2.length} final warning emails to STUDENT users.`);

    // PRO Warning 1 (335-354 days inactive)
    const proWarn1 = await prisma.user.findMany({
      where: {
        tier: 'PRO',
        lastActiveAt: { lte: proWarnThreshold, gt: proFinalWarnThreshold },
        warnedAt: null,
      },
    });
    for (const u of proWarn1) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 365 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'Pro User', daysInactive, daysLeft, tier: 'PRO' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { warnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${proWarn1.length} warning emails to PRO users.`);

    // PRO Warning 2 (355-364 days inactive)
    const proWarn2 = await prisma.user.findMany({
      where: {
        tier: 'PRO',
        lastActiveAt: { lte: proFinalWarnThreshold, gt: proLimitThreshold },
        finalWarnedAt: null,
      },
    });
    for (const u of proWarn2) {
      const daysInactive = Math.floor((now - u.lastActiveAt.getTime()) / oneDay);
      const daysLeft = 365 - daysInactive;
      const sent = await sendWarningEmail({ email: u.email, name: u.name || 'Pro User', daysInactive, daysLeft, tier: 'PRO (FINAL WARNING)' });
      if (sent) {
        await prisma.user.update({ where: { id: u.id }, data: { finalWarnedAt: new Date() } });
      }
    }
    logs.push(`Phase 1: Sent ${proWarn2.length} final warning emails to PRO users.`);

    // ==========================================
    // PHASE 2: BATCH DATA RETENTION CLEANUP
    // ==========================================

    // Fetch all users that are past their retention limits
    const inactiveUsers = await prisma.user.findMany({
      where: {
        OR: [
          { tier: 'FREE', lastActiveAt: { lte: freeLimitThreshold } },
          { tier: 'STUDENT', lastActiveAt: { lte: studentLimitThreshold } },
          { tier: 'PRO', lastActiveAt: { lte: proLimitThreshold } },
        ],
      },
    });

    logs.push(`Phase 2: Found ${inactiveUsers.length} inactive users past their retention limits.`);

    let totalDeletedSessions = 0;
    let totalDeletedMessages = 0;

    for (const user of inactiveUsers) {
      const sessionCount = await prisma.chatSession.count({ where: { userId: user.id } });
      const messageCount = await prisma.message.count({ where: { userId: user.id } });

      if (sessionCount > 0 || messageCount > 0) {
        // Execute in transaction block to ensure atomic batch deletions
        await prisma.$transaction(async (tx) => {
          // Delete messages
          await tx.message.deleteMany({ where: { userId: user.id } });
          
          // Delete chat sessions
          await tx.chatSession.deleteMany({ where: { userId: user.id } });

          // Create the Cleanup Log
          const daysInactive = Math.floor((now - user.lastActiveAt.getTime()) / oneDay);
          await tx.cleanupLog.create({
            data: {
              userId: user.id,
              subscriptionTier: user.tier,
              deletedConversations: sessionCount,
              deletedMessages: messageCount,
              deletedFiles: 0, // In offline/memory-only upload model, files are not saved to DB
              reason: `Inactive for ${daysInactive} days. Policy limit exceeded.`,
            },
          });

          // Reset warned states and update lastActiveAt to prevent repeating cleanup logs tomorrow
          await tx.user.update({
            where: { id: user.id },
            data: {
              lastActiveAt: new Date(), // resets inactivity cycle
              warnedAt: null,
              finalWarnedAt: null,
            },
          });
        });

        totalDeletedSessions += sessionCount;
        totalDeletedMessages += messageCount;
        logs.push(`Cleaned up user ${user.id} (${user.tier}): Deleted ${sessionCount} chats, ${messageCount} messages.`);
      } else {
        // No data to delete, but we must update lastActiveAt to prevent selecting them tomorrow
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
            warnedAt: null,
            finalWarnedAt: null,
          },
        });
      }
    }

    logs.push(`Phase 2 completed. Total Deleted Chats: ${totalDeletedSessions}, Total Deleted Messages: ${totalDeletedMessages}`);
    
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error during automatic data retention cleanup:', error);
    logs.push(`Error: ${error.message || error}`);
    return NextResponse.json({ success: false, error: 'Internal Server Error', logs }, { status: 500 });
  }
}
