import { createHash } from 'node:crypto';
import type { Request } from 'express';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { AppError } from '../middleware/errorHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { neutralizeSpreadsheetFormula } from '../utils/spreadsheet.js';
import { env } from '../config/env.js';
import { DataSubmission, SUBMISSION_EDITABLE_STATUSES, SUBMISSION_LOCKED_STATUSES, SUBMISSION_OPEN_STATUSES } from '../models/DataSubmission.js';
import { Document } from '../models/Document.js';
import { Institute } from '../models/Institute.js';
import { PremiumCalculation } from '../models/PremiumCalculation.js';
import { Student } from '../models/Student.js';
import { SubmissionVersion } from '../models/SubmissionVersion.js';
import { UploadJob } from '../models/UploadJob.js';
import { writeAudit } from './auditService.js';
import { requireCollegeInstituteId } from './instituteService.js';
import { notifyAdmins, notifyInstituteUsers } from '../notifications/notification.service.js';
import { invalidateDashboardCache } from '../analytics/analytics.service.js';
import { assertExcelFileSize } from '../config/excelLimits.js';
import { getAcademicYearConfig, nextSubmissionNumber } from '../config/academicYear.js';
import {
  buildErrorWorkbook,
  parseStudentWorkbook,
  serializeExcelValidRows,
  studentDocumentFromParsedRow,
  type ExcelIssue,
  type ParsedStudentRow
} from './excelService.js';
import { safeUploadFilename } from '../utils/spreadsheet.js';
import { calculatePremiumForSubmission, toPremiumDto } from './premiumCalculationService.js';
import type { AuthUser } from '../types/auth.js';
import type {
  AdminReviewInput,
  SubmissionListQuery,
  SubmissionPreviewQuery,
  SubmissionStudentQuery
} from '../validators/submissionValidators.js';
import type { StudentWriteInput } from '../validators/studentValidators.js';

const ISSUE_CAP = 500;
const SUBMIT_FROM = ['PREMIUM_CALCULATED', 'CORRECTION_REQUIRED'] as const;

function oid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function fullName(row: { firstName: string; middleName?: string | null; lastName: string }) {
  const first = row.firstName?.trim() || '';
  const middle = row.middleName?.trim() || '';
  const last = row.lastName?.trim() || '';
  if (last && last.toLowerCase() === first.toLowerCase() && !middle) return first;
  return [first, middle, last].filter(Boolean).join(' ');
}

async function collegeScope(user: AuthUser) {
  const instituteId = requireCollegeInstituteId(user);
  const institute = await Institute.findById(instituteId).select('name universityId status district').populate('universityId', 'name code shortName');
  if (!institute || institute.status !== 'ACTIVE') {
    throw new AppError('This institute is not allowed to manage submissions.', 403, 'FORBIDDEN');
  }
  return {
    instituteId,
    universityId: String(institute.universityId && typeof institute.universityId === 'object' && '_id' in institute.universityId ? institute.universityId._id : institute.universityId),
    institute
  };
}

function isEditable(status: string) {
  return SUBMISSION_EDITABLE_STATUSES.includes(status as (typeof SUBMISSION_EDITABLE_STATUSES)[number]);
}

function isLocked(status: string) {
  return SUBMISSION_LOCKED_STATUSES.includes(status as (typeof SUBMISSION_LOCKED_STATUSES)[number]);
}

async function loadCollegeSubmission(user: AuthUser, id: string) {
  const { instituteId } = await collegeScope(user);
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Submission not found', 404, 'NOT_FOUND');
  }
  const submission = await DataSubmission.findOne({ _id: id, instituteId });
  if (!submission) {
    throw new AppError('Submission not found', 404, 'NOT_FOUND');
  }
  return { submission, instituteId, universityId: String(submission.universityId) };
}

async function loadAdminSubmission(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Submission not found', 404, 'NOT_FOUND');
  }
  const submission = await DataSubmission.findById(id);
  if (!submission) {
    throw new AppError('Submission not found', 404, 'NOT_FOUND');
  }
  return submission;
}

function serializeValidRows(rows: ParsedStudentRow[]) {
  return serializeExcelValidRows(rows);
}

function fileMeta(file: Express.Multer.File) {
  return {
    originalFilename: safeUploadFilename(file.originalname),
    mimeType: file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: file.size,
    sha256: createHash('sha256').update(file.buffer).digest('hex'),
    storageKey: ''
  };
}

async function snapshotVersion(submission: mongoose.Document & { _id: mongoose.Types.ObjectId; version: number; instituteId: mongoose.Types.ObjectId; status: string; studentCount: number; validStudentCount: number; invalidStudentCount: number; premiumCalculationId?: mongoose.Types.ObjectId | null; uploadedFile?: unknown; validation?: unknown }, userId: string) {
  const premium = submission.premiumCalculationId
    ? await PremiumCalculation.findById(submission.premiumCalculationId).lean()
    : null;
  await SubmissionVersion.updateOne(
    { submissionId: submission._id, version: submission.version },
    {
      $setOnInsert: {
        submissionId: submission._id,
        instituteId: submission.instituteId,
        version: submission.version,
        status: submission.status,
        studentCount: submission.studentCount,
        validStudentCount: submission.validStudentCount,
        invalidStudentCount: submission.invalidStudentCount,
        premiumCalculationId: submission.premiumCalculationId || null,
        premiumSnapshot: premium ? toPremiumDto(premium) : null,
        uploadedFile: submission.uploadedFile || null,
        validation: submission.validation || null,
        createdBy: userId
      }
    },
    { upsert: true }
  );
}

