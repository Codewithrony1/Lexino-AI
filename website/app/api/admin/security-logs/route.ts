import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { getSecurityLogs } from '../../../../lib/adminSecurity';

export async function GET(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const logs = getSecurityLogs();
    return NextResponse.json({ logs });
  } catch (err) {
    console.error('Admin security logs fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
