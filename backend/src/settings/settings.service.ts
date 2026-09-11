import type { Request } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';

const SECRET_KEY = /password|secret|token|key|credential|smtp|mongo/i;

export const SETTING_DEFAULTS = {
  'notifications.inAppEnabled': true,
  'notifications.emailEnabled': false,
  'reminders.pendingRegistrationDays': env.REMINDER_PENDING_REGISTRATION_DAYS,
  'reminders.pendingDocumentDays': env.REMINDER_PENDING_DOCUMENT_DAYS,
  'reminders.paymentDays': env.REMINDER_PAYMENT_DAYS,
  'reminders.reviewDays': env.REMINDER_REVIEW_DAYS,
  'announcements.enabled': true,
  'dashboard.refreshSeconds': env.DASHBOARD_CACHE_SECONDS || 30,
  'maintenance.notificationEnabled': true,
  'workflow.defaultDueDays': 0
} as const;

type SettingKey = keyof typeof SETTING_DEFAULTS;

const ALLOWED_KEYS = new Set<string>(Object.keys(SETTING_DEFAULTS));

export type OperationalSettings = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pendingRegistrationDays: number;
  pendingDocumentDays: number;
  paymentDays: number;
  reviewDays: number;
  announcementsEnabled: boolean;
  dashboardRefreshSeconds: number;
  maintenanceNotificationEnabled: boolean;
  workflowDefaultDueDays: number;
};

function coerce(key: SettingKey, value: unknown): boolean | number {
  const fallback = SETTING_DEFAULTS[key];
  if (typeof fallback === 'boolean') return value === true || value === 'true';
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 3650) return fallback;
  return Math.floor(n);
}

export async function getOperationalSettings(): Promise<OperationalSettings> {
  const rows = await SystemSetting.find({ key: { $in: [...ALLOWED_KEYS] } }).lean();
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const num = (key: SettingKey) => Number(coerce(key, map.get(key) ?? SETTING_DEFAULTS[key]));
  const bool = (key: SettingKey) => Boolean(coerce(key, map.get(key) ?? SETTING_DEFAULTS[key]));
  return {
    inAppEnabled: bool('notifications.inAppEnabled'),
    emailEnabled: bool('notifications.emailEnabled') && env.EMAIL_ENABLED,
    pendingRegistrationDays: num('reminders.pendingRegistrationDays'),
    pendingDocumentDays: num('reminders.pendingDocumentDays'),
    paymentDays: num('reminders.paymentDays'),
    reviewDays: num('reminders.reviewDays'),
    announcementsEnabled: bool('announcements.enabled'),
    dashboardRefreshSeconds: num('dashboard.refreshSeconds'),
    maintenanceNotificationEnabled: bool('maintenance.notificationEnabled'),
    workflowDefaultDueDays: num('workflow.defaultDueDays')
  };
}

export async function listSystemSettings() {
  const current = await getOperationalSettings();
  return {
    items: [
      { key: 'notifications.inAppEnabled', value: current.inAppEnabled, note: 'Non-critical in-app notifications' },
      { key: 'notifications.emailEnabled', value: current.emailEnabled, note: 'Requires SMTP env; never stores secrets' },
      { key: 'reminders.pendingRegistrationDays', value: current.pendingRegistrationDays },
      { key: 'reminders.pendingDocumentDays', value: current.pendingDocumentDays },
      { key: 'reminders.paymentDays', value: current.paymentDays },
      { key: 'reminders.reviewDays', value: current.reviewDays },
      { key: 'announcements.enabled', value: current.announcementsEnabled },
      { key: 'dashboard.refreshSeconds', value: current.dashboardRefreshSeconds },
      { key: 'maintenance.notificationEnabled', value: current.maintenanceNotificationEnabled },
      {
        key: 'workflow.defaultDueDays',
        value: current.workflowDefaultDueDays,
        note: 'Operational due-date offset in days. 0 means unset. Not an official scheme SLA.'
      }
    ],
    pollSeconds: env.NOTIFICATION_POLL_SECONDS,
    secretsNote: 'SMTP, JWT, database, and storage credentials remain environment variables only.'
  };
}

export async function updateSystemSettings(
  patch: Record<string, unknown>,
  admin: AuthUser,
  req?: Request
): Promise<OperationalSettings> {
  const entries = Object.entries(patch);
  if (!entries.length) throw new AppError('No settings to update.', 400, 'VALIDATION_ERROR');
  for (const [key, value] of entries) {
    if (!ALLOWED_KEYS.has(key) || SECRET_KEY.test(key)) {
      throw new AppError('That setting cannot be changed here.', 400, 'VALIDATION_ERROR');
    }
    const typedKey = key as SettingKey;
    const stored = coerce(typedKey, value);
    await SystemSetting.updateOne(
      { key },
      { $set: { key, value: stored, updatedBy: admin.id } },
      { upsert: true }
    );
  }
  await writeAudit({
    userId: admin.id,
    action: 'SYSTEM_SETTINGS_CHANGED',
    entity: 'Setting',
    req,
    metadata: { keys: entries.map(([key]) => key) }
  });
  return getOperationalSettings();
}