function toSummary(
  row: {
    _id: mongoose.Types.ObjectId;
    submissionNumber: string;
    academicYear: string;
    status: string;
    studentCount: number;
    validStudentCount: number;
    invalidStudentCount: number;
    submittedAt?: Date | null;
    createdAt?: Date;
    version?: number;
    instituteId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name?: string; district?: string };
    universityId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name?: string };
  },
  premium?: { totalPremium?: number | null; calculationStatus?: string; ruleVersion?: string | null; currency?: string | null } | null
) {
  const institute =
    row.instituteId && typeof row.instituteId === 'object' && 'name' in row.instituteId
      ? { id: String(row.instituteId._id), name: row.instituteId.name || '', district: row.instituteId.district || '' }
      : { id: String(row.instituteId || ''), name: '', district: '' };
  const university =
    row.universityId && typeof row.universityId === 'object' && 'name' in row.universityId
      ? { id: String(row.universityId._id), name: row.universityId.name || '' }
      : { id: String(row.universityId || ''), name: '' };
  return {
    id: String(row._id),
    submissionNumber: row.submissionNumber,
    academicYear: row.academicYear,
    status: row.status,
    version: row.version || 1,
    studentCount: row.studentCount,
    validStudentCount: row.validStudentCount,
    invalidStudentCount: row.invalidStudentCount,
    premium: premium && premium.calculationStatus === 'COMPLETE' ? premium.totalPremium ?? null : null,
    premiumStatus: premium?.calculationStatus || null,
    ruleVersion: premium?.ruleVersion || '',
    currency: premium?.currency || 'INR',
    submittedAt: row.submittedAt || null,
    createdAt: row.createdAt || null,
    institute,
    university,
    locked: isLocked(row.status)
  };
}

export async function getSubmissionMeta(user: AuthUser) {
  const { institute } = await collegeScope(user);
  const years = await getAcademicYearConfig();
  const uni =
    institute.universityId && typeof institute.universityId === 'object' && 'name' in institute.universityId
      ? { id: String((institute.universityId as { _id: mongoose.Types.ObjectId })._id), name: String((institute.universityId as { name: string }).name) }
      : { id: String(institute.universityId), name: '' };
  return {
    institute: { id: String(institute._id), name: institute.name, district: institute.district || '' },
    university: uni,
    academicYears: years,
    excelNote: 'TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT',
    premiumNote: 'TODO: VERIFY OFFICIAL PREMIUM RULE'
  };
}

export async function createCollegeSubmission(user: AuthUser, academicYear: string, req: Request) {
  const { instituteId, universityId } = await collegeScope(user);
  const years = await getAcademicYearConfig();
  if (!years.years.includes(academicYear)) {
    throw new AppError('Select a configured academic year.', 400, 'INVALID_ACADEMIC_YEAR');
  }
  const conflict = await DataSubmission.findOne({
    instituteId,
    academicYear,
    status: { $in: SUBMISSION_OPEN_STATUSES }
  }).select('_id submissionNumber status');
  if (conflict) {
    throw new AppError(
      `A submission already exists for this academic year (${conflict.submissionNumber}, ${conflict.status}).`,
      409,
      'SUBMISSION_EXISTS'
    );
  }

  let created;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const submissionNumber = await nextSubmissionNumber(academicYear);
    try {
      created = await DataSubmission.create({
        submissionNumber,
        instituteId,
        universityId,
        createdBy: user.id,
        academicYear,
        status: 'DRAFT',
        version: 1
      });
      break;
    } catch (error) {
      const dup = error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000;
      if (!dup) throw error;
    }
  }
  if (!created) {
    throw new AppError('Could not allocate a submission number.', 500, 'SUBMISSION_NUMBER_FAILED');
  }

  await snapshotVersion(created, user.id);
  await writeAudit({
    userId: user.id,
    action: 'SUBMISSION_CREATED',
    entity: 'DataSubmission',
    entityId: String(created._id),
    req,
    metadata: { submissionNumber: created.submissionNumber, academicYear, instituteId }
  });
  invalidateDashboardCache();
  return toSummary(created);
}

export async function listCollegeSubmissions(user: AuthUser, query: SubmissionListQuery) {
  const { instituteId } = await collegeScope(user);
  return listSubmissions({
    page: query.page,
    limit: query.limit,
    q: query.q,
    academicYear: query.academicYear,
    status: query.status,
    sort: query.sort,
    order: query.order,
    from: query.from,
    to: query.to,
    instituteId
  });
}

async function listSubmissions(query: SubmissionListQuery) {
  const filter: Record<string, unknown> = {};
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.status) filter.status = query.status;
  if (query.universityId) filter.universityId = query.universityId;
  if (query.instituteId) filter.instituteId = query.instituteId;
  if (query.from || query.to) {
    const range: Record<string, Date> = {};
    if (query.from) range.$gte = new Date(query.from);
    if (query.to) range.$lte = new Date(query.to);
    filter.submittedAt = range;
  }
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ submissionNumber: rx }];
  }
  if (query.district) {
    const institutes = await Institute.find({ district: query.district }).select('_id');
    filter.instituteId = { $in: institutes.map((row) => row._id) };
  }

  const sortField = query.sort || 'createdAt';
  const sortDir = query.order === 'asc' ? 1 : -1;
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    DataSubmission.countDocuments(filter),
    DataSubmission.find(filter)
      .populate('instituteId', 'name district')
      .populate('universityId', 'name code shortName')
      .sort({ [sortField]: sortDir, _id: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  const calcIds = rows.map((row) => row.premiumCalculationId).filter(Boolean);
  const calcs = await PremiumCalculation.find({ _id: { $in: calcIds } }).select(
    'totalPremium calculationStatus ruleVersion currency submissionId'
  );
  const calcMap = new Map(calcs.map((row) => [String(row._id), row]));

  return {
    items: rows.map((row) => toSummary(row, row.premiumCalculationId ? calcMap.get(String(row.premiumCalculationId)) : null)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1)
    }
  };
}

