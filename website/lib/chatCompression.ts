import { prisma } from './prisma';
import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const brotliCompressAsync = promisify(zlib.brotliCompress);
const brotliDecompressAsync = promisify(zlib.brotliDecompress);

export interface ChatMessageRecord {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelUsed?: string | null;
  createdAt?: string | Date;
  fileUrls?: string[];
}

export interface CompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  savingsBytes: number;
  savingsPercentage: number;
}

/**
 * High-performance binary compression using Brotli (with Gzip fallback)
 */
export async function compressMessagesBinary(messages: ChatMessageRecord[]): Promise<string> {
  const jsonString = JSON.stringify(messages);
  const buffer = Buffer.from(jsonString, 'utf-8');
  
  try {
    const compressedBuffer = await brotliCompressAsync(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 6, // optimal speed / compression ratio
      }
    });
    return `br:${compressedBuffer.toString('base64')}`;
  } catch (err) {
    // Fallback to Gzip
    const gzipBuffer = await gzipAsync(buffer);
    return `gz:${gzipBuffer.toString('base64')}`;
  }
}

/**
 * Transparently decompress binary compressed chat payload back into structured messages
 */
export async function decompressMessagesBinary(compressedString: string): Promise<ChatMessageRecord[]> {
  if (!compressedString) return [];

  let format = 'br';
  let rawBase64 = compressedString;

  if (compressedString.startsWith('br:')) {
    format = 'br';
    rawBase64 = compressedString.slice(3);
  } else if (compressedString.startsWith('gz:')) {
    format = 'gz';
    rawBase64 = compressedString.slice(3);
  }

  const buffer = Buffer.from(rawBase64, 'base64');

  if (format === 'br') {
    try {
      const decompressedBuffer = await brotliDecompressAsync(buffer);
      return JSON.parse(decompressedBuffer.toString('utf-8'));
    } catch (brErr) {
      // Fallback try gzip in case format tag differed
      const gzipFallback = await gunzipAsync(buffer);
      return JSON.parse(gzipFallback.toString('utf-8'));
    }
  } else {
    const decompressedBuffer = await gunzipAsync(buffer);
    return JSON.parse(decompressedBuffer.toString('utf-8'));
  }
}

/**
 * Calculate exact binary compression ratio & bytes saved
 */
export function calculateSavings(originalText: string, compressedBase64: string): CompressionMetrics {
  const originalBytes = Buffer.byteLength(originalText, 'utf-8');
  const compressedBytes = Buffer.byteLength(compressedBase64, 'utf-8');
  const savingsBytes = Math.max(0, originalBytes - compressedBytes);
  const savingsPercentage = originalBytes > 0 
    ? Math.round((savingsBytes / originalBytes) * 1000) / 10 
    : 0;

  return {
    originalBytes,
    compressedBytes,
    savingsBytes,
    savingsPercentage,
  };
}

/**
 * Archives a chat session into binary compressed storage in PostgreSQL
 */
export async function archiveChatSession(sessionId: string): Promise<{ success: boolean; metrics?: CompressionMetrics; message?: string }> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return { success: false, message: 'Chat session not found' };
    }

    if (session.storageState === 'COMPRESSED' && session.compressedData) {
      return { success: true, message: 'Session is already compressed' };
    }

    if (session.messages.length === 0) {
      return { success: true, message: 'No messages to compress in this session' };
    }

    const messagesToCompress: ChatMessageRecord[] = session.messages.map((m: any) => ({
      id: m.id,
      role: m.role as any,
      content: m.content,
      modelUsed: m.modelUsed,
      createdAt: m.createdAt.toISOString(),
      fileUrls: m.fileUrls || [],
    }));

    const rawJson = JSON.stringify(messagesToCompress);
    const compressedBinary = await compressMessagesBinary(messagesToCompress);
    const metrics = calculateSavings(rawJson, compressedBinary);

    // Atomically store compressed binary and remove individual rows to save PostgreSQL disk space
    await prisma.$transaction([
      prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          storageState: 'COMPRESSED',
          compressedData: compressedBinary,
          updatedAt: new Date(),
        },
      }),
      prisma.message.deleteMany({
        where: { sessionId },
      }),
      prisma.user.update({
        where: { id: session.userId },
        data: {
          storageUsedBytes: {
            decrement: BigInt(metrics.savingsBytes),
          },
        },
      }),
    ]);

    return {
      success: true,
      metrics,
    };
  } catch (err: any) {
    console.error('Error during chat session binary archiving:', err);
    return { success: false, message: err?.message || 'Compression error' };
  }
}

/**
 * Restores a compressed chat session back to HOT active state
 */
export async function restoreChatSession(sessionId: string): Promise<{ success: boolean; messages?: ChatMessageRecord[]; message?: string }> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: false, message: 'Chat session not found' };
    }

    if (session.storageState === 'HOT' || !session.compressedData) {
      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      return { success: true, messages: messages.map((m: any) => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        modelUsed: m.modelUsed,
        createdAt: m.createdAt,
        fileUrls: m.fileUrls,
      })) };
    }

    const messages = await decompressMessagesBinary(session.compressedData);

    // Rehydrate messages into Message table
    if (messages.length > 0) {
      await prisma.$transaction([
        prisma.message.createMany({
          data: messages.map((m) => ({
            id: m.id,
            sessionId,
            userId: session.userId,
            role: m.role,
            content: m.content,
            modelUsed: m.modelUsed || null,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
            fileUrls: m.fileUrls || [],
          })),
        }),
        prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            storageState: 'HOT',
            compressedData: null,
            updatedAt: new Date(),
          },
        }),
      ]);
    }

    return { success: true, messages };
  } catch (err: any) {
    console.error('Error restoring compressed chat session:', err);
    return { success: false, message: err?.message || 'Restoration error' };
  }
}

/**
 * Seamlessly fetch messages for any chat session, auto-decompressing in memory if archived
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessageRecord[]> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return [];

  if (session.storageState === 'COMPRESSED' && session.compressedData) {
    return await decompressMessagesBinary(session.compressedData);
  }

  const rawMessages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return rawMessages.map((m: any) => ({
    id: m.id,
    role: m.role as any,
    content: m.content,
    modelUsed: m.modelUsed,
    createdAt: m.createdAt,
    fileUrls: m.fileUrls,
  }));
}

/**
 * Auto-archive inactive chats older than specified threshold (default: 14 days)
 */
export async function autoArchiveInactiveSessions(userId?: string, olderThanDays: number = 14) {
  const thresholdDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const whereClause: any = {
    storageState: 'HOT',
    lastInteractionAt: { lt: thresholdDate },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const candidateSessions = await prisma.chatSession.findMany({
    where: whereClause,
    select: { id: true },
    take: 50, // Batch limit
  });

  const results = [];
  let totalSavedBytes = 0;

  for (const s of candidateSessions) {
    const archiveRes = await archiveChatSession(s.id);
    if (archiveRes.success && archiveRes.metrics) {
      totalSavedBytes += archiveRes.metrics.savingsBytes;
      results.push({ sessionId: s.id, savingsPercent: archiveRes.metrics.savingsPercentage });
    }
  }

  return {
    archivedCount: results.length,
    totalSavedBytes,
    results,
  };
}
