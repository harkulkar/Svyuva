import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Announcement } from '../models/Announcement.js';
import { User } from '../models/User.js';
import { writeAudit } from '../services/auditService.js';
import { createNotification } from './notification.service.js';
import { getOperationalSettings } from '../settings/settings.service.js';
import type { AuthUser } from '../types/auth.js';
import type { AnnouncementAudienceType } from './types.js';

const FANOUT_BATCH = 200;

export type AnnouncementInput = {
  title: string;
  body: string;
  language?: 'en' | 'hi' | 'mr';
  audienceType: AnnouncementAudienceType;
  audienceRole?: 'ADMIN' | 'COLLEGE' | '';
  universityId?: string;
  instituteIds?: string[];
  userIds?: string[];
  publishAt?: string | null;
  expiresAt?: string | null;
  status?: 'DRAFT' | 'SCHEDULED';
};

function oids(ids?: string[]) {
  return (ids || []).filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
}

export async function createAnnouncement(input: AnnouncementInput, admin: AuthUser, req?: Request) {
  validateAudience(input);
  const scheduled = input.status === 'SCHEDULED' || (input.publishAt && new Date(input.publishAt).getTime() > Date.now());
  const row = await Announcement.create({
    title: input.title,
    body: input.body,
    language: input.language || 'en',
    status: scheduled ? 'SCHEDULED' : 'DRAFT',
    audienceType: input.audienceType,
    audienceRole: input.audienceRole || '',
    universityId: input.universityId && mongoose.isValidObjectId(input.universityId) ? input.universityId : null,
    instituteIds: oids(input.instituteIds),
    userIds: oids(input.userIds),
    publishAt: input.publishAt ? new Date(input.publishAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy: admin.id,
    updatedBy: admin.id
  });
  await writeAudit({
    userId: admin.id,
    action: 'ANNOUNCEMENT_CREATED',
    entity: 'Announcement',
    entityId: String(row._id),
    req,
    metadata: { audienceType: input.audienceType, status: row.status }
  });
  return toDto(row);
}

export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>, admin: AuthUser, req?: Request) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const row = await Announcement.findById(id);
  if (!row) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  if (row.status === 'PUBLISHED') {
    throw new AppError('Published announcements cannot be edited. Unpublish first.', 409, 'INVALID_STATUS');
  }
  if (input.title) row.title = input.title;
  if (input.body) row.body = input.body;
  if (input.language) row.language = input.language;
  if (input.audienceType) row.audienceType = input.audienceType;
  if (input.audienceRole !== undefined) row.audienceRole = input.audienceRole || '';
  if (input.universityId !== undefined) {
    row.universityId = input.universityId && mongoose.isValidObjectId(input.universityId) ? new mongoose.Types.ObjectId(input.universityId) : null;
  }
  if (input.instituteIds) row.instituteIds = oids(input.instituteIds);
  if (input.userIds) row.userIds = oids(input.userIds);
  if (input.publishAt !== undefined) row.publishAt = input.publishAt ? new Date(input.publishAt) : null;
  if (input.expiresAt !== undefined) row.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.status === 'SCHEDULED' || input.status === 'DRAFT') row.status = input.status;
  row.updatedBy = new mongoose.Types.ObjectId(admin.id);
  await row.save();
  await writeAudit({
    userId: admin.id,
    action: 'ANNOUNCEMENT_UPDATED',
    entity: 'Announcement',
    entityId: id,
    req,
    metadata: { status: row.status }
  });
  return toDto(row);
}

export async function publishAnnouncement(id: string, admin: AuthUser, req?: Request) {
  const settings = await getOperationalSettings();
  if (!settings.announcementsEnabled) throw new AppError('Announcements are disabled.', 409, 'DISABLED');
  if (!mongoose.isValidObjectId(id)) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const row = await Announcement.findById(id);
  if (!row) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  if (row.publishAt && row.publishAt.getTime() > Date.now()) {
    row.status = 'SCHEDULED';
    row.fanoutStatus = 'IDLE';
    await row.save();
    await writeAudit({
      userId: admin.id,
      action: 'ANNOUNCEMENT_SCHEDULED',
      entity: 'Announcement',
      entityId: id,
      req
    });
    return toDto(row);
  }
  row.status = 'PUBLISHED';
  row.publishAt = row.publishAt || new Date();
  row.fanoutStatus = 'PENDING';
  row.fanoutCursor = null;
  row.updatedBy = new mongoose.Types.ObjectId(admin.id);
  await row.save();
  await writeAudit({
    userId: admin.id,
    action: 'ANNOUNCEMENT_PUBLISHED',
    entity: 'Announcement',
    entityId: id,
    req,
    metadata: { audienceType: row.audienceType }
  });
  await fanoutAnnouncement(String(row._id));
  return toDto(await Announcement.findById(id));
}

export async function unpublishAnnouncement(id: string, admin: AuthUser, req?: Request) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const row = await Announcement.findById(id);
  if (!row) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  row.status = 'UNPUBLISHED';
  row.fanoutStatus = 'IDLE';
  row.updatedBy = new mongoose.Types.ObjectId(admin.id);
  await row.save();
  await writeAudit({
    userId: admin.id,
    action: 'ANNOUNCEMENT_UNPUBLISHED',
    entity: 'Announcement',
    entityId: id,
    req
  });
  return toDto(row);
}

