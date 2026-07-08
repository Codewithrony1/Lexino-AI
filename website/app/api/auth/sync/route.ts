import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '../../../../lib/prisma';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found in Clerk' }, { status: 404 });
    }

    const email = user.emailAddresses[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User';
    const avatarUrl = user.imageUrl;

    let dbUser: any = null;
    if (process.env.DATABASE_URL) {
      dbUser = await prisma.user.upsert({
        where: { id: userId },
        update: {
          email,
          name,
          avatarUrl,
          lastActiveAt: new Date(),
          warnedAt: null,
          finalWarnedAt: null,
        },
        create: {
          id: userId,
          email,
          name,
          avatarUrl,
          lastActiveAt: new Date(),
        },
      });
    } else {
      console.warn('DATABASE_URL is not set. Running in database-offline mode.');
      dbUser = {
        id: userId,
        email,
        name,
        avatarUrl,
        tier: 'FREE',
        cooldownUntil: null,
        messageCountToday: 0,
        lastMessageAt: null,
      };
    }

    return NextResponse.json({ success: true, user: dbUser });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Failed to sync user database-side' }, { status: 500 });
  }
}
