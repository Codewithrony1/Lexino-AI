import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    let totalClerkUsers = 0;
    let clerkConnected = false;

    // 1. Fetch Real User Count from Clerk
    try {
      const client = await clerkClient();
      totalClerkUsers = await client.users.getCount();
      clerkConnected = true;
    } catch (clerkErr: any) {
      console.warn('⚠️ [Admin Stats] Clerk getCount warning:', clerkErr.message);
    }

    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;
    let studentUsers = 0;
    let proUsers = 0;
    let recentPayments: any[] = [];
    let recentAuditLogs: any[] = [];
    let dbConnected = false;

    // 2. Fetch Aggregated Metrics from Neon PostgreSQL
    if (process.env.DATABASE_URL) {
      try {
        const [
          activeCount,
          expiredCount,
          studentCount,
          proCount,
          payments,
          auditLogs,
        ] = await Promise.all([
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

        activeSubscriptions = activeCount;
        expiredSubscriptions = expiredCount;
        studentUsers = studentCount;
        proUsers = proCount;
        recentPayments = payments;
        recentAuditLogs = auditLogs;
        dbConnected = true;
      } catch (dbErr: any) {
        console.warn('⚠️ [Admin Stats] Neon DB stats warning:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      totalUsers: totalClerkUsers,
      activeSubscriptions,
      expiredSubscriptions,
      studentUsers,
      proUsers,
      recentPayments,
      recentAuditLogs,
      dbConnected,
      clerkConnected,
    });
  } catch (error: any) {
    console.error('❌ [Admin Stats] Route failure:', error);
    return NextResponse.json({
      success: false,
      totalUsers: 0,
      activeSubscriptions: 0,
      expiredSubscriptions: 0,
      studentUsers: 0,
      proUsers: 0,
      recentPayments: [],
      recentAuditLogs: [],
      dbConnected: false,
      clerkConnected: false,
      error: error.message || 'Failed to fetch statistics',
    });
  }
}
