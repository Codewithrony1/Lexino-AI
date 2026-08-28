import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { isLockedOut, recordFailedAttempt, recordSuccessfulLogin } from '../../../../lib/adminSecurity';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Verify Clerk OWNER role
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata?.role;

    if (role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Check brute-force lockout status
    const lockoutStatus = isLockedOut(userId);
    if (lockoutStatus.locked) {
      const remainingMin = Math.ceil(lockoutStatus.remainingMs / 60000);
      return NextResponse.json({
        error: `Temporary block active. Too many failed attempts. Try again in ${remainingMin} minutes.`
      }, { status: 429 });
    }

    // 3. Validate passphrase
    const body = await request.json().catch(() => ({}));
    const passphrase = body.passphrase;
    const secret = process.env.ADMIN_SECRET_KEY;

    if (!secret) {
      return NextResponse.json({ error: 'Admin security not configured' }, { status: 500 });
    }

    let isPassphraseValid = false;
    if (typeof passphrase === 'string') {
      try {
        const a = Buffer.from(passphrase, 'utf8');
        const b = Buffer.from(secret, 'utf8');
        if (a.length === b.length) {
          isPassphraseValid = crypto.timingSafeEqual(a, b);
        }
      } catch (_) {
        isPassphraseValid = false;
      }
    }

    if (!isPassphraseValid) {
      const lockState = await recordFailedAttempt(userId, request);
      const remainingAttempts = Math.max(0, 5 - lockState.count);
      
      let errorMsg = 'Invalid access key.';
      if (remainingAttempts > 0) {
        errorMsg += ` ${remainingAttempts} attempts remaining before temporary lockout.`;
      } else {
        errorMsg += ' You have been locked out for 15 minutes.';
      }
      return NextResponse.json({ error: errorMsg }, { status: 401 });
    }

    // 4. Record successful login and clear rate limit tracking
    await recordSuccessfulLogin(userId, request);

    // 5. Create secure cryptographically signed session hash
    const sessionToken = crypto.createHmac('sha256', secret).update(userId).digest('hex');

    // 6. Set secure HTTPOnly cookie (30 minutes expiration)
    const cookieStore = await cookies();
    cookieStore.set('lexino_admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 30, // 30 minutes inactivity timeout
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin verify API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