export async function listAdminSubmissions(query: SubmissionListQuery) {
  return listSubmissions(query);
}

export async function getSubmissionSummaryStats(scope?: { instituteId?: string }) {
  const match: Record<string, unknown> = {};
  if (scope?.instituteId) match.instituteId = oid(scope.instituteId);
  const [byStatus, submittedAgg] = await Promise.all([
    DataSubmission.aggregate<{ _id: string; count: number; students: number }>([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 }, students: { $sum: '$studentCount' } } }
    ]),
    DataSubmission.aggregate<{ _id: null; count: number; students: number }>([
      { $match: { ...match, status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CORRECTION_REQUIRED'] } } },
      { $group: { _id: null, count: { $sum: 1 }, students: { $sum: '$studentCount' } } }
    ])
  ]);
  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const row of byStatus) {
    statusCounts[row._id] = row.count;
    total += row.count;
  }
  const submittedIds = await DataSubmission.find({
    ...match,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CORRECTION_REQUIRED'] },
    premiumCalculationId: { $ne: null }
  }).select('premiumCalculationId');
  const premiumSum = await PremiumCalculation.aggregate<{ _id: null; total: number }>([
    {
      $match: {
        _id: { $in: submittedIds.map((row) => row.premiumCalculationId).filter(Boolean) },
        calculationStatus: 'COMPLETE',
        superseded: false
      }
    },
    { $group: { _id: null, total: { $sum: '$totalPremium' } } }
  ]);
  return {
    total,
    byStatus: {
      DRAFT: statusCounts.DRAFT || 0,
      VALIDATED: statusCounts.VALIDATED || 0,
      PREMIUM_CALCULATED: statusCounts.PREMIUM_CALCULATED || 0,
      SUBMITTED: statusCounts.SUBMITTED || 0,
      UNDER_REVIEW: statusCounts.UNDER_REVIEW || 0,
      CORRECTION_REQUIRED: statusCounts.CORRECTION_REQUIRED || 0,
      APPROVED: statusCounts.APPROVED || 0,
      REJECTED: statusCounts.REJECTED || 0
    },
    totalStudentsSubmitted: submittedAgg[0]?.students || 0,
    totalCalculatedPremium: premiumSum[0]?.total || 0
  };
}

export async function getCollegeSubmission(user: AuthUser, id: string) {
  const { submission } = await loadCollegeSubmission(user, id);
  return hydrateSubmission(submission);
}

export async function getAdminSubmission(id: string) {
  const submission = await loadAdminSubmission(id);
  return hydrateSubmission(submission, { admin: true });
}

async function hydrateSubmission(submission: InstanceType<typeof DataSubmission>, options?: { admin?: boolean }) {
  await submission.populate('instituteId', 'name district email principalName');
  await submission.populate('universityId', 'name code shortName');
  const premium = submission.premiumCalculationId
    ? await PremiumCalculation.findById(submission.premiumCalculationId)
    : null;
  const linkedStudents = await Student.countDocuments({ submissionId: submission._id });
  const premiumDto = premium ? toPremiumDto(premium) : null;
  const warnings: string[] = [];
  if (submission.studentsConfirmed && linkedStudents !== submission.studentCount) {
    warnings.push('Stored student count does not match linked student records.');
  }
  if (premiumDto && premiumDto.calculationStatus === 'COMPLETE' && premiumDto.studentCount !== submission.studentCount) {
    warnings.push('Stored premium student count does not match the submission student count.');
  }
  if (premium && submission.status !== 'DRAFT' && premium.calculationStatus === 'COMPLETE') {
    const live = await Student.countDocuments({ submissionId: submission._id });
    const recomputed = live * (premium.ratePerStudent || 0);
    if (premium.totalPremium != null && Math.abs(recomputed - premium.totalPremium) > 0.009) {
      warnings.push('Stored premium does not match the current calculation inputs. Submitted premium was not changed.');
    }
  }
  const versions = options?.admin
    ? await SubmissionVersion.find({ submissionId: submission._id }).sort({ version: 1 }).lean()
    : [];
  const documents = await Document.find({ submissionId: submission._id })
    .select('documentType originalFilename mimeType sizeBytes uploadedAt fileStatus versionNumber')
    .sort({ createdAt: -1 })
    .limit(20);
  const timeline = await import('../models/AuditLog.js').then(({ AuditLog }) =>
    AuditLog.find({ entity: 'DataSubmission', entityId: String(submission._id) })
      .sort({ createdAt: 1 })
      .limit(100)
      .select('action createdAt metadata userId')
      .populate('userId', 'name email')
      .lean()
  );

  return {
    ...toSummary(submission, premium),
    studentsConfirmed: Boolean(submission.studentsConfirmed),
    totalRowCount: submission.totalRowCount,
    duplicateStudentCount: submission.duplicateStudentCount,
    uploadedFile: publicFile(submission.uploadedFile || undefined),
    validation: {
      totalRows: submission.validation?.totalRows || 0,
      validRows: submission.validation?.validRows || 0,
      invalidRows: submission.validation?.invalidRows || 0,
      duplicateRows: submission.validation?.duplicateRows || 0,
      issueCount: Array.isArray(submission.validation?.issues) ? submission.validation.issues.length : 0,
      completedAt: submission.validation?.completedAt || null
    },
    premium: premiumDto,
    reviewComment: submission.reviewComment || '',
    reviewedAt: submission.reviewedAt || null,
    lastCalculatedAt: submission.lastCalculatedAt || null,
    reconciliation: {
      linkedStudentCount: linkedStudents,
      studentCountMatch: linkedStudents === submission.studentCount,
      premiumMatch: warnings.every((line) => !line.includes('premium')),
      warnings
    },
    documents: documents.map((doc) => ({
      id: String(doc._id),
      documentType: doc.documentType,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
      fileStatus: doc.fileStatus,
      versionNumber: doc.versionNumber
    })),
    versions: versions.map((row) => ({
      version: row.version,
      status: row.status,
      studentCount: row.studentCount,
      premium: row.premiumSnapshot,
      uploadedFile: publicFile(row.uploadedFile as Record<string, unknown> | undefined),
      createdAt: row.createdAt
    })),
    timeline: timeline.map((row) => ({
      id: String(row._id),
      action: row.action,
      createdAt: row.createdAt,
      user:
        row.userId && typeof row.userId === 'object' && 'name' in row.userId
          ? { name: (row.userId as { name: string }).name }
          : null
    })),
    canEdit: isEditable(submission.status),
    canSubmit:
      SUBMIT_FROM.includes(submission.status as (typeof SUBMIT_FROM)[number]) &&
      Boolean(submission.studentsConfirmed) &&
      Boolean(premiumDto && premiumDto.calculationStatus === 'COMPLETE')
  };
}

