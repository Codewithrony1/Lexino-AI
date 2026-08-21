import crypto from 'crypto';

export function getRazorpayKeyId(): string {
  return (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '').trim();
}

export function getRazorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function getRazorpayWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '').trim();
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
    throw new Error('Razorpay credentials are not properly configured on the server.');
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
    console.error('RAZORPAY_KEY_SECRET is missing during signature verification.');
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature.toLowerCase() === signature.toLowerCase();
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is missing during webhook verification.');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature.toLowerCase() === signatureHeader.toLowerCase();
}
