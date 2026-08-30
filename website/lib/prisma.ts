import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  process.env.DATABASE_URL
    ? (globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      }))
    : (null as unknown as PrismaClient);

if (process.env.DATABASE_URL && prisma) {
  globalForPrisma.prisma = prisma;
}
