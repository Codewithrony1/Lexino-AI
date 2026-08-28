import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        totalUsers: 0,
        activeSubscriptions: 0,
        expiredSubscriptions: 0,
        studentUsers: 0,
        proUsers: 0,
        recentPayments: [],
        recentAuditLogs: [],
      });
    }

    const [
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      studentUsers,
      proUsers,
      recentPayments,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionStatus: 'active', tier: { not: 'FREE' } } }),
      prisma.user.count({ where: { subscriptionStatus: 'expired' } }),
      prisma.user.count({ where: { tier: 'STUDENT', subscriptionStatus: 'active' } }),
      prisma.user.count({ where: { tier: 'PRO', subscriptionStatus: 'active' } }),
      (prisma as any).payment
        ? (prisma as any).payment.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true, name: true } } },
          })
        : [],
      (prisma as any).adminAuditLog
        ? (prisma as any).adminAuditLog.findMany({
            take: 8,
            orderBy: { createdAt: 'desc' },
          })
        : [],
    ]);

    return NextResponse.json({
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      studentUsers,
      proUsers,
      recentPayments,
      recentAuditLogs,
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
