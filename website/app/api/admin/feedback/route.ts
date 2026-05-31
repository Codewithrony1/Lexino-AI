import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import { getFeedbacksFromStore } from '../../feedback/route';

export async function GET(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const feedbacks = getFeedbacksFromStore();
    return NextResponse.json({ feedbacks });
  } catch (err) {
    console.error('Admin feedback fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
