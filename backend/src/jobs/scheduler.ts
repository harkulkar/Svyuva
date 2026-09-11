import { env, isTest } from '../config/env.js';
import mongoose from 'mongoose';
import { JobRun } from '../models/JobRun.js';
import { Notification } from '../models/Notification.js';
import { Document } from '../models/Document.js';
import { Institute } from '../models/Institute.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { emailService } from '../services/emailService.js';
import { writeAudit } from '../services/auditService.js';
import { logger } from '../utils/logger.js';
import { getOperationalSettings } from '../settings/settings.service.js';
import { notifyAdmins, notifyInstituteUsers } from '../notifications/notification.service.js';
import { fanoutPendingAnnouncements, processScheduledAnnouncements } from '../notifications/announcement.service.js';
import { utcDateKey } from '../analytics/dateRange.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthUser } from '../types/auth.js';
import type { Request } from 'express';

export const JOB_DEFINITIONS = [
  { name: 'process_scheduled_announcements', retryable: true, intervalMs: env.JOB_TICK_MS },
  { name: 'fanout_announcements', retryable: true, intervalMs: env.JOB_TICK_MS },
  { name: 'send_pending_reminders', retryable: true, intervalMs: env.JOB_TICK_MS },
  { name: 'process_email_queue', retryable: true, intervalMs: env.JOB_TICK_MS },
  { name: 'cleanup_expired_notifications', retryable: true, intervalMs: env.JOB_TICK_MS }
] as const;

export type JobName = (typeof JOB_DEFINITIONS)[number]['name'];

const LOCK_MS = 5 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;

export function jobsEnabled(): boolean {
  return env.JOBS_ENABLED && !isTest && !process.env.NODE_TEST_CONTEXT;
}

export async function ensureJobRows(): Promise<void> {
  const now = Date.now();
  for (const job of JOB_DEFINITIONS) {
    await JobRun.updateOne(
      { name: job.name },
      {
        $setOnInsert: {
          name: job.name,
          status: 'idle',
          successCount: 0,
          failureCount: 0,
          retryable: job.retryable,
          nextRunAt: new Date(now + job.intervalMs)
        }
      },
      { upsert: true }
    );
  }
}

