import { z } from 'zod';
import { DATE_RANGE_KEYS } from '../analytics/dateRange.js';
import { NOTIFICATION_TYPES } from './types.js';
import { REPORT_CATEGORIES } from '../reports/report.service.js';
import { paginationQuery } from '../validators/adminValidators.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const analyticsQuerySchema = z.object({
  range: z.enum(DATE_RANGE_KEYS).optional(),
  from: z.string().min(8).max(40).optional(),
  to: z.string().min(8).max(40).optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  status: z.string().trim().max(40).optional()
});

export const notificationListQuerySchema = z.object({
  ...paginationQuery,
  type: z.enum(NOTIFICATION_TYPES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  unread: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1')
});

export const notificationPrefsSchema = z
  .object({
    notifyInApp: z.boolean().optional(),
    notifyEmail: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const announcementCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(3).max(8000),
    language: z.enum(['en', 'hi', 'mr']).optional(),
    audienceType: z.enum(['ALL', 'ROLE', 'UNIVERSITY', 'INSTITUTES', 'USERS']),
    audienceRole: z.enum(['ADMIN', 'COLLEGE']).optional(),
    universityId: objectId.optional(),
    instituteIds: z.array(objectId).max(200).optional(),
    userIds: z.array(objectId).max(200).optional(),
    publishAt: z.string().min(8).max(40).optional().nullable(),
    expiresAt: z.string().min(8).max(40).optional().nullable(),
    status: z.enum(['DRAFT', 'SCHEDULED']).optional()
  })
  .strict();

export const announcementUpdateSchema = announcementCreateSchema.partial();

export const templateUpsertSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(NOTIFICATION_TYPES),
    channel: z.enum(['IN_APP', 'EMAIL']),
    language: z.enum(['en', 'hi', 'mr']).optional(),
    subject: z.string().trim().max(200).optional(),
    body: z.string().trim().min(1).max(8000),
    active: z.boolean().optional()
  })
  .strict();

export const reportQuerySchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  format: z.enum(['csv', 'xlsx']).optional(),
  range: z.enum(DATE_RANGE_KEYS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  status: z.string().trim().max(40).optional(),
  district: z.string().trim().max(80).optional()
});

export const settingsPatchSchema = z
  .object({
    'notifications.inAppEnabled': z.boolean().optional(),
    'notifications.emailEnabled': z.boolean().optional(),
    'reminders.pendingRegistrationDays': z.number().int().positive().max(365).optional(),
    'reminders.pendingDocumentDays': z.number().int().positive().max(365).optional(),
    'reminders.paymentDays': z.number().int().positive().max(365).optional(),
    'reminders.reviewDays': z.number().int().positive().max(365).optional(),
    'announcements.enabled': z.boolean().optional(),
    'dashboard.refreshSeconds': z.number().int().min(0).max(600).optional(),
    'maintenance.notificationEnabled': z.boolean().optional(),
    'workflow.defaultDueDays': z.number().int().min(0).max(365).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No settings to update');

export const jobRetrySchema = z.object({ name: z.string().trim().min(3).max(80) }).strict();

export const timelineQuerySchema = z.object({
  entity: z.enum(['Institute', 'Student', 'InsuranceEnrollment', 'Document', 'Payment', 'ECard', 'User', 'UploadJob']),
  entityId: z.string().trim().min(1).max(80)
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type AnnouncementCreateInput = z.infer<typeof announcementCreateSchema>;
