import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');
const merchantId = z
  .string()
  .trim()
  .max(60)
  .regex(/^[A-Za-z0-9_-]*$/, 'Merchant ID may only contain letters, numbers, - and _.');

export const razorpayKeyIdSchema = z
  .string()
  .trim()
  .regex(/^rzp_(test|live)_[A-Za-z0-9]{8,}$/, 'Enter a valid Razorpay Key ID (it starts with rzp_test_ or rzp_live_).');

export const gatewayConfigSchema = z
  .object({
    keyId: razorpayKeyIdSchema,
    keySecret: z.string().trim().max(200).optional(),
    webhookSecret: z.string().trim().max(200).optional(),
    mid: merchantId.optional(),
    pfMid: merchantId.optional(),
    enabled: z.boolean(),
    currentPassword: z.string().min(1, 'Enter your password to confirm.').max(200)
  })
  .strict();

export const gatewayClearSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your password to confirm.').max(200) })
  .strict();

export const createPaymentOrderSchema = z.object({ jobId: objectId }).strict();

export const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/, 'Invalid order'),
    razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/, 'Invalid payment'),
    razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Invalid signature')
  })
  // Checkout may add extra keys to its success payload; unknown keys are dropped, not rejected.
  .strip();
