import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateUserActivity } from '../../../../lib/activity';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await updateUserActivity(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in user active api:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
