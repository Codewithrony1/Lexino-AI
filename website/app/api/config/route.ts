import { NextResponse } from 'next/server';
import { getLaiConfig } from '../../../lib/laiConfig';

export async function GET() {
  const config = await getLaiConfig();
  return NextResponse.json(config);
}
