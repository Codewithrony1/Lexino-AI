import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { archiveChatSession, restoreChatSession, autoArchiveInactiveSessions } from '../../../../lib/chatCompression';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, action, daysInactive } = body;

    if (action === 'auto_archive') {
      const days = typeof daysInactive === 'number' ? daysInactive : 14;
      const result = await autoArchiveInactiveSessions(userId, days);
      return NextResponse.json({
        success: true,
        message: `Auto-archived ${result.archivedCount} inactive chat session(s) into binary compressed storage.`,
        data: result,
      });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Verify session ownership
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Session not found or forbidden' }, { status: 404 });
    }

    if (action === 'restore') {
      const restoreResult = await restoreChatSession(sessionId);
      if (!restoreResult.success) {
        return NextResponse.json({ error: restoreResult.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'Chat session successfully restored to active hot storage.',
      });
    }

    // Default action: Archive / Compress
    const archiveResult = await archiveChatSession(sessionId);
    if (!archiveResult.success) {
      return NextResponse.json({ error: archiveResult.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Chat session successfully converted to binary compressed cold storage.',
      metrics: archiveResult.metrics,
    });
  } catch (error: any) {
    console.error('Chat Archive API error:', error);
    return NextResponse.json({ error: 'Internal server error during chat compression' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [totalSessions, compressedSessions, hotSessions] = await Promise.all([
      prisma.chatSession.count({ where: { userId } }),
      prisma.chatSession.count({ where: { userId, storageState: 'COMPRESSED' } }),
      prisma.chatSession.count({ where: { userId, storageState: 'HOT' } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions,
        hotSessions,
        compressedSessions,
        compressionEngine: 'Brotli + Gzip Binary Buffer (Base64)',
        estimatedStorageSavedPercent: compressedSessions > 0 ? '70% - 85%' : '0%',
      },
    });
  } catch (error) {
    console.error('Chat Archive Stats API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve storage statistics' }, { status: 500 });
  }
}
