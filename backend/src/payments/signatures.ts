import { createHmac, timingSafeEqual } from 'node:crypto';

function hmacHex(secret: string, data: string | Buffer): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Razorpay Checkout: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  return safeEqualHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Razorpay webhook: HMAC_SHA256(raw request body, webhook_secret). */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret: string): boolean {
  if (!rawBody?.length || !signature || !webhookSecret) return false;
  return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
}

export function signCheckout(orderId: string, paymentId: string, keySecret: string): string {
  return hmacHex(keySecret, `${orderId}|${paymentId}`);
}

export function signWebhook(rawBody: Buffer | string, webhookSecret: string): string {
  return hmacHex(webhookSecret, rawBody);
}
