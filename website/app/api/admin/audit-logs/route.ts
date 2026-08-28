import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';
import { getSecurityLogs } from '../../../../lib/adminSecurity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const targetUserId = searchParams.get('targetUserId');

  try {
    if (process.env.DATABASE_URL) {
      const { ensureDbTables } = await import('@/lib/ensureDbTables');
      await ensureDbTables();

      if ((prisma as any)?.adminAuditLog) {
        const whereClause: any = {};
        if (targetUserId) {
          whereClause.targetUserId = targetUserId;
        }

        const logs = await (prisma as any).adminAuditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return NextResponse.json({
          success: true,
          logs: logs.map((log: any) => ({
            id: log.id,
            adminUserId: log.adminUserId,
            action: log.action,
            targetUserId: log.targetUserId,
            targetEmail: log.targetEmail,
            oldPlan: log.oldPlan,
            newPlan: log.newPlan,
            oldStatus: log.oldStatus,
            newStatus: log.newStatus,
            oldExpiresAt: log.oldExpiresAt ? log.oldExpiresAt.toISOString() : null,
            newExpiresAt: log.newExpiresAt ? log.newExpiresAt.toISOString() : null,
            reason: log.reason,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            metadata: log.metadata,
            createdAt: log.createdAt.toISOString(),
          })),
        });
      }
    }

    // Fallback to local security logs
    const localLogs = getSecurityLogs().slice(0, limit);
    return NextResponse.json({
      success: true,
      logs: localLogs,
    });
  } catch (err) {
    console.error('Error fetching admin audit logs:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
