import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Payment } from '../models/Payment.js';
import { UploadJob } from '../models/UploadJob.js';
import { invalidateDashboardCache } from '../analytics/analytics.service.js';
import { notifyAdmins, notifyInstituteUsers } from '../notifications/notification.service.js';
import { writeAudit } from '../services/auditService.js';
import { requireCollegeInstituteId } from '../services/instituteService.js';
import { loadCollegeUploadJob } from '../services/studentService.js';
import type { AuthUser } from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { expectedJobAmountPaise } from './amounts.js';
import { loadGatewayConfig, requireGatewayConfig, type GatewayConfig } from './gatewayConfig.js';
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  type RazorpayPayment
} from './razorpayClient.js';
import { verifyCheckoutSignature, verifyWebhookSignature } from './signatures.js';

const OPEN_STATUSES = ['PENDING', 'CANCELLED', 'FAILED'];
const MIN_AMOUNT_PAISE = 100;

type PaymentRow = InstanceType<typeof Payment>;

export function toPaymentDto(payment: {
  _id: mongoose.Types.ObjectId;
  status?: string | null;
  amount?: number | null;
  amountPaise?: number | null;
  currency?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  method?: string | null;
  paidAt?: Date | null;
  failureReason?: string | null;
  uploadJobId?: mongoose.Types.ObjectId | null;
  insurer?: string | null;
  policyType?: string | null;
}) {
  return {
    id: String(payment._id),
    status: payment.status || 'UNKNOWN',
    amount: payment.amount ?? null,
    amountPaise: payment.amountPaise ?? null,
    currency: payment.currency || 'INR',
    orderId: payment.razorpayOrderId ?? null,
    paymentId: payment.razorpayPaymentId ?? null,
    method: payment.method ?? null,
    paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString() : null,
    failureReason: payment.failureReason ?? null,
    uploadJobId: payment.uploadJobId ? String(payment.uploadJobId) : null,
    insurer: payment.insurer ?? null,
    policyType: payment.policyType ?? null
  };
}

export async function createCollegePaymentOrder(user: AuthUser, input: { jobId: string }, req: Request) {
  const config = await requireGatewayConfig();
  const job = await loadCollegeUploadJob(user, input.jobId);
  if (job.paymentStatus === 'PAID') {
    throw new AppError('Payment for this upload is already complete.', 409, 'ALREADY_PAID');
  }
  if (job.imported) {
    throw new AppError('This file has already been imported.', 409, 'ALREADY_IMPORTED');
  }
  if (job.validCount < 1) {
    throw new AppError('Validate the Excel file and keep at least one valid student before paying.', 400, 'NO_VALID_ROWS');
  }
  const expected = expectedJobAmountPaise(job);
  if (!expected) {
    throw new AppError('Select an insurer and policy type before paying.', 400, 'POLICY_REQUIRED');
  }
  if (expected.amountPaise < MIN_AMOUNT_PAISE) {
    throw new AppError('The premium is below the minimum payable amount.', 400, 'AMOUNT_TOO_LOW');
  }
  const instituteId = requireCollegeInstituteId(user);
  const { quote, amountPaise } = expected;

  let payment = await Payment.findOne({
    uploadJobId: job._id,
    status: 'PENDING',
    gateway: 'razorpay',
    gatewayKeyId: config.keyId,
    amountPaise
  }).sort({ createdAt: -1 });

  if (!payment || !payment.razorpayOrderId) {
    await Payment.updateMany({ uploadJobId: job._id, status: 'PENDING' }, { $set: { status: 'CANCELLED' } });
    const receipt = `svysy_${String(job._id).slice(-12)}_${Date.now().toString(36)}`;
    const order = await createRazorpayOrder(config, {
      amountPaise,
      currency: quote.currency,
      receipt,
      notes: {
        instituteId,
        uploadJobId: String(job._id),
        insurer: quote.insurer,
        policyType: quote.policyType,
        students: String(quote.studentCount)
      }
    });
    payment = await Payment.create({
      instituteId,
      uploadJobId: job._id,
      createdBy: user.id,
      amount: quote.totalPremium,
      amountPaise,
      currency: quote.currency,
      status: 'PENDING',
      gateway: 'razorpay',
      gatewayReference: order.id,
      razorpayOrderId: order.id,
      receipt,
      gatewayMode: config.mode,
      gatewayKeyId: config.keyId,
      insurer: quote.insurer,
      policyType: quote.policyType
    });
    await writeAudit({
      userId: user.id,
      action: 'PAYMENT_ORDER_CREATED',
      entity: 'Payment',
      entityId: String(payment._id),
      req,
      metadata: { orderId: order.id, amountPaise, mode: config.mode, uploadJobId: String(job._id) }
    });
  }

  job.paymentStatus = 'PAYMENT_PENDING';
  job.paymentRequestedAt = new Date();
  await job.save();

  return {
    payment: toPaymentDto(payment),
    checkout: {
      keyId: config.keyId,
      orderId: payment.razorpayOrderId as string,
      amountPaise,
      currency: quote.currency,
      mode: config.mode,
      name: 'SV Yuva Suraksha Yojana',
      description: `${quote.insurerName} - ${quote.policyLabel} (${quote.studentCount} students)`,
      prefill: { name: user.name, email: user.email, contact: user.phone || '' }
    }
  };
}