function publicFile(
  file?: Record<string, unknown> | { originalFilename?: string; mimeType?: string; sizeBytes?: number | null; sha256?: string } | null
) {
  if (!file) return null;
  return {
    originalFilename: String(file.originalFilename || ''),
    mimeType: String(file.mimeType || ''),
    sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
    checksum: String(file.sha256 || '')
  };
}

export async function uploadSubmissionExcel(user: AuthUser, id: string, file: Express.Multer.File | undefined, req: Request) {
  if (!file) throw new AppError('Select an Excel file to upload.', 400, 'NO_FILE');
  assertExcelFileSize(file.size);
  const { submission, instituteId, universityId } = await loadCollegeSubmission(user, id);
  if (!isEditable(submission.status)) {
    throw new AppError('This submission is locked and cannot be changed.', 409, 'SUBMISSION_LOCKED');
  }

  const previousStatus = submission.status;
  submission.status = 'VALIDATING';
  await submission.save();

  let parsed;
  try {
    parsed = parseStudentWorkbook(file.buffer, { academicYear: submission.academicYear });
  } catch (error) {
    submission.status = previousStatus === 'VALIDATING' ? 'DRAFT' : previousStatus;
    await submission.save();
    await writeAudit({
      userId: user.id,
      action: 'SUBMISSION_VALIDATION_FAILED',
      entity: 'DataSubmission',
      entityId: String(submission._id),
      req,
      metadata: { message: error instanceof Error ? error.message : 'parse failed' }
    });
    throw error;
  }

  const yearIssues: ExcelIssue[] = [];
  const yearMatched: ParsedStudentRow[] = [];
  for (const row of parsed.validRows) {
    if (row.academicYear !== submission.academicYear) {
      yearIssues.push({
        row: row.sourceRow,
        identifier: row.studentId,
        field: 'Academic Year',
        message: `Academic year must be ${submission.academicYear} for this submission.`,
        kind: 'invalid'
      });
    } else {
      yearMatched.push(row);
    }
  }
  parsed.validRows = yearMatched;
  parsed.issues.push(...yearIssues);
  parsed.invalidCount += yearIssues.length;

  const dbIssues: ExcelIssue[] = [];
  if (parsed.validRows.length) {
    const studentIds = parsed.validRows.map((row) => row.studentId);
    const enrollments = parsed.validRows.map((row) => row.enrollmentNumber);
    const existing = await Student.find({
      instituteId,
      submissionId: { $ne: submission._id },
      $or: [{ studentId: { $in: studentIds } }, { enrollmentNumber: { $in: enrollments } }]
    }).select('studentId enrollmentNumber rollNumber academicYear');
    const studentIdSet = new Set(existing.map((row) => row.studentId.toLowerCase()));
    const enrollmentSet = new Set(existing.map((row) => row.enrollmentNumber.toLowerCase()));
    const rollKeys = new Set(existing.map((row) => `${row.academicYear}:${row.rollNumber.toLowerCase()}`));
    const stillValid: ParsedStudentRow[] = [];
    for (const row of parsed.validRows) {
      if (studentIdSet.has(row.studentId.toLowerCase())) {
        dbIssues.push({ row: row.sourceRow, identifier: row.studentId, field: 'Student ID', message: 'Student ID already exists.', kind: 'duplicate' });
        continue;
      }
      if (enrollmentSet.has(row.enrollmentNumber.toLowerCase())) {
        dbIssues.push({
          row: row.sourceRow,
          identifier: row.enrollmentNumber,
          field: 'Enrollment Number',
          message: 'Enrollment Number already exists.',
          kind: 'duplicate'
        });
        continue;
      }
      if (rollKeys.has(`${row.academicYear}:${row.rollNumber.toLowerCase()}`)) {
        dbIssues.push({
          row: row.sourceRow,
          identifier: row.rollNumber,
          field: 'Roll Number',
          message: 'Roll Number already exists for this academic year.',
          kind: 'duplicate'
        });
        continue;
      }
      stillValid.push(row);
    }
    parsed.validRows = stillValid;
    parsed.issues.push(...dbIssues);
    parsed.duplicateCount += dbIssues.length;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const meta = fileMeta(file);
  const job = await UploadJob.create({
    instituteId,
    universityId,
    uploadedBy: user.id,
    filename: meta.originalFilename,
    totalRows: parsed.totalRows,
    validCount: parsed.validRows.length,
    invalidCount: parsed.invalidCount,
    duplicateCount: parsed.duplicateCount,
    validRows: serializeValidRows(parsed.validRows),
    issues: parsed.issues,
    imported: false,
    expiresAt
  });

  const doc = await Document.create({
    ownerType: 'INSTITUTE',
    ownerId: instituteId,
    instituteId,
    submissionId: submission._id,
    documentType: 'STUDENT_EXCEL',
    originalFilename: meta.originalFilename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    sha256: meta.sha256,
    storageKey: null,
    uploadedAt: new Date(),
    fileStatus: 'AVAILABLE'
  });

  submission.uploadJobId = job._id;
  submission.uploadedFileId = doc._id;
  submission.uploadedFile = meta;
  submission.totalRowCount = parsed.totalRows;
  submission.validStudentCount = parsed.validRows.length;
  submission.invalidStudentCount = parsed.invalidCount;
  submission.duplicateStudentCount = parsed.duplicateCount;
  submission.studentsConfirmed = false;
  submission.studentCount = 0;
  submission.premiumCalculationId = null;
  submission.status = 'VALIDATED';
  submission.validation = {
    totalRows: parsed.totalRows,
    validRows: parsed.validRows.length,
    invalidRows: parsed.invalidCount,
    duplicateRows: parsed.duplicateCount,
    issues: parsed.issues.slice(0, ISSUE_CAP),
    completedAt: new Date()
  };
  await submission.save();

  await writeAudit({
    userId: user.id,
    action: 'SUBMISSION_EXCEL_UPLOADED',
    entity: 'DataSubmission',
    entityId: String(submission._id),
    req,
    metadata: {
      filename: meta.originalFilename,
      sizeBytes: meta.sizeBytes,
      totalRows: parsed.totalRows,
      valid: parsed.validRows.length,
      invalid: parsed.invalidCount,
      duplicates: parsed.duplicateCount
    }
  });
  await writeAudit({
    userId: user.id,
    action: parsed.issues.length ? 'SUBMISSION_VALIDATION_COMPLETED' : 'SUBMISSION_VALIDATION_COMPLETED',
    entity: 'DataSubmission',
    entityId: String(submission._id),
    req,
    metadata: { valid: parsed.validRows.length, invalid: parsed.invalidCount, duplicates: parsed.duplicateCount }
  });

  return {
    submissionId: String(submission._id),
    filename: meta.originalFilename,
    sizeBytes: meta.sizeBytes,
    uploadStatus: 'UPLOADED',
    validationStatus: 'VALIDATED',
    totalRows: parsed.totalRows,
    valid: parsed.validRows.length,
    invalid: parsed.invalidCount,
    duplicates: parsed.duplicateCount,
    issues: parsed.issues.slice(0, 200),
    expiresAt
  };
}

export async function previewSubmissionStudents(user: AuthUser, id: string, query: SubmissionPreviewQuery) {
  const { submission, instituteId } = await loadCollegeSubmission(user, id);
  return paginatePreview(submission, query, instituteId);
}

export async function previewAdminSubmissionStudents(id: string, query: SubmissionPreviewQuery) {
  const submission = await loadAdminSubmission(id);
  return paginatePreview(submission, query, String(submission.instituteId));
}

async function paginatePreview(
  submission: {
    uploadJobId?: mongoose.Types.ObjectId | null;
    studentsConfirmed?: boolean;
    _id: mongoose.Types.ObjectId;
    validation?: { issues?: ExcelIssue[] } | null;
  },
  query: SubmissionPreviewQuery,
  instituteId: string
) {
  const page = query.page;
  const limit = query.limit;
  if (submission.studentsConfirmed) {
    return listSubmissionStudentsInternal(String(submission._id), instituteId, {
      page,
      limit,
      q: query.q,
      validity: query.validity
    });
  }
  if (!submission.uploadJobId) {
    return { items: [], issues: [], pagination: { page, limit, total: 0, totalPages: 1 } };
  }
  const job = await UploadJob.findOne({ _id: submission.uploadJobId, instituteId });
  if (!job) {
    throw new AppError('The upload preview has expired. Upload the file again.', 410, 'PREVIEW_EXPIRED');
  }
  const q = (query.q || '').toLowerCase();
  let rows = ((job.validRows as Array<StudentWriteInput & { sourceRow?: number }>) || []).map((row) => ({
    row: row.sourceRow || 0,
    studentId: row.studentId,
    enrollmentNumber: row.enrollmentNumber,
    name: fullName(row),
    course: row.course,
    academicYear: row.academicYear,
    mobile: row.mobile,
    valid: true
  }));
  const issues = ((job.issues as ExcelIssue[]) || []).map((issue) => ({
    row: issue.row,
    studentId: issue.identifier,
    enrollmentNumber: '',
    name: issue.identifier,
    course: '',
    academicYear: '',
    mobile: '',
    valid: false,
    field: issue.field,
    message: issue.message,
    kind: issue.kind
  }));
  if (query.validity === 'invalid') rows = [];
  else if (query.validity === 'valid') {
    /* keep valid only */
  }
  let combined = query.validity === 'invalid' ? issues : query.validity === 'valid' ? rows : [...rows, ...issues];
  if (q) {
    combined = combined.filter((item) => `${item.studentId} ${item.name} ${item.enrollmentNumber}`.toLowerCase().includes(q));
  }
  const total = combined.length;
  const slice = combined.slice((page - 1) * limit, page * limit);
  return {
    items: slice,
    issues: (job.issues as ExcelIssue[]).slice(0, ISSUE_CAP),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit) || 1) }
  };
}

