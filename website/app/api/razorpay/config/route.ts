import { NextResponse } from 'next/server';
import { getRazorpayKeyId } from '../../../../lib/razorpay';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    keyId: getRazorpayKeyId(),
  });
}