export async function listAnnouncements(query: { page: number; limit: number; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Announcement.countDocuments(filter),
    Announcement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean()
  ]);
  return {
    items: rows.map(toDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function getAnnouncement(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  const row = await Announcement.findById(id);
  if (!row) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
  return toDto(row);
}

export async function processScheduledAnnouncements(): Promise<number> {
  const due = await Announcement.find({
    status: 'SCHEDULED',
    publishAt: { $lte: new Date() }
  }).limit(20);
  let count = 0;
  for (const row of due) {
    row.status = 'PUBLISHED';
    row.fanoutStatus = 'PENDING';
    await row.save();
    await fanoutAnnouncement(String(row._id));
    count += 1;
  }
  return count;
}

export async function fanoutPendingAnnouncements(): Promise<number> {
  const rows = await Announcement.find({ status: 'PUBLISHED', fanoutStatus: 'PENDING' }).limit(5);
  let count = 0;
  for (const row of rows) {
    await fanoutAnnouncement(String(row._id));
    count += 1;
  }
  return count;
}

export async function fanoutAnnouncement(id: string): Promise<{ created: number }> {
  const row = await Announcement.findById(id);
  if (!row || row.status !== 'PUBLISHED') return { created: 0 };
  row.fanoutStatus = 'RUNNING';
  await row.save();
  const filter = audienceFilter(row);
  let created = 0;
  let cursor = row.fanoutCursor;
  try {
    for (;;) {
      const pageFilter: Record<string, unknown> = { ...filter, status: { $in: ['ACTIVE', 'PENDING'] } };
      if (cursor) pageFilter._id = { $gt: cursor };
      const users = await User.find(pageFilter).sort({ _id: 1 }).limit(FANOUT_BATCH).select('_id role instituteId universityId');
      if (!users.length) break;
      for (const user of users) {
        const ok = await createNotification({
          recipientUserId: String(user._id),
          type: 'ANNOUNCEMENT',
          title: row.title,
          message: row.body,
          instituteId: user.instituteId ? String(user.instituteId) : null,
          universityId: user.universityId ? String(user.universityId) : null,
          relatedEntityType: 'Announcement',
          relatedEntityId: String(row._id),
          actionUrl: '/notifications',
          expiresAt: row.expiresAt,
          announcementId: String(row._id),
          language: row.language
        });
        if (ok) created += 1;
      }
      const last = users[users.length - 1];
      if (!last) break;
      cursor = last._id;
      row.fanoutCursor = cursor;
      await row.save();
      if (users.length < FANOUT_BATCH) break;
    }
    row.fanoutStatus = 'DONE';
    await row.save();
  } catch {
    row.fanoutStatus = 'FAILED';
    await row.save();
  }
  return { created };
}

function audienceFilter(row: {
  audienceType: string;
  audienceRole?: string | null;
  universityId?: mongoose.Types.ObjectId | null;
  instituteIds?: mongoose.Types.ObjectId[];
  userIds?: mongoose.Types.ObjectId[];
}): Record<string, unknown> {
  if (row.audienceType === 'ROLE' && row.audienceRole) return { role: row.audienceRole };
  if (row.audienceType === 'UNIVERSITY' && row.universityId) return { universityId: row.universityId };
  if (row.audienceType === 'INSTITUTES' && row.instituteIds?.length) return { instituteId: { $in: row.instituteIds } };
  if (row.audienceType === 'USERS' && row.userIds?.length) return { _id: { $in: row.userIds } };
  return {};
}

function validateAudience(input: AnnouncementInput) {
  if (input.audienceType === 'ROLE' && !input.audienceRole) {
    throw new AppError('Select a role for that audience.', 400, 'VALIDATION_ERROR');
  }
  if (input.audienceType === 'UNIVERSITY' && !input.universityId) {
    throw new AppError('Select a university for that audience.', 400, 'VALIDATION_ERROR');
  }
  if (input.audienceType === 'INSTITUTES' && !input.instituteIds?.length) {
    throw new AppError('Select at least one institute.', 400, 'VALIDATION_ERROR');
  }
  if (input.audienceType === 'USERS' && !input.userIds?.length) {
    throw new AppError('Select at least one user.', 400, 'VALIDATION_ERROR');
  }
}

function toDto(row: {
  _id?: mongoose.Types.ObjectId;
  title?: string;
  body?: string;
  language?: string;
  status?: string;
  audienceType?: string;
  audienceRole?: string;
  universityId?: mongoose.Types.ObjectId | null;
  instituteIds?: mongoose.Types.ObjectId[];
  userIds?: mongoose.Types.ObjectId[];
  publishAt?: Date | null;
  expiresAt?: Date | null;
  fanoutStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
} | null) {
  if (!row?._id) return null;
  return {
    id: String(row._id),
    title: row.title,
    body: row.body,
    language: row.language,
    status: row.status,
    audienceType: row.audienceType,
    audienceRole: row.audienceRole || '',
    universityId: row.universityId ? String(row.universityId) : null,
    instituteIds: (row.instituteIds || []).map((id) => String(id)),
    userIds: (row.userIds || []).map((id) => String(id)),
    publishAt: row.publishAt,
    expiresAt: row.expiresAt,
    fanoutStatus: row.fanoutStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