async function findCollegePayment(user: AuthUser, filter: Record<string, unknown>) {
  const instituteId = requireCollegeInstituteId(user);
  const payment = await Payment.findOne({ ...filter, instituteId });
  if (!payment) throw new AppError('Payment not found.', 404, 'NOT_FOUND');
  return payment;
}

export async function getCollegePayment(user: AuthUser, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Payment not found.', 404, 'NOT_FOUND');
  const payment = await findCollegePayment(user, { _id: id });
  return toPaymentDto(payment);
}

/** Idempotent: unlocks the upload once its payment is verified and the amount matches the current quote. */
async function ensureJobPaid(payment: { uploadJobId?: mongoose.Types.ObjectId | null; amountPaise?: number | null }): Promise<boolean> {
  if (!payment.uploadJobId) return true;
  const job = await UploadJob.findById(payment.uploadJobId);
  if (!job) return false;
  if (job.paymentStatus === 'PAID') return true;
  const expected = expectedJobAmountPaise(job);
  if (!expected || expected.amountPaise !== payment.amountPaise) return false;
  await UploadJob.updateOne({ _id: job._id }, { $set: { paymentStatus: 'PAID' } });
  return true;
}

async function markVerified(payment: PaymentRow, rp: RazorpayPayment, via: string, req?: Request) {
  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: OPEN_STATUSES } },
    {
      $set: {
        status: 'VERIFIED',
        paidAt: new Date(),
        razorpayPaymentId: rp.id,
        method: rp.method ?? null,
        failureReason: null,
        verificationInfo: `Verified via ${via}`
      }
    },
    { new: true }
  );
  if (!updated) return payment;

  const jobMarked = await ensureJobPaid(updated);
  if (!jobMarked) {
    await Payment.updateOne(
      { _id: updated._id },
      { $set: { verificationInfo: `Verified via ${via}; amount differs from the current quote - manual review required` } }
    );
    try {
      await notifyAdmins({
        type: 'PAYMENT_PENDING',
        title: 'Payment needs manual review',
        message: 'A captured payment does not match the current premium quote for its upload.',
        relatedEntityType: 'Payment',
        relatedEntityId: String(updated._id),
        actionUrl: '/admin/payments'
      });
    } catch (error) {
      logger.error('payment_admin_notify_failed', { message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // The payment is already recorded; follow-up bookkeeping must never turn a successful payment into an error.
  try {
    await writeAudit({
      userId: null,
      action: 'PAYMENT_VERIFIED',
      entity: 'Payment',
      entityId: String(updated._id),
      req,
      metadata: { via, orderId: updated.razorpayOrderId, paymentId: rp.id, amountPaise: updated.amountPaise, jobMarked }
    });
    if (updated.instituteId) {
      await notifyInstituteUsers(String(updated.instituteId), {
        type: 'PAYMENT_VERIFIED',
        title: 'Payment received',
        message: 'Your premium payment was received. You can now import the validated students.',
        relatedEntityType: 'Payment',
        relatedEntityId: String(updated._id),
        actionUrl: '/college/students/upload'
      });
    }
  } catch (error) {
    logger.error('payment_post_verify_failed', {
      paymentId: String(updated._id),
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  invalidateDashboardCache();
  return updated;
}

async function settleFromGateway(payment: PaymentRow, rp: RazorpayPayment, config: GatewayConfig, via: string, req?: Request) {
  if (rp.order_id !== payment.razorpayOrderId) {
    throw new AppError('This payment does not belong to the order.', 400, 'ORDER_MISMATCH');
  }
  let current = rp;
  if (current.status === 'authorized') {
    current = await captureRazorpayPayment(config, current.id, payment.amountPaise ?? 0, payment.currency || 'INR');
  }
  if (current.status === 'captured') {
    if (current.amount !== payment.amountPaise || current.currency !== (payment.currency || 'INR')) {
      await writeAudit({
        userId: null,
        action: 'PAYMENT_AMOUNT_MISMATCH',
        entity: 'Payment',
        entityId: String(payment._id),
        req,
        metadata: { expected: payment.amountPaise, received: current.amount, paymentId: current.id }
      });
      throw new AppError('The paid amount does not match the order.', 400, 'AMOUNT_MISMATCH');
    }
    return markVerified(payment, current, via, req);
  }
  if (current.status === 'failed') {
    await Payment.updateOne(
      { _id: payment._id, status: 'PENDING' },
      { $set: { failureReason: current.error_description || current.error_code || 'Payment failed' } }
    );
  }
  return (await Payment.findById(payment._id)) ?? payment;
}

export async function verifyCollegePayment(
  user: AuthUser,
  input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  req: Request
) {
  const payment = await findCollegePayment(user, { razorpayOrderId: input.razorpay_order_id });
  if (payment.status === 'VERIFIED') {
    await ensureJobPaid(payment);
    return toPaymentDto(payment);
  }

  const config = await loadGatewayConfig();
  if (!config) throw new AppError('Online payment is not available right now.', 503, 'PAYMENT_UNAVAILABLE');
  if (!verifyCheckoutSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature, config.keySecret)) {
    await writeAudit({
      userId: user.id,
      action: 'PAYMENT_SIGNATURE_INVALID',
      entity: 'Payment',
      entityId: String(payment._id),
      req,
      metadata: { orderId: input.razorpay_order_id }
    });
    throw new AppError('The payment could not be verified.', 400, 'INVALID_SIGNATURE');
  }
  const rp = await fetchRazorpayPayment(config, input.razorpay_payment_id);
  const settled = await settleFromGateway(payment, rp, config, 'checkout', req);
  return toPaymentDto(settled);
}

type WebhookBody = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: { id?: string } };
    refund?: { entity?: { amount?: number; payment_id?: string } };
  };
};

export async function handleRazorpayWebhook(rawBody: Buffer | undefined, signature: string | undefined, eventId: string | undefined) {
  const config = await loadGatewayConfig();
  if (!config?.webhookSecret) {
    throw new AppError('Webhook is not configured.', 503, 'WEBHOOK_NOT_CONFIGURED');
  }
  if (!rawBody || !signature || !verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
    throw new AppError('Invalid webhook signature.', 400, 'INVALID_SIGNATURE');
  }
  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody.toString('utf8')) as WebhookBody;
  } catch {
    throw new AppError('Invalid webhook body.', 400, 'VALIDATION_ERROR');
  }
  const event = body.event || '';
  const paymentEntity = body.payload?.payment?.entity;
  const refundEntity = body.payload?.refund?.entity;
  const orderId = paymentEntity?.order_id || body.payload?.order?.entity?.id || null;
  const payment = orderId
    ? await Payment.findOne({ razorpayOrderId: orderId })
    : refundEntity?.payment_id
      ? await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id })
      : null;
  if (!payment) return { handled: false, reason: 'unknown_order' };
  if (eventId && payment.processedEventIds.includes(eventId)) return { handled: false, reason: 'duplicate' };

  if ((event === 'payment.captured' || event === 'order.paid' || event === 'payment.authorized') && paymentEntity) {
    try {
      await settleFromGateway(payment, paymentEntity, config, 'webhook');
    } catch (error) {
      // A mismatch is already audited; retrying the same delivery cannot fix it.
      if (error instanceof AppError && (error.code === 'AMOUNT_MISMATCH' || error.code === 'ORDER_MISMATCH')) {
        return { handled: false, reason: 'mismatch' };
      }
      throw error;
    }
  } else if (event === 'payment.failed' && paymentEntity) {
    await Payment.updateOne(
      { _id: payment._id, status: 'PENDING' },
      { $set: { failureReason: paymentEntity.error_description || paymentEntity.error_code || 'Payment failed' } }
    );
  } else if (event === 'refund.processed' && refundEntity) {
    const full = refundEntity.amount != null && refundEntity.amount >= (payment.amountPaise ?? Number.MAX_SAFE_INTEGER);
    await Payment.updateOne(
      { _id: payment._id },
      full
        ? { $set: { status: 'REFUNDED', verificationInfo: 'Refunded in full' } }
        : { $set: { verificationInfo: `Partially refunded (${refundEntity.amount ?? 0} paise)` } }
    );
    if (full && payment.uploadJobId) {
      await UploadJob.updateOne({ _id: payment.uploadJobId }, { $set: { paymentStatus: 'REFUNDED' } });
    }
    await writeAudit({
      userId: null,
      action: 'PAYMENT_REFUND_RECORDED',
      entity: 'Payment',
      entityId: String(payment._id),
      metadata: { full, amountPaise: refundEntity.amount ?? null }
    });
    invalidateDashboardCache();
  } else {
    return { handled: false, reason: 'ignored_event' };
  }

  if (eventId) {
    await Payment.updateOne({ _id: payment._id }, { $push: { processedEventIds: { $each: [eventId], $slice: -50 } } });
  }
  return { handled: true };
}

/** Safety net for lost webhooks / closed browser tabs: re-check recent pending orders. */
export async function reconcilePendingPayments(): Promise<{ checked: number; updated: number }> {
  const config = await loadGatewayConfig();
  if (!config) return { checked: 0, updated: 0 };
  const rows = await Payment.find({
    gateway: 'razorpay',
    status: 'PENDING',
    gatewayKeyId: config.keyId,
    createdAt: { $gte: new Date(Date.now() - 7 * 86400000), $lte: new Date(Date.now() - 10 * 60 * 1000) }
  }).limit(50);
  let updated = 0;
  for (const row of rows) {
    try {
      const items = await fetchRazorpayOrderPayments(config, row.razorpayOrderId as string);
      const hit = items.find((item) => item.status === 'captured') ?? items.find((item) => item.status === 'authorized');
      if (hit) {
        const settled = await settleFromGateway(row, hit, config, 'reconciliation');
        if (settled.status === 'VERIFIED') updated += 1;
      }
    } catch (error) {
      logger.error('payment_reconcile_failed', {
        paymentId: String(row._id),
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  return { checked: rows.length, updated };
}