export async function submissionErrorReport(user: AuthUser, id: string) {
  const { submission, instituteId } = await loadCollegeSubmission(user, id);
  const issues = await loadIssues(submission, instituteId);
  return { filename: 'submission_validation_errors.xlsx', buffer: buildErrorWorkbook(issues) };
}

export async function adminSubmissionErrorReport(id: string) {
  const submission = await loadAdminSubmission(id);
  const issues = await loadIssues(submission, String(submission.instituteId));
  return { filename: 'submission_validation_errors.xlsx', buffer: buildErrorWorkbook(issues) };
}

async function loadIssues(
  submission: {
    uploadJobId?: mongoose.Types.ObjectId | null;
    validation?: { issues?: ExcelIssue[] } | null;
    instituteId: mongoose.Types.ObjectId;
  },
  instituteId: string
) {
  if (submission.uploadJobId) {
    const job = await UploadJob.findOne({ _id: submission.uploadJobId, instituteId });
    if (job?.issues?.length) return job.issues as ExcelIssue[];
  }
  return (submission.validation?.issues as ExcelIssue[]) || [];
}

export async function confirmSubmissionStudents(user: AuthUser, id: string, req: Request) {
  const { submission, instituteId, universityId } = await loadCollegeSubmission(user, id);
  if (!isEditable(submission.status)) {
    throw new AppError('This submission is locked and cannot be changed.', 409, 'SUBMISSION_LOCKED');
  }
  if (!submission.uploadJobId) {
    throw new AppError('Upload and validate an Excel file first.', 400, 'VALIDATION_REQUIRED');
  }
  const job = await UploadJob.findOne({ _id: submission.uploadJobId, instituteId });
  if (!job) {
    throw new AppError('The upload preview has expired. Upload the file again.', 410, 'PREVIEW_EXPIRED');
  }
  const rows = (job.validRows as Array<StudentWriteInput & { sourceRow?: number; dateOfBirth: string | Date }>) || [];
  if (!rows.length) {
    throw new AppError('There are no valid rows to confirm. Remove invalid records or replace the Excel file.', 400, 'NO_VALID_ROWS');
  }

  await Student.deleteMany({ submissionId: submission._id, instituteId });

  const documents = rows.map((row) => ({
    instituteId,
    universityId,
    submissionId: submission._id,
    ...studentDocumentFromParsedRow({ ...row, academicYear: submission.academicYear })
  }));

  let imported = 0;
  let failed = 0;
  try {
    const result = await Student.insertMany(documents, { ordered: false });
    imported = result.length;
  } catch (error) {
    const inserted = (error as { insertedDocs?: unknown[] }).insertedDocs;
    imported = Array.isArray(inserted) ? inserted.length : documents.length;
    failed = documents.length - imported;
  }

  const count = await Student.countDocuments({ submissionId: submission._id, instituteId });
  submission.studentCount = count;
  submission.validStudentCount = count;
  submission.studentsConfirmed = true;
  if (submission.status === 'PREMIUM_CALCULATED') submission.status = 'VALIDATED';
  submission.premiumCalculationId = null;
  await submission.save();
  job.imported = true;
  job.validRows = [];
  await job.save();

  await writeAudit({
    userId: user.id,
    action: 'SUBMISSION_STUDENTS_CONFIRMED',
    entity: 'DataSubmission',
    entityId: String(submission._id),
    req,
    metadata: { studentCount: count, failed, instituteId }
  });
  invalidateDashboardCache();
  return { studentCount: count, imported, failed, status: submission.status };
}

