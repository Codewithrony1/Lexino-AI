import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionMessages } from '../../../../lib/chatCompression';
import { checkRateLimit, getRateLimitHeaders } from '../../../../lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 60 requests per minute per user
    const rateLimit = checkRateLimit(`sessions:${userId}`, 60, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', message: 'Too many session requests.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        sessions: [],
        message: 'Database not connected, running in local-only mode.',
      });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // If specific sessionId requested, return its decompressed message array
    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Chat session not found or forbidden' }, { status: 404 });
      }

      const messages = await getSessionMessages(sessionId);
      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          title: session.title,
          pinned: session.pinned,
          storageState: session.storageState,
          isCompressed: session.storageState === 'COMPRESSED',
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messages,
        },
      });
    }

    // Pagination parameters
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
    const cursor = searchParams.get('cursor');

    // Otherwise list user sessions with cursor pagination
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      take: limit + 1, // Fetch 1 extra to determine next cursor
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        pinned: true,
        storageState: true,
        createdAt: true,
        updatedAt: true,
        lastInteractionAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    let nextCursor: string | null = null;
    let paginatedSessions = sessions;
    if (sessions.length > limit) {
      const nextItem = sessions[limit];
      nextCursor = nextItem.id;
      paginatedSessions = sessions.slice(0, limit);
    }

    const formattedSessions = paginatedSessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      pinned: s.pinned,
      storageState: s.storageState,
      isCompressed: s.storageState === 'COMPRESSED',
      messageCount: s.storageState === 'COMPRESSED' ? 'Archived (Binary)' : s._count.messages,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      nextCursor,
    });
  } catch (error) {
    console.error('Chat Sessions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`sessions_post:${userId}`, 60, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', message: 'Too many requests.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, message: 'Database not enabled' });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, title, pinned } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Check ownership if session already exists
    const existing = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedSession = await prisma.chatSession.upsert({
      where: { id: sessionId },
      update: {
        ...(title !== undefined ? { title: String(title).slice(0, 100) } : {}),
        ...(pinned !== undefined ? { pinned: Boolean(pinned) } : {}),
        updatedAt: new Date(),
      },
      create: {
        id: sessionId,
        userId,
        title: title ? String(title).slice(0, 100) : 'New chat',
        pinned: Boolean(pinned),
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: updatedSession.id,
        title: updatedSession.title,
        pinned: updatedSession.pinned,
        updatedAt: updatedSession.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update chat session error:', error);
    return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, message: 'Deleted locally' });
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden or session not found' }, { status: 404 });
    }

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Chat session deleted successfully',
    });
  } catch (error) {
    console.error('Delete chat session error:', error);
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}
