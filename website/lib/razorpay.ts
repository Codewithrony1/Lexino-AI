import crypto from 'crypto';

export function getRazorpayKeyId(): string {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
    ''
  ).trim();
}

export function getRazorpayKeySecret(): string {
  return (
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_SECRET ||
    process.env.RAZORPAY_API_SECRET ||
    ''
  ).trim();
}

export function getRazorpayWebhookSecret(): string {
  return (
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_SECRET ||
    ''
  ).trim();
}

export interface CreateOrderParams {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResponse> {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials (Key ID or Key Secret) are not properly configured in environment variables.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const payload = {
    amount: params.amount,
    currency: params.currency || 'INR',
    receipt: params.receipt || `rcpt_${Date.now()}`,
    notes: params.notes || {},
    payment_capture: 1,
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Razorpay Order creation failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    console.error('❌ [Razorpay] RAZORPAY_KEY_SECRET is missing during signature verification.');
    return false;
  }

  if (!orderId || !paymentId || !signature) {
    console.error('❌ [Razorpay] Missing parameter in verifyPaymentSignature:', { orderId, paymentId, hasSignature: !!signature });
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const matches = generatedSignature.toLowerCase() === signature.toLowerCase();
  if (!matches) {
    console.error(`❌ [Razorpay] Signature mismatch! Generated: ${generatedSignature}, Received: ${signature}`);
  } else {
    console.log(`✅ [Razorpay] Payment signature verified successfully for order: ${orderId}, payment: ${paymentId}`);
  }

  return matches;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret) {
    console.error('❌ [Razorpay] RAZORPAY_WEBHOOK_SECRET is missing during webhook verification.');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const matches = expectedSignature.toLowerCase() === signatureHeader.toLowerCase();
  if (!matches) {
    console.error(`❌ [Razorpay Webhook] Signature mismatch! Expected: ${expectedSignature}, Received: ${signatureHeader}`);
  }

  return matches;
}
