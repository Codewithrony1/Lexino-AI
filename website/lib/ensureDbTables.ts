import { prisma } from './prisma';

let hasEnsuredTables = false;

export async function ensureDbTables(): Promise<void> {
  if (hasEnsuredTables || !process.env.DATABASE_URL) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "avatarUrl" TEXT,
        "tier" TEXT NOT NULL DEFAULT 'FREE',
        "cooldownUntil" TIMESTAMP(3),
        "messageCountToday" INTEGER NOT NULL DEFAULT 0,
        "lastMessageAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "preferences" JSONB,
        "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "warnedAt" TIMESTAMP(3),
        "finalWarnedAt" TIMESTAMP(3),
        "storageUsedBytes" BIGINT NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "paymentId" TEXT,
        "signature" TEXT,
        "planId" TEXT NOT NULL,
        "tier" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" TEXT NOT NULL DEFAULT 'created',
        "studentIdUploaded" TEXT,
        "receipt" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
      CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");
      CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paymentId_key" ON "Payment"("paymentId");
    `);
    hasEnsuredTables = true;
    console.log('✅ [Database Migration] Ensured User & Payment tables exist in PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ [Database Migration] Table check note:', err?.message || err);
  }
}

