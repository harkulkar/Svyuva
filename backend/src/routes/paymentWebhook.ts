import { Router } from 'express';
import { razorpayWebhook } from '../payments/payment.controller.js';

/** Public: authenticated by the HMAC signature header, not by a session. */
export const paymentWebhookRouter = Router();
paymentWebhookRouter.post('/razorpay/webhook', razorpayWebhook);
