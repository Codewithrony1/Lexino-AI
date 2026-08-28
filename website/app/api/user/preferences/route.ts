import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureDbTables } from '@/lib/ensureDbTables';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ preferences: {} });
    }

    await ensureDbTables();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    return NextResponse.json({
      success: true,
      preferences: user?.preferences || {},
    });
  } catch (error: any) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const newPreferences = body.preferences || body;

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, preferences: newPreferences });
    }

    await ensureDbTables();

    // Fetch existing preferences to merge cleanly
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPrefs = (existing?.preferences as Record<string, any>) || {};
    const mergedPreferences = {
      ...currentPrefs,
      ...newPreferences,
      updatedAt: new Date().toISOString(),
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: mergedPreferences,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: mergedPreferences,
    });
  } catch (error: any) {
    console.error('Error saving user preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
