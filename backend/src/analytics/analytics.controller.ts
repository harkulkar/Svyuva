import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import { getAdminActivity, getAdminAnalytics, getAdminDashboardSummary, getCollegeAnalytics, getEntityTimeline } from './analytics.service.js';
import { getDashboardInsights } from './insights.service.js';
import { listSystemSettings, updateSystemSettings } from '../settings/settings.service.js';
import { listJobs, retryJob } from '../jobs/scheduler.js';
import { exportReport, previewReport, sendReportFile, type ReportCategory } from '../reports/report.service.js';
import {
  createAnnouncement,
  getAnnouncement,
  listAnnouncements,
  publishAnnouncement,
  unpublishAnnouncement,
  updateAnnouncement
} from '../notifications/announcement.service.js';
import { listTemplates, seedDefaultTemplates, upsertTemplate } from '../notifications/notification.service.js';
import { requireCollegeInstituteId } from '../services/instituteService.js';
import type { NotificationType } from '../notifications/types.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function adminDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok(await getAdminDashboardSummary(), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok(await getAdminAnalytics(req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminDashboardActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok({ items: await getAdminActivity() }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminDashboardInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok(await getDashboardInsights(user), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const instituteId = requireCollegeInstituteId(user);
    res.json(ok(await getCollegeAnalytics(instituteId, req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeDashboardInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    requireCollegeInstituteId(user);
    res.json(ok(await getDashboardInsights(user), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function timelineHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const path = `${req.baseUrl}${req.path}`;
    const entity =
      String(req.query.entity || '') ||
      (path.includes('/students/') ? 'Student' : path.includes('/institutes/') ? 'Institute' : '');
    const entityId = String(req.params.id || req.query.entityId || '');
    const instituteId = user.role === 'COLLEGE' ? requireCollegeInstituteId(user) : undefined;
    res.json(ok({ items: await getEntityTimeline(entity, entityId, instituteId) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSettingsList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok(await listSystemSettings(), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSettingsPatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    res.json(ok(await updateSystemSettings(req.body, admin, req), 'Settings updated'));
  } catch (error) {
    next(error);
  }
}

export async function adminJobsList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok({ items: await listJobs() }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminJobRetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    const result = await retryJob(String(req.body.name || req.params.name), admin, req);
    res.json(ok(result, 'Job retried'));
  } catch (error) {
    next(error);
  }
}

export async function adminReportPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(ok(await previewReport(user, { ...req.query, category: String(req.query.category) as ReportCategory }), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminReportExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    const file = await exportReport(user, { ...req.query, category: String(req.query.category) as ReportCategory }, req);
    sendReportFile(res, file);
  } catch (error) {
    next(error);
  }
}

export async function collegeReportPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    requireCollegeInstituteId(user);
    res.json(ok(await previewReport(user, { ...req.query, category: String(req.query.category) as ReportCategory }), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeReportExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    requireCollegeInstituteId(user);
    const file = await exportReport(user, { ...req.query, category: String(req.query.category) as ReportCategory }, req);
    sendReportFile(res, file);
  } catch (error) {
    next(error);
  }
}

export async function announcementsList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    res.json(ok(await listAnnouncements({ page, limit, status: req.query.status as string | undefined }), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function announcementCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    res.status(201).json(ok({ announcement: await createAnnouncement(req.body, admin, req) }, 'Announcement created'));
  } catch (error) {
    next(error);
  }
}

export async function announcementDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    res.json(ok({ announcement: await getAnnouncement(String(req.params.id)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function announcementPatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    res.json(ok({ announcement: await updateAnnouncement(String(req.params.id), req.body, admin, req) }, 'Announcement updated'));
  } catch (error) {
    next(error);
  }
}

export async function announcementPublish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    res.json(ok({ announcement: await publishAnnouncement(String(req.params.id), admin, req) }, 'Announcement published'));
  } catch (error) {
    next(error);
  }
}

export async function announcementUnpublish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    res.json(ok({ announcement: await unpublishAnnouncement(String(req.params.id), admin, req) }, 'Announcement unpublished'));
  } catch (error) {
    next(error);
  }
}

export async function templatesList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireUser(req);
    await seedDefaultTemplates();
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    res.json(ok(await listTemplates({ page, limit }), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function templatesUpsert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireUser(req);
    const row = await upsertTemplate(
      {
        ...req.body,
        type: req.body.type as NotificationType
      },
      admin,
      req
    );
    res.json(ok({ template: { id: String(row._id), name: row.name, channel: row.channel, language: row.language } }, 'Template saved'));
  } catch (error) {
    next(error);
  }
}
