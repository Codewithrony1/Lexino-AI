import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';
import { getStorageInfo, recalculateUserStorage, calculateMessageSize } from '../../../../lib/storage';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        tier: 'FREE',
        storageUsedBytes: 0,
        storageLimitBytes: 5 * 1024 * 1024,
        usagePercentage: 0,
        isBlocked: false,
        conversations: [],
      });
    }

    const storageInfo = await getStorageInfo(userId);

    // Fetch conversations list with pre-calculated storage footprint for client sorting/searching
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        storageState: true,
        compressedData: true,
        lastInteractionAt: true,
        updatedAt: true,
        messages: {
          select: {
            content: true,
            role: true,
            modelUsed: true,
          },
        },
      },
    });

    const formattedSessions = sessions.map((s) => {
      let sizeBytes = 500 + Buffer.byteLength(s.title || '', 'utf-8');
      if (s.storageState === 'COMPRESSED') {
        if (s.compressedData) {
          sizeBytes += Buffer.byteLength(s.compressedData, 'utf-8');
        }
      } else {
        for (const msg of s.messages) {
          sizeBytes += calculateMessageSize(msg.content, msg.role, msg.modelUsed);
        }
      }
      return {
        id: s.id,
        title: s.title,
        storageState: s.storageState,
        lastInteractionAt: s.lastInteractionAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        sizeBytes,
      };
    });

    return NextResponse.json({
      success: true,
      ...storageInfo,
      conversations: formattedSessions,
    });
  } catch (error) {
    console.error('Error fetching user storage quota:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, sessionIds, count } = body;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true });
    }

    // 1. Resolve which sessions to delete
    let idsToDelete: string[] = [];

    if (action === 'delete-selected') {
      if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        return NextResponse.json({ error: 'sessionIds array is required' }, { status: 400 });
      }
      idsToDelete = sessionIds;
    } else if (action === 'delete-oldest') {
      const limit = Number(count) || 5;
      const oldest = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { lastInteractionAt: 'asc' },
        take: limit,
        select: { id: true },
      });
      idsToDelete = oldest.map(o => o.id);
    } else if (action === 'delete-largest') {
      const limit = Number(count) || 5;
      
      // Fetch all sessions to calculate sizes
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

      const sized = sessions.map((s) => {
        let sizeBytes = 500 + Buffer.byteLength(s.title || '', 'utf-8');
        if (s.storageState === 'COMPRESSED') {
          if (s.compressedData) {
            sizeBytes += Buffer.byteLength(s.compressedData, 'utf-8');
          }
        } else {
          for (const msg of s.messages) {
            sizeBytes += calculateMessageSize(msg.content, msg.role, msg.modelUsed);
          }
        }
        return { id: s.id, sizeBytes };
      });

      // Sort largest first
      sized.sort((a, b) => b.sizeBytes - a.sizeBytes);
      idsToDelete = sized.slice(0, limit).map(s => s.id);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (idsToDelete.length > 0) {
      // Execute deletion within a transaction block for atomicity
      await prisma.$transaction(async (tx) => {
        // Cascade delete will delete associated messages, but to be safe and clean:
        await tx.message.deleteMany({
          where: { sessionId: { in: idsToDelete }, userId },
        });

        await tx.chatSession.deleteMany({
          where: { id: { in: idsToDelete }, userId },
        });
      });

      // Recalculate and update cached user storage size
      await recalculateUserStorage(userId);
    }

    const updatedStorage = await getStorageInfo(userId);

    return NextResponse.json({
      success: true,
      deletedCount: idsToDelete.length,
      ...updatedStorage,
    });
  } catch (error) {
    console.error('Error executing storage manager deletion:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