export async function runJob(name: JobName): Promise<{ name: string; status: string; durationMs: number; skipped?: boolean }> {
  const def = JOB_DEFINITIONS.find((job) => job.name === name);
  if (!def) throw new AppError('Unknown job.', 404, 'NOT_FOUND');
  const now = new Date();
  const locked = await JobRun.findOneAndUpdate(
    {
      name,
      $or: [{ status: { $ne: 'running' } }, { lockUntil: { $lte: now } }, { lockUntil: null }]
    },
    { $set: { status: 'running', lockUntil: new Date(now.getTime() + LOCK_MS) } },
    { new: true, upsert: true }
  );
  if (!locked) {
    return { name, status: 'skipped', durationMs: 0, skipped: true };
  }
  const started = Date.now();
  try {
    await execute(name);
    const durationMs = Date.now() - started;
    await JobRun.updateOne(
      { name },
      {
        $set: {
          status: 'success',
          lastRunAt: new Date(),
          lastDurationMs: durationMs,
          lastError: '',
          lastRunKey: `${name}:${utcDateKey()}`,
          nextRunAt: new Date(Date.now() + def.intervalMs),
          lockUntil: null
        },
        $inc: { successCount: 1 }
      }
    );
    return { name, status: 'success', durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : 'Job failed';
    await JobRun.updateOne(
      { name },
      {
        $set: {
          status: 'failed',
          lastRunAt: new Date(),
          lastDurationMs: durationMs,
          lastError: message.slice(0, 500),
          nextRunAt: new Date(Date.now() + def.intervalMs),
          lockUntil: null
        },
        $inc: { failureCount: 1 }
      }
    );
    logger.error('job_failed', { name, message });
    return { name, status: 'failed', durationMs };
  }
}

async function execute(name: JobName): Promise<void> {
  if (name === 'process_scheduled_announcements') {
    await processScheduledAnnouncements();
    return;
  }
  if (name === 'fanout_announcements') {
    await fanoutPendingAnnouncements();
    return;
  }
  if (name === 'send_pending_reminders') {
    await sendPendingReminders();
    return;
  }
  if (name === 'process_email_queue') {
    await emailService.retryFailed(25);
    return;
  }
  if (name === 'cleanup_expired_notifications') {
    await Notification.deleteMany({ expiresAt: { $ne: null, $lte: new Date() } });
  }
}

export async function sendPendingReminders(): Promise<{ created: number }> {
  const settings = await getOperationalSettings();
  const day = utcDateKey();
  let created = 0;
  const pendingSince = new Date(Date.now() - settings.pendingRegistrationDays * 86400000);
  const pending = await Institute.find({ status: 'PENDING', createdAt: { $lte: pendingSince } })
    .select('_id name')
    .limit(50);
  for (const row of pending) {
    const n = await notifyAdmins({
      type: 'REMINDER',
      title: 'Pending college registration',
      message: 'Institute {{instituteName}} is still pending approval.',
      relatedEntityType: 'Institute',
      relatedEntityId: String(row._id),
      actionUrl: `/admin/institutes/${row._id}`,
      reminderKey: `pending-reg:${row._id}:${day}`,
      vars: { instituteName: row.name, reminderType: 'pending_registration', count: 1 }
    });
    created += n;
  }

  const docSince = new Date(Date.now() - settings.pendingDocumentDays * 86400000);
  const incomplete = await Document.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        instituteId: { $ne: null },
        updatedAt: { $lte: docSince },
        fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'] }
      }
    },
    { $group: { _id: '$instituteId', count: { $sum: 1 } } },
    { $limit: 50 }
  ]);
  for (const row of incomplete) {
    const n = await notifyInstituteUsers(String(row._id), {
      type: 'REMINDER',
      title: 'Documents still incomplete',
      message: '{{count}} document record(s) remain incomplete.',
      relatedEntityType: 'Institute',
      relatedEntityId: String(row._id),
      actionUrl: '/college/documents',
      reminderKey: `pending-docs:${row._id}:${day}`,
      vars: { count: row.count, reminderType: 'pending_documents' }
    });
    created += n;
  }

  const paySince = new Date(Date.now() - settings.paymentDays * 86400000);
  const pendingPay = await Payment.countDocuments({
    status: { $regex: /pending|verification/i },
    updatedAt: { $lte: paySince }
  });
  if (pendingPay > 0) {
    created += await notifyAdmins({
      type: 'REMINDER',
      title: 'Payment verification pending',
      message: '{{count}} payment record(s) still show a pending/verification status.',
      relatedEntityType: 'Payment',
      actionUrl: '/admin/reports',
      reminderKey: `pending-pay:${day}`,
      vars: { count: pendingPay, reminderType: 'pending_payment' }
    });
  }

  const reviewSince = new Date(Date.now() - settings.reviewDays * 86400000);
  const pendingInsurance = await InsuranceEnrollment.countDocuments({
    status: { $regex: /pending|review|submitted/i },
    updatedAt: { $lte: reviewSince }
  });
  if (pendingInsurance > 0) {
    created += await notifyAdmins({
      type: 'REVIEW_REQUIRED',
      title: 'Insurance records awaiting review',
      message: '{{count}} insurance record(s) still show a pending/review/submitted status.',
      relatedEntityType: 'InsuranceEnrollment',
      actionUrl: '/admin/reports',
      reminderKey: `pending-ins:${day}`,
      vars: { count: pendingInsurance, reminderType: 'pending_review' }
    });
  }
  const pendingReviews = await Review.countDocuments({
    status: { $regex: /pending|review/i },
    updatedAt: { $lte: reviewSince }
  });
  if (pendingReviews > 0) {
    created += await notifyAdmins({
      type: 'REVIEW_REQUIRED',
      title: 'Reviews awaiting action',
      message: '{{count}} review record(s) still show a pending status.',
      relatedEntityType: 'Review',
      actionUrl: '/admin/reports',
      reminderKey: `pending-rev:${day}`,
      vars: { count: pendingReviews, reminderType: 'pending_review' }
    });
  }
  return { created };
}

export async function listJobs() {
  await ensureJobRows();
  const rows = await JobRun.find({ name: { $in: JOB_DEFINITIONS.map((job) => job.name) } }).sort({ name: 1 }).lean();
  return rows.map((row) => ({
    name: row.name,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
    status: row.status,
    successCount: row.successCount,
    failureCount: row.failureCount,
    lastError: row.lastError,
    lastDurationMs: row.lastDurationMs,
    retryable: row.retryable !== false
  }));
}

export async function retryJob(name: string, admin: AuthUser, req?: Request) {
  const def = JOB_DEFINITIONS.find((job) => job.name === name);
  if (!def || !def.retryable) throw new AppError('That job cannot be retried.', 400, 'VALIDATION_ERROR');
  await writeAudit({
    userId: admin.id,
    action: 'JOB_RETRY',
    entity: 'JobRun',
    entityId: name,
    req
  });
  return runJob(def.name);
}

export async function tickJobs(): Promise<void> {
  for (const job of JOB_DEFINITIONS) {
    const row = await JobRun.findOne({ name: job.name });
    if (row?.status === 'running' && row.lockUntil && row.lockUntil > new Date()) continue;
    if (row?.nextRunAt && row.nextRunAt > new Date()) continue;
    await runJob(job.name);
  }
}

export function startScheduler(): void {
  if (!jobsEnabled() || timer) return;
  void ensureJobRows()
    .then(() => tickJobs())
    .catch((error) => logger.error('job_start_failed', { message: error instanceof Error ? error.message : 'start failed' }));
  timer = setInterval(() => {
    void tickJobs().catch((error) =>
      logger.error('job_tick_failed', { message: error instanceof Error ? error.message : 'tick failed' })
    );
  }, env.JOB_TICK_MS);
  timer.unref?.();
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
