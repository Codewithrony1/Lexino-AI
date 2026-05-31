import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { logAdminAction } from '../../../../lib/adminSecurity';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (userId) {
      await logAdminAction(userId, 'LOGOUT', {}, request);
    }

    const cookieStore = await cookies();
    cookieStore.set('lexino_admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Immediately delete cookie
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin logout API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
