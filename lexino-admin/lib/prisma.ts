import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

export const prisma: PrismaClient | null =
  process.env.DATABASE_URL
    ? (globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      }))
    : null;

if (process.env.DATABASE_URL && prisma) {
  globalForPrisma.prisma = prisma;
}
