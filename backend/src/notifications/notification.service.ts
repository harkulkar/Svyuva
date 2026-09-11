import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Notification } from '../models/Notification.js';
import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { User } from '../models/User.js';
import { writeAudit } from '../services/auditService.js';
import { emailService } from '../services/emailService.js';
import { getOperationalSettings } from '../settings/settings.service.js';
import { renderTemplate, extractUnknownVariables, allowedTemplateVariables } from './template.js';
import {
  CRITICAL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPES,
  type NotificationType
} from './types.js';
import type { AuthUser } from '../types/auth.js';

const BATCH = 200;

export type CreateNotificationInput = {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  instituteId?: string | null;
  universityId?: string | null;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  expiresAt?: Date | null;
  announcementId?: string | null;
  reminderKey?: string | null;
  language?: 'en' | 'hi' | 'mr';
  vars?: Record<string, string | number | undefined | null>;
};

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000);
}

export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  const settings = await getOperationalSettings();
  if (!settings.inAppEnabled && !CRITICAL_NOTIFICATION_TYPES.has(input.type)) {
    return false;
  }
  const user = await User.findById(input.recipientUserId).select(
    'role status instituteId universityId notifyInApp notifyEmail email'
  );
  if (!user || user.status === 'INACTIVE') return false;
  const critical = CRITICAL_NOTIFICATION_TYPES.has(input.type);
  if (!critical && user.notifyInApp === false) return false;

  const title = renderTemplate(input.title, input.vars ?? {});
  const message = renderTemplate(input.message, input.vars ?? {});
  try {
    await Notification.create({
      userId: user._id,
      recipientRole: user.role,
      instituteId: input.instituteId || user.instituteId || null,
      universityId: input.universityId || user.universityId || null,
      type: input.type,
      title,
      body: message,
      message,
      priority: input.priority || 'NORMAL',
      status: 'UNREAD',
      relatedEntityType: input.relatedEntityType || '',
      relatedEntityId: input.relatedEntityId || '',
      actionUrl: input.actionUrl || '',
      expiresAt: input.expiresAt || undefined,
      ...(input.announcementId ? { announcementId: input.announcementId } : {}),
      ...(input.reminderKey ? { reminderKey: input.reminderKey } : {}),
      language: input.language || 'en',
      channel: 'IN_APP',
      sentAt: new Date()
    });
  } catch (error) {
    if (isDuplicateKey(error)) return false;
    throw error;
  }

  if (user.notifyEmail !== false || critical) {
    const template = await NotificationTemplate.findOne({
      type: input.type,
      channel: 'EMAIL',
      language: input.language || 'en',
      active: true
    });
    void emailService
      .sendTemplateEmail({
        to: user.email,
        subject: template?.subject || title,
        body: template?.body || message,
        vars: input.vars,
        template: template?.name,
        notificationType: input.type,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId
      })
      .catch(() => undefined);
  }
  return true;
}

export async function notifyAdmins(input: Omit<CreateNotificationInput, 'recipientUserId'>): Promise<number> {
  const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id').limit(200);
  let count = 0;
  for (const admin of admins) {
    const created = await createNotification({ ...input, recipientUserId: String(admin._id) });
    if (created) count += 1;
  }
  return count;
}

export async function notifyInstituteUsers(
  instituteId: string,
  input: Omit<CreateNotificationInput, 'recipientUserId' | 'instituteId'>
): Promise<number> {
  const users = await User.find({ instituteId, role: 'COLLEGE', status: { $in: ['ACTIVE', 'PENDING'] } })
    .select('_id')
    .limit(50);
  let count = 0;
  for (const user of users) {
    const created = await createNotification({ ...input, recipientUserId: String(user._id), instituteId });
    if (created) count += 1;
  }
  return count;
}