export async function calculateSubmissionPremium(user: AuthUser, id: string, req: Request, asAdmin = false) {
  const loaded = asAdmin
    ? { submission: await loadAdminSubmission(id), instituteId: '', universityId: '' }
    : await loadCollegeSubmission(user, id);
  const submission = loaded.submission;
  if (!asAdmin && !isEditable(submission.status)) {
    throw new AppError('This submission is locked and cannot be recalculated.', 409, 'SUBMISSION_LOCKED');
  }
  if (asAdmin && isLocked(submission.status) && submission.status !== 'CORRECTION_REQUIRED') {
    throw new AppError('Submitted premium is retained. Recalculation is not allowed for this status.', 409, 'SUBMISSION_LOCKED');
  }
  if (!submission.studentsConfirmed) {
    throw new AppError('Confirm student data before calculating premium.', 400, 'CONFIRM_REQUIRED');
  }
  const studentCount = await Student.countDocuments({ submissionId: submission._id, instituteId: submission.instituteId });
  submission.studentCount = studentCount;
  const hadCalculation = Boolean(submission.lastCalculatedAt);
  const calc = await calculatePremiumForSubmission({
    submissionId: String(submission._id),
    instituteId: String(submission.instituteId),
    universityId: String(submission.universityId),
    academicYear: submission.academicYear,
    studentCount,
    calculatedBy: user.id
  });
  submission.premiumCalculationId = calc._id;
  submission.lastCalculatedAt = calc.calculatedAt;
  if (calc.calculationStatus === 'COMPLETE') {
    submission.status = submission.status === 'CORRECTION_REQUIRED' ? 'CORRECTION_REQUIRED' : 'PREMIUM_CALCULATED';
  }
  await submission.save();
  await writeAudit({
    userId: user.id,
    action: hadCalculation ? 'SUBMISSION_PREMIUM_RECALCULATED' : 'SUBMISSION_PREMIUM_CALCULATED',
    entity: 'DataSubmission',
    entityId: String(submission._id),
    req,
    metadata: {
      studentCount,
      ruleVersion: calc.ruleVersion,
      calculationStatus: calc.calculationStatus,
      totalPremium: calc.totalPremium
    }
  });
  return toPremiumDto(calc);
}

