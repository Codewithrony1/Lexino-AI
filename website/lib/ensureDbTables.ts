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
        "subscriptionStatus" TEXT DEFAULT 'inactive',
        "subscriptionStartedAt" TIMESTAMP(3),
        "subscriptionExpiresAt" TIMESTAMP(3),
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

      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'inactive';
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStartedAt" TIMESTAMP(3);
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);

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
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

      CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "adminUserId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "targetUserId" TEXT NOT NULL,
        "targetEmail" TEXT,
        "oldPlan" TEXT,
        "newPlan" TEXT,
        "oldStatus" TEXT,
        "newStatus" TEXT,
        "oldExpiresAt" TIMESTAMP(3),
        "newExpiresAt" TIMESTAMP(3),
        "reason" TEXT,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");
      CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");
      CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
    `);
    hasEnsuredTables = true;
    console.log('✅ [Database Migration] Ensured User, Payment & AdminAuditLog tables exist in PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ [Database Migration] Table check note:', err?.message || err);
  }
}

