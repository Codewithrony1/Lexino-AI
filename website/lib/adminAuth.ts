import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export type AdminAuthResult = {
  authorized: boolean;
  userId?: string;
  error?: string;
  status: number;
};

export async function verifyAdminAuth(): Promise<AdminAuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  try {
    // 1. Verify Clerk OWNER role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata?.role;

    if (role !== 'OWNER') {
      return { authorized: false, error: 'Forbidden', status: 403 };
    }

    // 2. Validate session cookie
    const secret = process.env.ADMIN_SECRET_KEY;
    if (!secret) {
      return { authorized: false, error: 'Admin configuration error', status: 500 };
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lexino_admin_session')?.value;

    if (!sessionCookie) {
      return { authorized: false, error: 'Passphrase required', status: 401 };
    }

    const expectedToken = crypto.createHmac('sha256', secret).update(userId).digest('hex');

    if (sessionCookie !== expectedToken) {
      return { authorized: false, error: 'Session invalid or expired', status: 401 };
    }

    // 3. Sliding Session: Refresh cookie expiration for another 30 mins
    cookieStore.set('lexino_admin_session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 30, // 30 mins from now
      path: '/',
    });

    return { authorized: true, userId, status: 200 };
  } catch (err) {
    console.error('Error in verifyAdminAuth:', err);
    return { authorized: false, error: 'Internal Server Error', status: 500 };
  }
}
