import { prisma } from './prisma';

let hasEnsuredTables = false;

export async function ensureDbTables(): Promise<void> {
  if (hasEnsuredTables || !process.env.DATABASE_URL) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL UNIQUE,
        "paymentId" TEXT UNIQUE,
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
    `);
    hasEnsuredTables = true;
    console.log('✅ [Database Migration] Ensured Payment table exists in PostgreSQL.');
  } catch (err: any) {
    console.warn('⚠️ [Database Migration] Table check note:', err?.message || err);
  }
}
