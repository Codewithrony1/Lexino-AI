import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { getSessionMessages } from '../../../../lib/chatCompression';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // If specific sessionId requested, return its decompressed message array
    if (sessionId) {
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
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

    // Otherwise list all user sessions
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
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

    const formattedSessions = sessions.map((s: any) => ({
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
    });
  } catch (error) {
    console.error('Chat Sessions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
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
