import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  adminSearch,
  exportInstitutes,
  exportStudents,
  getAdminDashboard,
  getAdminReports,
  getAdminUniversity,
  listAdminUniversitiesPaged,
  listAdminUsers,
  listAuditLogs,
  listUniversityOptions,
  updateAdminProfile,
  updateAdminUserStatus,
  updateUniversity,
  updateUniversityStatus
} from '../services/adminService.js';
import {
  approveInstitute,
  createUniversity,
  getAdminInstitute,
  listAdminInstitutes,
  listPendingInstitutes,
  rejectInstitute,
  setInstituteActiveStatus
} from '../services/instituteService.js';
import { ok } from '../utils/apiResponse.js';
import { writeAudit } from '../services/auditService.js';
import type { AdminInstituteQuery, CreateUniversityInput, RejectInstituteInput } from '../validators/authValidators.js';
import type {
  AdminAuditQuery,
  AdminProfileUpdate,
  AdminUniversityQuery,
  AdminUserQuery,
  ExportQuery,
  UpdateUniversityInput
} from '../validators/adminValidators.js';

function requireAdmin(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function adminDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const dashboard = await getAdminDashboard();
    res.json(ok(dashboard, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminUniversities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAdminUniversitiesPaged(req.query as unknown as AdminUniversityQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminUniversityOptions(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const universities = await listUniversityOptions();
    res.json(ok({ universities }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminUniversityDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const university = await getAdminUniversity(String(req.params.id));
    res.json(ok({ university }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function postUniversity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const university = await createUniversity(req.body as CreateUniversityInput, admin, req);
    res.status(201).json(ok({ university }, 'University created'));
  } catch (error) {
    next(error);
  }
}

export async function patchUniversity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const university = await updateUniversity(String(req.params.id), req.body as UpdateUniversityInput, admin, req);
    res.json(ok({ university }, 'University updated'));
  } catch (error) {
    next(error);
  }
}

export async function patchUniversityStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const university = await updateUniversityStatus(String(req.params.id), req.body.status, admin, req);
    res.json(ok({ university }, 'University status updated'));
  } catch (error) {
    next(error);
  }
}

export async function adminInstitutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAdminInstitutes(req.query as unknown as AdminInstituteQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function pendingInstitutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listPendingInstitutes(req.query as unknown as AdminInstituteQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminInstituteDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await getAdminInstitute(String(req.params.id));
    res.json(ok({ institute: profile }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function approveInstituteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const institute = await approveInstitute(String(req.params.id), admin, req);
    res.json(ok({ institute }, 'Institute approved'));
  } catch (error) {
    next(error);
  }
}

export async function rejectInstituteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const institute = await rejectInstitute(String(req.params.id), admin, req.body as RejectInstituteInput, req);
    res.json(ok({ institute }, 'Institute rejected'));
  } catch (error) {
    next(error);
  }
}

export async function patchInstituteStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const institute = await setInstituteActiveStatus(String(req.params.id), req.body.status, admin, req);
    res.json(ok({ institute }, 'Institute status updated'));
  } catch (error) {
    next(error);
  }
}

export async function adminReports(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reports = await getAdminReports();
    res.json(ok(reports, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAuditLogs(req.query as unknown as AdminAuditQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminGlobalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminSearch(String(req.query.q || ''));
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAdminUsers(req.query as unknown as AdminUserQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function patchAdminUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const user = await updateAdminUserStatus(String(req.params.id), req.body.status, admin, req);
    res.json(ok({ user }, 'User status updated'));
  } catch (error) {
    next(error);
  }
}

export async function adminProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    res.json(ok({ user: admin }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function patchAdminProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const user = await updateAdminProfile(admin, req.body as AdminProfileUpdate, req);
    res.json(ok({ user }, 'Profile updated'));
  } catch (error) {
    next(error);
  }
}

function sendExport(res: Response, file: { filename: string; contentType: string; buffer: Buffer }) {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.send(file.buffer);
}

export async function exportInstitutesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const file = await exportInstitutes(req.query as unknown as ExportQuery);
    await writeAudit({
      userId: admin.id,
      action: 'DATA_EXPORT',
      entity: 'Institute',
      req,
      metadata: { format: (req.query as { format?: string }).format || 'csv' }
    });
    sendExport(res, file);
  } catch (error) {
    next(error);
  }
}

export async function exportStudentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const file = await exportStudents(req.query as unknown as ExportQuery);
    await writeAudit({
      userId: admin.id,
      action: 'DATA_EXPORT',
      entity: 'Student',
      req,
      metadata: { format: (req.query as { format?: string }).format || 'csv' }
    });
    sendExport(res, file);
  } catch (error) {
    next(error);
  }
}
