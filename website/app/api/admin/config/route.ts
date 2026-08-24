import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '../../../../lib/adminAuth';
import fs from 'fs';
import path from 'path';
import { logAdminAction } from '../../../../lib/adminSecurity';
import { invalidateLaiConfig } from '../../../../lib/laiConfig';

const CONFIG_FILE = path.join(process.cwd(), 'lai-config.json');

const defaultConfig = {
  'timetable-lai': true,
  'predict-lai': false,
  'explore-lais': true
};

export async function GET(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      return NextResponse.json(JSON.parse(raw || '{}'));
    }
  } catch (e) {}
  return NextResponse.json(defaultConfig);
}

export async function POST(request: Request) {
  const authCheck = await verifyAdminAuth();
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config format' }, { status: 400 });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

    // /api/config and /api/chat read this file through a short-lived cache; drop
    // it now so this instance serves the new flags on the very next request.
    invalidateLaiConfig();

    await logAdminAction(authCheck.userId!, 'UPDATE_CONFIG', { config }, request);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin config save error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