export async function listNotifications(
  user: AuthUser,
  query: { page: number; limit: number; type?: string; from?: string; to?: string; unread?: boolean }
) {
  const filter: Record<string, unknown> = { userId: user.id };
  if (query.type && (NOTIFICATION_TYPES as readonly string[]).includes(query.type)) filter.type = query.type;
  if (query.unread) filter.status = 'UNREAD';
  if (query.from || query.to) {
    const createdAt: Record<string, Date> = {};
    if (query.from) createdAt.$gte = new Date(query.from);
    if (query.to) createdAt.$lte = new Date(query.to);
    filter.createdAt = createdAt;
  }
  const skip = (query.page - 1) * query.limit;
  const [total, unreadCount, rows] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: user.id, status: 'UNREAD' }),
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean()
  ]);
  return {
    items: rows.map(toDto),
    unreadCount,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function unreadSummary(user: AuthUser) {
  const [unreadCount, recent] = await Promise.all([
    Notification.countDocuments({ userId: user.id, status: 'UNREAD' }),
    Notification.find({ userId: user.id }).sort({ createdAt: -1 }).limit(5).lean()
  ]);
  return { unreadCount, recent: recent.map(toDto), pollSeconds: 60 };
}

export async function getNotification(user: AuthUser, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Notification not found', 404, 'NOT_FOUND');
  const row = await Notification.findOne({ _id: id, userId: user.id }).lean();
  if (!row) throw new AppError('Notification not found', 404, 'NOT_FOUND');
  return toDto(row);
}

export async function markRead(user: AuthUser, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Notification not found', 404, 'NOT_FOUND');
  const row = await Notification.findOneAndUpdate(
    { _id: id, userId: user.id },
    { $set: { status: 'READ', readAt: new Date() } },
    { new: true }
  );
  if (!row) throw new AppError('Notification not found', 404, 'NOT_FOUND');
  return toDto(row.toObject());
}

export async function markAllRead(user: AuthUser) {
  const result = await Notification.updateMany(
    { userId: user.id, status: 'UNREAD' },
    { $set: { status: 'READ', readAt: new Date() } }
  );
  return { updated: result.modifiedCount };
}

export async function getNotificationPreferences(user: AuthUser) {
  const row = await User.findById(user.id).select('notifyInApp notifyEmail');
  return {
    notifyInApp: row?.notifyInApp !== false,
    notifyEmail: row?.notifyEmail !== false,
    criticalAlwaysOn: [...CRITICAL_NOTIFICATION_TYPES]
  };
}

export async function updateNotificationPreferences(
  user: AuthUser,
  input: { notifyInApp?: boolean; notifyEmail?: boolean },
  req?: Request
) {
  const row = await User.findById(user.id);
  if (!row) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (typeof input.notifyInApp === 'boolean') row.notifyInApp = input.notifyInApp;
  if (typeof input.notifyEmail === 'boolean') row.notifyEmail = input.notifyEmail;
  await row.save();
  await writeAudit({
    userId: user.id,
    action: 'NOTIFICATION_PREFERENCES_CHANGED',
    entity: 'User',
    entityId: user.id,
    req,
    metadata: { notifyInApp: row.notifyInApp, notifyEmail: row.notifyEmail }
  });
  return getNotificationPreferences(user);
}

export async function listTemplates(query: { page: number; limit: number }) {
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    NotificationTemplate.countDocuments(),
    NotificationTemplate.find().sort({ type: 1, language: 1 }).skip(skip).limit(query.limit).lean()
  ]);
  return {
    items: rows.map((row) => ({
      id: String(row._id),
      name: row.name,
      type: row.type,
      channel: row.channel,
      language: row.language,
      subject: row.subject,
      body: row.body,
      variables: row.variables,
      active: row.active,
      updatedAt: row.updatedAt
    })),
    allowedVariables: allowedTemplateVariables(),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function upsertTemplate(
  input: {
    name: string;
    type: NotificationType;
    channel: 'IN_APP' | 'EMAIL';
    language?: 'en' | 'hi' | 'mr';
    subject?: string;
    body: string;
    active?: boolean;
  },
  admin: AuthUser,
  req?: Request
) {
  const unknown = extractUnknownVariables(`${input.subject || ''} ${input.body}`);
  if (unknown.length) {
    throw new AppError(`Unknown template variables: ${unknown.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  const row = await NotificationTemplate.findOneAndUpdate(
    { name: input.name, channel: input.channel, language: input.language || 'en' },
    {
      $set: {
        type: input.type,
        subject: input.subject || '',
        body: input.body,
        variables: allowedTemplateVariables(),
        active: input.active !== false,
        updatedBy: admin.id
      },
      $setOnInsert: { createdBy: admin.id, name: input.name, channel: input.channel, language: input.language || 'en' }
    },
    { upsert: true, new: true }
  );
  await writeAudit({
    userId: admin.id,
    action: 'NOTIFICATION_TEMPLATE_CHANGED',
    entity: 'NotificationTemplate',
    entityId: String(row._id),
    req,
    metadata: { name: input.name, channel: input.channel }
  });
  return row;
}

export async function seedDefaultTemplates(): Promise<void> {
  const defaults: Array<{ name: string; type: NotificationType; channel: 'IN_APP' | 'EMAIL'; subject: string; body: string }> = [
    {
      name: 'account_approved_en',
      type: 'ACCOUNT_APPROVED',
      channel: 'IN_APP',
      subject: 'Account approved',
      body: 'Your institute registration for {{instituteName}} was approved.'
    },
    {
      name: 'account_rejected_en',
      type: 'ACCOUNT_REJECTED',
      channel: 'IN_APP',
      subject: 'Account not approved',
      body: 'Your institute registration for {{instituteName}} was not approved. Status: {{status}}.'
    },
    {
      name: 'student_upload_en',
      type: 'STUDENT_UPLOAD_COMPLETED',
      channel: 'IN_APP',
      subject: 'Student upload completed',
      body: 'Student Excel import finished for {{instituteName}}. Status: {{status}}.'
    },
    {
      name: 'reminder_en',
      type: 'REMINDER',
      channel: 'IN_APP',
      subject: 'Reminder',
      body: 'A reminder requires attention: {{reminderType}} ({{count}}).'
    }
  ];
  for (const item of defaults) {
    await NotificationTemplate.updateOne(
      { name: item.name, channel: item.channel, language: 'en' },
      { $setOnInsert: { ...item, language: 'en', variables: allowedTemplateVariables(), active: true } },
      { upsert: true }
    );
  }
}

function toDto(row: {
  _id: mongoose.Types.ObjectId;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  priority?: string;
  status?: string;
  readAt?: Date | null;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  createdAt?: Date;
  expiresAt?: Date | null;
}) {
  return {
    id: String(row._id),
    type: row.type || '',
    title: row.title || '',
    message: row.message || row.body || '',
    priority: row.priority || 'NORMAL',
    status: row.status || (row.readAt ? 'READ' : 'UNREAD'),
    readAt: row.readAt || null,
    relatedEntityType: row.relatedEntityType || '',
    relatedEntityId: row.relatedEntityId || '',
    actionUrl: row.actionUrl || '',
    createdAt: row.createdAt,
    expiresAt: row.expiresAt || null
  };
}

export { BATCH };