export async function submitCollegeSubmission(user: AuthUser, id: string, req: Request) {
  const { submission, instituteId } = await loadCollegeSubmission(user, id);
  if (submission.status === 'SUBMITTED' || submission.status === 'UNDER_REVIEW' || submission.status === 'APPROVED') {
    return { ...toSummary(submission), idempotent: true };
  }
  if (!submission.studentsConfirmed) {
    throw new AppError('Confirm student data before submitting.', 400, 'CONFIRM_REQUIRED');
  }
  const studentCount = await Student.countDocuments({ submissionId: submission._id, instituteId });
  if (studentCount < 1) {
    throw new AppError('Confirmed student records are required.', 400, 'NO_STUDENTS');
  }
  if (!submission.premiumCalculationId) {
    throw new AppError('Calculate premium before submitting.', 400, 'PREMIUM_REQUIRED');
  }
  const premium = await PremiumCalculation.findOne({
    _id: submission.premiumCalculationId,
    submissionId: submission._id,
    superseded: false
  });
  if (!premium || premium.calculationStatus !== 'COMPLETE') {
    throw new AppError('Premium calculation configuration requires official verification.', 400, 'PREMIUM_INCOMPLETE');
  }
  if (!SUBMIT_FROM.includes(submission.status as (typeof SUBMIT_FROM)[number])) {
    throw new AppError('This submission cannot be submitted in its current status.', 409, 'INVALID_STATUS');
  }

  const previousStatus = submission.status;
  const submitted = await DataSubmission.findOneAndUpdate(
    {
      _id: submission._id,
      instituteId,
      status: { $in: ['PREMIUM_CALCULATED', 'CORRECTION_REQUIRED'] }
    },
    {
      $set: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedBy: user.id,
        studentCount,
        reviewComment: ''
      }
    },
    { new: true }
  );
  if (!submitted) {
    const current = await DataSubmission.findOne({ _id: submission._id, instituteId });
    if (current && (current.status === 'SUBMITTED' || current.status === 'UNDER_REVIEW' || current.status === 'APPROVED')) {
      return { ...toSummary(current), idempotent: true };
    }
    throw new AppError('This submission cannot be submitted in its current status.', 409, 'INVALID_STATUS');
  }

  if (previousStatus === 'CORRECTION_REQUIRED') {
    submitted.version = (submitted.version || 1) + 1;
    await submitted.save();
  }
  await snapshotVersion(submitted, user.id);
  await writeAudit({
    userId: user.id,
    action: previousStatus === 'CORRECTION_REQUIRED' ? 'SUBMISSION_RESUBMITTED' : 'SUBMISSION_SUBMITTED',
    entity: 'DataSubmission',
    entityId: String(submitted._id),
    req,
    metadata: {
      submissionNumber: submitted.submissionNumber,
      studentCount,
      premium: premium.totalPremium,
      ruleVersion: premium.ruleVersion,
      instituteId
    }
  });
  invalidateDashboardCache();
  await notifyAdmins({
    type: 'SUBMISSION_RECEIVED',
    title: 'New college submission received.',
    message: 'Submission {{applicationId}} from {{instituteName}} is ready for review.',
    instituteId,
    universityId: String(submitted.universityId),
    relatedEntityType: 'DataSubmission',
    relatedEntityId: String(submitted._id),
    actionUrl: `/admin/submissions/${String(submitted._id)}`,
    reminderKey: `submission-received:${String(submitted._id)}:${submitted.version}`,
    vars: { applicationId: submitted.submissionNumber, instituteName: '', status: 'SUBMITTED' }
  }).catch(() => 0);
  return toSummary(submitted, premium);
}

