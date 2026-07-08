import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { decompressMessages } from '../../../../lib/compression';
import { updateUserActivity } from '../../../../lib/activity';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, messages: [] });
    }

    // 1. Fetch the chat session and verify ownership
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        storageState: true,
        compressedData: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 2. Fetch/Decompress messages in memory
    let messages: any[] = [];

    // If there is compressed history, decompress in memory
    if (session.compressedData) {
      try {
        messages = decompressMessages(session.compressedData);
      } catch (err) {
        console.error(`Failed to decompress session ${sessionId}:`, err);
      }
    }

    // Fetch active messages from the Message table
    const activeMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Merge history with new active messages
    const formattedActive = activeMessages.map(m => ({
      role: m.role,
      content: m.content,
      modelUsed: m.modelUsed,
      createdAt: m.createdAt.toISOString(),
    }));

    messages = [...messages, ...formattedActive];

    // 3. Reset lifecycle timer & user active timestamp (Side effect)
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { lastInteractionAt: new Date() },
    });

    await updateUserActivity(userId);

    return NextResponse.json({
      success: true,
      messages,
      storageState: session.storageState,
    });
  } catch (error) {
    console.error('Error fetching chat session history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
