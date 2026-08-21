import { NextResponse } from 'next/server';
import { getRazorpayKeyId } from '../../../../lib/razorpay';

export async function GET() {
  return NextResponse.json({
    keyId: getRazorpayKeyId(),
  });
}