export async function reviewAdminSubmission(admin: AuthUser, id: string, input: AdminReviewInput, req: Request) {
  const submission = await loadAdminSubmission(id);
  const now = new Date();
  if (input.action === 'START_REVIEW') {
    if (submission.status !== 'SUBMITTED' && submission.status !== 'UNDER_REVIEW') {
      throw new AppError('Only submitted records can be moved to review.', 409, 'INVALID_STATUS');
    }
    const updated = await DataSubmission.findOneAndUpdate(
      { _id: submission._id, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      { $set: { status: 'UNDER_REVIEW', reviewedBy: admin.id, reviewedAt: now } },
      { new: true }
    );
    await writeAudit({
      userId: admin.id,
      action: 'SUBMISSION_REVIEW_STARTED',
      entity: 'DataSubmission',
      entityId: id,
      req,
      metadata: {}
    });
    return toSummary(updated || submission);
  }

  if (input.action === 'APPROVE') {
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
      throw new AppError('This submission cannot be approved in its current status.', 409, 'INVALID_STATUS');
    }
    const updated = await DataSubmission.findOneAndUpdate(
      { _id: submission._id, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      { $set: { status: 'APPROVED', reviewedBy: admin.id, reviewedAt: now, reviewComment: input.reason || '' } },
      { new: true }
    );
    await writeAudit({
      userId: admin.id,
      action: 'SUBMISSION_APPROVED',
      entity: 'DataSubmission',
      entityId: id,
      req,
      metadata: { reason: input.reason || '' }
    });
    await notifyInstituteUsers(String(submission.instituteId), {
      type: 'SUBMISSION_APPROVED',
      title: 'Your data submission was approved.',
      message: 'Submission {{applicationId}} status: {{status}}.',
      universityId: String(submission.universityId),
      relatedEntityType: 'DataSubmission',
      relatedEntityId: id,
      actionUrl: `/college/submissions/${id}`,
      reminderKey: `submission-approved:${id}:${Date.now()}`,
      vars: { applicationId: submission.submissionNumber, status: 'APPROVED' }
    }).catch(() => 0);
    invalidateDashboardCache();
    return toSummary(updated || submission);
  }

  if (input.action === 'REJECT') {
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
      throw new AppError('This submission cannot be rejected in its current status.', 409, 'INVALID_STATUS');
    }
    const updated = await DataSubmission.findOneAndUpdate(
      { _id: submission._id, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      { $set: { status: 'REJECTED', reviewedBy: admin.id, reviewedAt: now, reviewComment: input.reason } },
      { new: true }
    );
    await writeAudit({
      userId: admin.id,
      action: 'SUBMISSION_REJECTED',
      entity: 'DataSubmission',
      entityId: id,
      req,
      metadata: { reason: input.reason }
    });
    await notifyInstituteUsers(String(submission.instituteId), {
      type: 'SUBMISSION_REJECTED',
      title: 'Your data submission was rejected.',
      message: 'Submission {{applicationId}} status: {{status}}.',
      universityId: String(submission.universityId),
      relatedEntityType: 'DataSubmission',
      relatedEntityId: id,
      actionUrl: `/college/submissions/${id}`,
      reminderKey: `submission-rejected:${id}:${Date.now()}`,
      vars: { applicationId: submission.submissionNumber, status: 'REJECTED' }
    }).catch(() => 0);
    invalidateDashboardCache();
    return toSummary(updated || submission);
  }

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status)) {
    throw new AppError('Correction can only be requested for a submitted record.', 409, 'INVALID_STATUS');
  }
  await snapshotVersion(submission, admin.id);
  const updated = await DataSubmission.findOneAndUpdate(
    { _id: submission._id, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    {
      $set: {
        status: 'CORRECTION_REQUIRED',
        reviewedBy: admin.id,
        reviewedAt: now,
        reviewComment: input.reason,
        submittedAt: submission.submittedAt,
        studentsConfirmed: true,
        premiumCalculationId: null
      }
    },
    { new: true }
  );
  await writeAudit({
    userId: admin.id,
    action: 'SUBMISSION_CORRECTION_REQUESTED',
    entity: 'DataSubmission',
    entityId: id,
    req,
    metadata: { reason: input.reason, version: submission.version }
  });
  await notifyInstituteUsers(String(submission.instituteId), {
    type: 'SUBMISSION_CORRECTION_REQUIRED',
    title: 'Correction required for your submission.',
    message: 'Submission {{applicationId}} requires correction.',
    universityId: String(submission.universityId),
    relatedEntityType: 'DataSubmission',
    relatedEntityId: id,
    actionUrl: `/college/submissions/${id}`,
    reminderKey: `submission-correction:${id}:${Date.now()}`,
    vars: { applicationId: submission.submissionNumber, status: 'CORRECTION_REQUIRED' }
  }).catch(() => 0);
  invalidateDashboardCache();
  return toSummary(updated || submission);
}

export async function listSubmissionStudents(user: AuthUser, id: string, query: SubmissionStudentQuery) {
  const { submission, instituteId } = await loadCollegeSubmission(user, id);
  return listSubmissionStudentsInternal(String(submission._id), instituteId, query);
}

export async function listAdminSubmissionStudents(id: string, query: SubmissionStudentQuery) {
  const submission = await loadAdminSubmission(id);
  return listSubmissionStudentsInternal(String(submission._id), String(submission.instituteId), query);
}

async function listSubmissionStudentsInternal(submissionId: string, instituteId: string, query: SubmissionStudentQuery) {
  const filter: Record<string, unknown> = { submissionId, instituteId };
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ studentId: rx }, { enrollmentNumber: rx }, { firstName: rx }, { lastName: rx }, { rollNumber: rx }];
  }
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select('studentId enrollmentNumber rollNumber firstName middleName lastName course academicYear mobile gender year status')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(query.limit)
  ]);
  return {
    items: rows.map((row) => ({
      id: String(row._id),
      studentId: row.studentId,
      enrollmentNumber: row.enrollmentNumber,
      rollNumber: row.rollNumber,
      name: fullName(row),
      course: row.course,
      academicYear: row.academicYear,
      mobile: row.mobile,
      gender: row.gender,
      year: row.year,
      status: row.status,
      valid: true
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function assertStudentUnlocked(student: { submissionId?: mongoose.Types.ObjectId | null }) {
  if (!student.submissionId) return;
  const submission = await DataSubmission.findById(student.submissionId).select('status');
  if (submission && isLocked(submission.status)) {
    throw new AppError('This student is part of a submitted record and cannot be changed.', 409, 'SUBMISSION_LOCKED');
  }
}

export async function exportAdminSubmissions(query: SubmissionListQuery) {
  const result = await listSubmissions({ ...query, page: 1, limit: env.MAX_EXPORT_ROWS });
  const headers = ['Submission Number', 'University', 'Institute', 'Academic Year', 'Student Count', 'Premium', 'Status', 'Submitted Date'];
  const rows = result.items.map((item) => [
    item.submissionNumber,
    item.university.name,
    item.institute.name,
    item.academicYear,
    item.studentCount,
    item.premium ?? '',
    item.status,
    item.submittedAt ? new Date(item.submittedAt).toISOString() : ''
  ]);
  return { headers, rows, filename: 'submissions' };
}

export async function buildSubmissionExportFile(query: SubmissionListQuery, format: 'csv' | 'xlsx') {
  const report = await exportAdminSubmissions(query);
  if (format === 'csv') {
    const csvEscape = (value: unknown) => {
      const text = neutralizeSpreadsheetFormula(value);
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const body = [report.headers, ...report.rows].map((line) => line.map(csvEscape).join(',')).join('\n');
    return { filename: 'submissions.csv', contentType: 'text/csv; charset=utf-8', buffer: Buffer.from(body, 'utf8') };
  }
  const sheet = XLSX.utils.aoa_to_sheet([report.headers, ...report.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Submissions');
  return {
    filename: 'submissions.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  };
}

