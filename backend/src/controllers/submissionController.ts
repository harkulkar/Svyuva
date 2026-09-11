import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import {
  adminSubmissionErrorReport,
  buildSubmissionExportFile,
  calculateSubmissionPremium,
  confirmSubmissionStudents,
  createCollegeSubmission,
  getAdminSubmission,
  getCollegeSubmission,
  getSubmissionMeta,
  getSubmissionSummaryStats,
  listAdminSubmissionStudents,
  listAdminSubmissions,
  listCollegeSubmissions,
  listSubmissionStudents,
  previewAdminSubmissionStudents,
  previewSubmissionStudents,
  reviewAdminSubmission,
  submitCollegeSubmission,
  submissionErrorReport,
  uploadSubmissionExcel
} from '../services/submissionService.js';
import { listPremiumRules, upsertPremiumRule } from '../services/premiumCalculationService.js';
import type {
  AdminReviewInput,
  CreateSubmissionInput,
  PremiumRuleUpsertInput,
  SubmissionListQuery,
  SubmissionPreviewQuery,
  SubmissionStudentQuery
} from '../validators/submissionValidators.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

function sendWorkbook(res: Response, filename: string, buffer: Buffer, contentType?: string) {
  res.setHeader('Content-Type', contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export async function collegeSubmissionMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await getSubmissionMeta(requireUser(req)), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listCollegeSubmissions(requireUser(req), req.query as unknown as SubmissionListQuery), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireUser(req);
    if (!user.instituteId) throw new AppError('College scope is required.', 403, 'FORBIDDEN');
    res.json(ok(await getSubmissionSummaryStats({ instituteId: user.instituteId }), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function postCollegeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as CreateSubmissionInput;
    const created = await createCollegeSubmission(requireUser(req), body.academicYear, req);
    res.status(201).json(ok({ submission: created }, 'Submission created'));
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissionDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ submission: await getCollegeSubmission(requireUser(req), String(req.params.id)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function uploadCollegeSubmissionExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await uploadSubmissionExcel(requireUser(req), String(req.params.id), req.file, req);
    res.json(ok(result, 'Excel validated'));
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissionPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(
      ok(await previewSubmissionStudents(requireUser(req), String(req.params.id), req.query as unknown as SubmissionPreviewQuery), 'OK')
    );
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissionErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = await submissionErrorReport(requireUser(req), String(req.params.id));
    sendWorkbook(res, file.filename, file.buffer);
  } catch (error) {
    next(error);
  }
}

export async function confirmCollegeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await confirmSubmissionStudents(requireUser(req), String(req.params.id), req), 'Student data confirmed'));
  } catch (error) {
    next(error);
  }
}

export async function calculateCollegeSubmissionPremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ premium: await calculateSubmissionPremium(requireUser(req), String(req.params.id), req) }, 'Premium calculated'));
  } catch (error) {
    next(error);
  }
}

export async function collegeSubmissionStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(
      ok(await listSubmissionStudents(requireUser(req), String(req.params.id), req.query as unknown as SubmissionStudentQuery), 'OK')
    );
  } catch (error) {
    next(error);
  }
}

export async function submitCollegeSubmissionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ submission: await submitCollegeSubmission(requireUser(req), String(req.params.id), req) }, 'Submission submitted'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listAdminSubmissions(req.query as unknown as SubmissionListQuery), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await getSubmissionSummaryStats(), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const file = await buildSubmissionExportFile(req.query as unknown as SubmissionListQuery, format);
    sendWorkbook(res, file.filename, file.buffer, file.contentType);
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ submission: await getAdminSubmission(String(req.params.id)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listAdminSubmissionStudents(String(req.params.id), req.query as unknown as SubmissionStudentQuery), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await previewAdminSubmissionStudents(String(req.params.id), req.query as unknown as SubmissionPreviewQuery), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = await adminSubmissionErrorReport(String(req.params.id));
    sendWorkbook(res, file.filename, file.buffer);
  } catch (error) {
    next(error);
  }
}

export async function adminSubmissionReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(
      ok({ submission: await reviewAdminSubmission(requireUser(req), String(req.params.id), req.body as AdminReviewInput, req) }, 'OK')
    );
  } catch (error) {
    next(error);
  }
}

export async function adminRecalculatePremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ premium: await calculateSubmissionPremium(requireUser(req), String(req.params.id), req, true) }, 'Premium recalculated'));
  } catch (error) {
    next(error);
  }
}

export async function adminPremiumRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok({ items: await listPremiumRules(typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function putAdminPremiumRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as PremiumRuleUpsertInput;
    const row = await upsertPremiumRule(body, requireUser(req));
    res.json(ok({ rule: { id: String(row._id), academicYear: row.academicYear, version: row.version, active: row.active } }, 'Saved'));
  } catch (error) {
    next(error);
  }
}
