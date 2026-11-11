import type { Request } from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { Institute } from '../models/Institute.js';
import { Student } from '../models/Student.js';
import { UploadJob } from '../models/UploadJob.js';
import { User } from '../models/User.js';
import { reviewExcelWithAi } from '../ai/validation/excelAi.js';
import { writeAudit } from './auditService.js';
import { requireCollegeInstituteId } from './instituteService.js';
import { createNotification } from '../notifications/notification.service.js';
import { invalidateDashboardCache } from '../analytics/analytics.service.js';
import { assertExcelFileSize, excelLimits } from '../config/excelLimits.js';
import { getAcademicYearConfig } from '../config/academicYear.js';
import {
  buildErrorWorkbook,
  buildStudentTemplate,
  parseStudentWorkbook,
  serializeExcelValidRows,
  studentDocumentFromParsedRow,
  type ExcelIssue,
  type ParsedStudentRow
} from './excelService.js';
import { safeUploadFilename } from '../utils/spreadsheet.js';
import type { AuthUser } from '../types/auth.js';
import type { AdminStudentListQuery, StudentListQuery, StudentUpdateInput, StudentWriteInput } from '../validators/studentValidators.js';
import { computeInsurerPremium, insurerPremiumOptions, POLICY_DOCUMENTS } from '../data/insurerPremiumCatalog.js';
import { policyDocumentDir, rememberPolicyDocument } from './policyDocumentStorage.js';
import { isOnlinePaymentEnabled } from '../payments/gatewayConfig.js';

const LIST_FIELDS =
  'studentId enrollmentNumber rollNumber firstName middleName lastName gender course stream year semester academicYear mobile email status instituteId universityId createdAt updatedAt';

function fullName(student: { firstName: string; middleName?: string | null; lastName: string }): string {
  const first = student.firstName?.trim() || '';
  const middle = student.middleName?.trim() || '';
  const last = student.lastName?.trim() || '';
  if (last && last.toLowerCase() === first.toLowerCase() && !middle) return first;
  return [first, middle, last].filter(Boolean).join(' ');
}

function toStudentSummary(student: {
  _id: mongoose.Types.ObjectId;
  studentId: string;
  enrollmentNumber: string;
  rollNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  course: string;
  year: string;
  academicYear: string;
  mobile: string;
  status: string;
}) {
  return {
    id: String(student._id),
    studentId: student.studentId,
    enrollmentNumber: student.enrollmentNumber,
    rollNumber: student.rollNumber,
    name: fullName(student),
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender,
    course: student.course,
    year: student.year,
    academicYear: student.academicYear,
    mobile: student.mobile,
    status: student.status
  };
}

function toStudentDetail(
  student: {
    _id: mongoose.Types.ObjectId;
    studentId: string;
    enrollmentNumber: string;
    rollNumber: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender: string;
    dateOfBirth: Date;
    mobile: string;
    email?: string | null;
    course: string;
    stream?: string | null;
    year: string;
    semester?: string | null;
    academicYear: string;
    address?: string | null;
    parentName?: string | null;
    parentMobile?: string | null;
    category?: string | null;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
    instituteId: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string };
    universityId: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string; code?: string | null; shortName?: string | null };
  },
  options?: { includeOwnership?: boolean }
) {
  const base = {
    id: String(student._id),
    studentId: student.studentId,
    enrollmentNumber: student.enrollmentNumber,
    rollNumber: student.rollNumber,
    firstName: student.firstName,
    middleName: student.middleName || '',
    lastName: student.lastName,
    name: fullName(student),
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    mobile: student.mobile,
    email: student.email || '',
    course: student.course,
    stream: student.stream || '',
    year: student.year,
    semester: student.semester || '',
    academicYear: student.academicYear,
    address: student.address || '',
    parentName: student.parentName || '',
    parentMobile: student.parentMobile || '',
    category: student.category || '',
    status: student.status,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt
  };

  if (!options?.includeOwnership) {
    return base;
  }

  const institute =
    student.instituteId && typeof student.instituteId === 'object' && 'name' in student.instituteId
      ? { id: String(student.instituteId._id), name: student.instituteId.name }
      : { id: String(student.instituteId), name: '' };
  const university =
    student.universityId && typeof student.universityId === 'object' && 'name' in student.universityId
      ? {
          id: String(student.universityId._id),
          name: student.universityId.name,
          code: student.universityId.code || null,
          shortName: student.universityId.shortName || ''
        }
      : { id: String(student.universityId), name: '', code: null, shortName: '' };

  return { ...base, institute, university };
}

async function collegeOwnership(user: AuthUser) {
  const instituteId = requireCollegeInstituteId(user);
  const institute = await Institute.findById(instituteId).select('universityId status');
  if (!institute || institute.status !== 'ACTIVE') {
    throw new AppError('This institute is not allowed to manage students.', 403, 'FORBIDDEN');
  }
  return { instituteId, universityId: String(institute.universityId) };
}

function listFilter(query: StudentListQuery, extra: Record<string, unknown> = {}) {
  const filter: Record<string, unknown> = { ...extra };
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.course) filter.course = query.course;
  if (query.stream) filter.stream = query.stream;
  if (query.year) filter.year = query.year;
  if (query.semester) filter.semester = query.semester;
  if (query.gender) filter.gender = query.gender;
  if (query.status) filter.status = query.status;
  if (query.submissionId) filter.submissionId = query.submissionId;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [
      { studentId: rx },
      { enrollmentNumber: rx },
      { rollNumber: rx },
      { firstName: rx },
      { middleName: rx },
      { lastName: rx },
      { mobile: rx },
      { email: rx }
    ];
  }
  return filter;
}

async function assertNoDuplicate(
  instituteId: string,
  input: Pick<StudentWriteInput, 'studentId' | 'enrollmentNumber' | 'rollNumber' | 'academicYear'>,
  excludeId?: string
) {
  const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
  const [studentIdHit, enrollmentHit, rollHit] = await Promise.all([
    Student.findOne({ instituteId, studentId: input.studentId, ...notSelf }).select('_id'),
    Student.findOne({ instituteId, enrollmentNumber: input.enrollmentNumber, ...notSelf }).select('_id'),
    Student.findOne({ instituteId, academicYear: input.academicYear, rollNumber: input.rollNumber, ...notSelf }).select('_id')
  ]);
  if (studentIdHit) {
    throw new AppError('Student ID already exists for this institute.', 409, 'DUPLICATE_STUDENT_ID');
  }
  if (enrollmentHit) {
    throw new AppError('Enrollment Number already exists for this institute.', 409, 'DUPLICATE_ENROLLMENT');
  }
  if (rollHit) {
    throw new AppError('Roll Number already exists for this academic year at this institute.', 409, 'DUPLICATE_ROLL');
  }
}

export async function getStudentCounts(instituteId: string) {
  const [total, active, inactive] = await Promise.all([
    Student.countDocuments({ instituteId }),
    Student.countDocuments({ instituteId, status: 'ACTIVE' }),
    Student.countDocuments({ instituteId, status: 'INACTIVE' })
  ]);
  return { total, active, inactive };
}

export async function listCollegeStudents(user: AuthUser, query: StudentListQuery) {
  const { instituteId } = await collegeOwnership(user);
  const filter = listFilter(query, { instituteId });
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter).select(LIST_FIELDS).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(query.limit)
  ]);
  return {
    items: rows.map((row) => toStudentSummary(row)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function getCollegeStudent(user: AuthUser, id: string) {
  const { instituteId } = await collegeOwnership(user);
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const student = await Student.findOne({ _id: id, instituteId });
  if (!student) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  return toStudentDetail(student);
}

export async function createCollegeStudent(user: AuthUser, input: StudentWriteInput, req: Request) {
  const { instituteId, universityId } = await collegeOwnership(user);
  await assertNoDuplicate(instituteId, input);
  try {
    const student = await Student.create({
      ...input,
      status: input.status ?? 'ACTIVE',
      instituteId,
      universityId
    });
    await writeAudit({
      userId: user.id,
      action: 'STUDENT_CREATED',
      entity: 'Student',
      entityId: String(student._id),
      req,
      metadata: { studentId: student.studentId, enrollmentNumber: student.enrollmentNumber }
    });
    return toStudentDetail(student);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new AppError('A student with this identifier already exists for this institute.', 409, 'DUPLICATE_STUDENT');
    }
    throw error;
  }
}

export async function updateCollegeStudent(user: AuthUser, id: string, input: StudentUpdateInput, req: Request) {
  const { instituteId } = await collegeOwnership(user);
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const existing = await Student.findOne({ _id: id, instituteId });
  if (!existing) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const { assertStudentUnlocked } = await import('./submissionService.js');
  await assertStudentUnlocked(existing);

  const next = {
    studentId: input.studentId ?? existing.studentId,
    enrollmentNumber: input.enrollmentNumber ?? existing.enrollmentNumber,
    rollNumber: input.rollNumber ?? existing.rollNumber,
    academicYear: input.academicYear ?? existing.academicYear
  };
  await assertNoDuplicate(instituteId, next, id);

  const previousStatus = existing.status;
  Object.assign(existing, input);
  existing.instituteId = new mongoose.Types.ObjectId(instituteId);
  await existing.save();

  const statusChanged = input.status && input.status !== previousStatus;
  await writeAudit({
    userId: user.id,
    action: statusChanged ? 'STUDENT_STATUS_CHANGED' : 'STUDENT_UPDATED',
    entity: 'Student',
    entityId: id,
    req,
    metadata: { fields: Object.keys(input), ...(statusChanged ? { from: previousStatus, to: input.status } : {}) }
  });
  return toStudentDetail(existing);
}

export async function updateCollegeStudentStatus(user: AuthUser, id: string, status: 'ACTIVE' | 'INACTIVE', req: Request) {
  return updateCollegeStudent(user, id, { status }, req);
}

export async function listAdminStudents(query: AdminStudentListQuery) {
  const extra: Record<string, unknown> = {};
  if (query.instituteId) extra.instituteId = query.instituteId;
  if (query.universityId) extra.universityId = query.universityId;
  const filter = listFilter(query, extra);
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Student.countDocuments(filter),
    Student.find(filter)
      .select(LIST_FIELDS)
      .populate('instituteId', 'name')
      .populate('universityId', 'name code shortName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
  ]);

  return {
    items: rows.map((row) => {
      const institute =
        row.instituteId && typeof row.instituteId === 'object' && 'name' in row.instituteId
          ? { id: String((row.instituteId as { _id: mongoose.Types.ObjectId })._id), name: (row.instituteId as { name: string }).name }
          : { id: String(row.instituteId), name: '' };
      const university =
        row.universityId && typeof row.universityId === 'object' && 'name' in row.universityId
          ? {
              id: String((row.universityId as { _id: mongoose.Types.ObjectId })._id),
              name: (row.universityId as { name: string }).name
            }
          : { id: String(row.universityId), name: '' };
      return { ...toStudentSummary(row), institute, university };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function getAdminStudent(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const student = await Student.findById(id).populate('instituteId', 'name').populate('universityId', 'name code shortName');
  if (!student) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  return toStudentDetail(student, { includeOwnership: true });
}

export async function updateAdminStudentStatus(id: string, status: 'ACTIVE' | 'INACTIVE', admin: AuthUser, req: Request) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const student = await Student.findById(id);
  if (!student) {
    throw new AppError('Student not found', 404, 'NOT_FOUND');
  }
  const previous = student.status;
  student.status = status;
  await student.save();
  await writeAudit({
    userId: admin.id,
    action: 'STUDENT_STATUS_CHANGED',
    entity: 'Student',
    entityId: id,
    req,
    metadata: { from: previous, to: status }
  });
  return getAdminStudent(id);
}

export function studentTemplateFile() {
  return {
    filename: 'SVYSY_Student_Upload_Template.xlsx',
    buffer: buildStudentTemplate()
  };
}

function serializeValidRows(rows: ParsedStudentRow[]) {
  return serializeExcelValidRows(rows);
}

export async function previewCollegeExcel(user: AuthUser, file: Express.Multer.File | undefined, req: Request) {
  if (!file) {
    throw new AppError('Select an Excel file to upload.', 400, 'NO_FILE');
  }
  assertExcelFileSize(file.size);
  const { instituteId, universityId } = await collegeOwnership(user);
  const yearConfig = await getAcademicYearConfig();
  const parsed = parseStudentWorkbook(file.buffer, { academicYear: yearConfig.current });

  const remaining = parsed.validRows;
  const dbIssues: ExcelIssue[] = [];
  if (remaining.length) {
    const studentIds = remaining.map((row) => row.studentId);
    const enrollments = remaining.map((row) => row.enrollmentNumber);
    const existing = await Student.find({
      instituteId,
      $or: [{ studentId: { $in: studentIds } }, { enrollmentNumber: { $in: enrollments } }]
    }).select('studentId enrollmentNumber rollNumber academicYear');

    const studentIdSet = new Set(existing.map((row) => row.studentId.toLowerCase()));
    const enrollmentSet = new Set(existing.map((row) => row.enrollmentNumber.toLowerCase()));
    const rollKeys = new Set(existing.map((row) => `${row.academicYear}:${row.rollNumber.toLowerCase()}`));

    const stillValid: ParsedStudentRow[] = [];
    for (const row of remaining) {
      if (studentIdSet.has(row.studentId.toLowerCase())) {
        dbIssues.push({
          row: row.sourceRow,
          identifier: row.studentId,
          message: 'Student ID already exists.',
          kind: 'duplicate'
        });
        continue;
      }
      if (enrollmentSet.has(row.enrollmentNumber.toLowerCase())) {
        dbIssues.push({
          row: row.sourceRow,
          identifier: row.enrollmentNumber,
          message: 'Enrollment Number already exists.',
          kind: 'duplicate'
        });
        continue;
      }
      if (rollKeys.has(`${row.academicYear}:${row.rollNumber.toLowerCase()}`)) {
        dbIssues.push({
          row: row.sourceRow,
          identifier: row.rollNumber,
          message: 'Roll Number already exists for this academic year.',
          kind: 'duplicate'
        });
        continue;
      }
      stillValid.push(row);
    }
    parsed.validRows.length = 0;
    parsed.validRows.push(...stillValid);
    parsed.issues.push(...dbIssues);
    parsed.duplicateCount += dbIssues.length;
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const job = await UploadJob.create({
    instituteId,
    universityId,
    uploadedBy: user.id,
    filename: safeUploadFilename(file.originalname),
    totalRows: parsed.totalRows,
    validCount: parsed.validRows.length,
    invalidCount: parsed.invalidCount,
    duplicateCount: parsed.duplicateCount,
    validRows: serializeValidRows(parsed.validRows),
    issues: parsed.issues,
    imported: false,
    expiresAt
  });

  await writeAudit({
    userId: user.id,
    action: 'STUDENT_EXCEL_UPLOADED',
    entity: 'UploadJob',
    entityId: String(job._id),
    req,
    metadata: {
      filename: safeUploadFilename(file.originalname),
      rowCount: parsed.totalRows,
      validCount: parsed.validRows.length,
      invalidCount: parsed.invalidCount,
      duplicateCount: parsed.duplicateCount
    }
  });

  try {
    await syncUploadWorkflow(user, req, String(job._id), String(instituteId), String(universityId), 'preview');
  } catch {
    /* Excel preview remains valid if the overlay workflow cannot be recorded. */
  }

  return {
    jobId: String(job._id),
    filename: safeUploadFilename(file.originalname),
    totalRows: parsed.totalRows,
    valid: parsed.validRows.length,
    invalid: parsed.invalidCount,
    duplicates: parsed.duplicateCount,
    issues: parsed.issues.slice(0, 200),
    preview: parsed.validRows.slice(0, 20).map((row) => ({
      row: row.sourceRow,
      studentId: row.studentId,
      enrollmentNumber: row.enrollmentNumber,
      name: fullName(row),
      gender: row.gender,
      mobile: row.mobile,
      course: row.course,
      academicYear: row.academicYear
    })),
    aiSuggestions: reviewExcelWithAi(parsed.validRows, parsed.issues),
    aiSuggestionsNote:
      'AI-generated assistance only. Suggestions are not applied automatically. Confirm through normal validation before import.',
    limits: excelLimits(),
    expiresAt,
    workflow: {
      totalRows: parsed.totalRows,
      validRows: parsed.validRows.length,
      invalidRows: parsed.invalidCount,
      duplicateRows: parsed.duplicateCount
    }
  };
}

async function syncUploadWorkflow(
  user: AuthUser,
  req: Request,
  jobId: string,
  instituteId: string,
  universityId: string,
  action: 'preview' | 'imported' | 'failed'
) {
  const { applyWorkflowAction, ensureWorkflowInstance } = await import('../workflow/engine.js');
  await ensureWorkflowInstance({
    workflowType: 'STUDENT_UPLOAD',
    entityId: jobId,
    instituteId,
    universityId,
    initialState: action === 'preview' ? 'VALIDATING' : 'VALIDATION_COMPLETE'
  });
  if (action === 'preview') {
    await applyWorkflowAction(user, { workflowType: 'STUDENT_UPLOAD', entityId: jobId, action: 'COMPLETE' }, req);
    return;
  }
  await applyWorkflowAction(user, { workflowType: 'STUDENT_UPLOAD', entityId: jobId, action: 'SUBMIT' }, req);
  await applyWorkflowAction(
    user,
    { workflowType: 'STUDENT_UPLOAD', entityId: jobId, action: action === 'failed' ? 'REJECT' : 'COMPLETE' },
    req
  );
}

async function saveImportedStudents(
  job: InstanceType<typeof UploadJob>,
  user: AuthUser,
  req?: Request
) {
  const instituteId = job.instituteId;
  const universityId = job.universityId;
  const rows = (job.validRows as Array<StudentWriteInput & { sourceRow?: number; dateOfBirth: string | Date }>) ?? [];
  if (!rows.length) {
    await UploadJob.updateOne({ _id: job._id }, { $set: { imported: false } });
    throw new AppError('There are no valid rows to import.', 400, 'NO_VALID_ROWS');
  }

  const documents = rows.map((row) => ({
    instituteId,
    universityId,
    ...studentDocumentFromParsedRow(row)
  }));

  let imported = 0;
  let failed = 0;
  try {
    const result = await Student.insertMany(documents, { ordered: false });
    imported = result.length;
  } catch (error) {
    const inserted = (error as { insertedDocs?: unknown[] }).insertedDocs;
    if (Array.isArray(inserted)) {
      imported = inserted.length;
    } else if (error && typeof error === 'object' && 'result' in error) {
      const n = (error as { result?: { nInserted?: number } }).result?.nInserted;
      imported = typeof n === 'number' ? n : 0;
    }
    failed = documents.length - imported;
    if (imported === 0) {
      await UploadJob.updateOne({ _id: job._id }, { $set: { imported: false } });
      throw error;
    }
  }

  job.imported = true;
  job.validRows = [];
  await job.save();

  if (req) {
    try {
      await syncUploadWorkflow(
        user,
        req,
        String(job._id),
        String(instituteId),
        String(universityId),
        imported === 0 && failed > 0 ? 'failed' : 'imported'
      );
    } catch {
      /* Import result is already stored. */
    }
  }

  await writeAudit({
    userId: user.id,
    action: 'STUDENT_EXCEL_IMPORTED',
    entity: 'UploadJob',
    entityId: String(job._id),
    req,
    metadata: {
      filename: job.filename,
      rowCount: job.totalRows,
      successCount: imported,
      failureCount: failed,
      skippedCount: job.invalidCount + job.duplicateCount
    }
  });
  invalidateDashboardCache();
  await createNotification({
    recipientUserId: user.id,
    type: failed > 0 && imported === 0 ? 'STUDENT_UPLOAD_FAILED' : 'STUDENT_UPLOAD_COMPLETED',
    title: failed > 0 && imported === 0 ? 'Student upload failed' : 'Student upload completed',
    message: 'Excel import finished. Status: {{status}}.',
    instituteId: String(instituteId),
    universityId: String(universityId),
    relatedEntityType: 'UploadJob',
    relatedEntityId: String(job._id),
    actionUrl: '/college/students',
    vars: { status: `${imported} imported, ${failed} failed`, count: imported }
  });

  return {
    jobId: String(job._id),
    filename: job.filename,
    totalRows: job.totalRows,
    imported,
    skipped: job.invalidCount + job.duplicateCount,
    failed,
    duplicates: job.duplicateCount,
    invalid: job.invalidCount
  };
}

async function claimUploadForImport(jobId: string, instituteId?: mongoose.Types.ObjectId | string) {
  const filter: Record<string, unknown> = { _id: jobId, imported: { $ne: true } };
  if (instituteId) filter.instituteId = instituteId;
  return UploadJob.findOneAndUpdate(filter, { $set: { imported: true } }, { new: true });
}

export async function importCollegeExcel(user: AuthUser, jobId: string, req: Request) {
  const { instituteId } = await collegeOwnership(user);
  if (!mongoose.isValidObjectId(jobId)) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  const existing = await UploadJob.findOne({ _id: jobId, instituteId });
  if (!existing) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  if (existing.imported) {
    throw new AppError('This file has already been imported.', 409, 'ALREADY_IMPORTED');
  }
  if (existing.expiresAt.getTime() < Date.now()) {
    throw new AppError('The upload preview has expired. Upload the file again.', 410, 'PREVIEW_EXPIRED');
  }
  if (existing.paymentStatus !== 'PAID' && (await isOnlinePaymentEnabled())) {
    throw new AppError('Pay the premium online before importing these students.', 402, 'PAYMENT_REQUIRED');
  }
  const job = await claimUploadForImport(jobId, instituteId);
  if (!job) {
    throw new AppError('This file has already been imported.', 409, 'ALREADY_IMPORTED');
  }
  return saveImportedStudents(job, user, req);
}

/** Saves the validated students once payment is confirmed. Safe to call more than once. */
export async function importPaidUploadJob(jobId: string, req?: Request) {
  if (!mongoose.isValidObjectId(jobId)) return null;
  const existing = await UploadJob.findById(jobId);
  if (!existing || existing.imported) return null;
  const rows = existing.validRows as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const job = await claimUploadForImport(jobId);
  if (!job) return null;
  const uploader = await User.findById(job.uploadedBy).select('name email');
  const user: AuthUser = {
    id: String(job.uploadedBy),
    name: uploader?.name || 'College',
    email: uploader?.email || '',
    role: 'COLLEGE',
    status: 'ACTIVE',
    instituteId: String(job.instituteId),
    universityId: String(job.universityId)
  };
  return saveImportedStudents(job, user, req);
}

export async function loadCollegeUploadJob(user: AuthUser, jobId: string) {
  const { instituteId } = await collegeOwnership(user);
  if (!mongoose.isValidObjectId(jobId)) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  const job = await UploadJob.findOne({ _id: jobId, instituteId });
  if (!job) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  if (job.expiresAt.getTime() < Date.now()) {
    throw new AppError('The upload preview has expired. Upload the file again.', 410, 'PREVIEW_EXPIRED');
  }
  return job;
}

function policyDocumentDto(row: { key: string; originalFilename: string; sizeBytes?: number | null; uploadedAt?: Date | null }) {
  const known = POLICY_DOCUMENTS.find((item) => item.key === row.key);
  return {
    key: row.key,
    label: known?.label || row.key,
    filename: row.originalFilename,
    sizeBytes: row.sizeBytes || 0,
    uploadedAt: row.uploadedAt ? new Date(row.uploadedAt).toISOString() : null
  };
}

export function assertPolicyDocumentsComplete(job: { policyDocuments?: Array<{ key?: string | null }> | null }) {
  const uploaded = new Set((job.policyDocuments || []).map((item) => item.key).filter(Boolean));
  const missing = POLICY_DOCUMENTS.filter((item) => !uploaded.has(item.key)).map((item) => item.label);
  if (missing.length) {
    throw new AppError(`Upload the remaining documents before payment: ${missing.join(', ')}.`, 400, 'DOCUMENTS_REQUIRED');
  }
}

export async function saveCollegePolicyDocument(
  user: AuthUser,
  input: { jobId: string; documentKey: string; file: Express.Multer.File | undefined },
  req?: Request
) {
  const known = POLICY_DOCUMENTS.find((item) => item.key === input.documentKey);
  if (!known) {
    throw new AppError('Select a valid document type.', 400, 'INVALID_DOCUMENT');
  }
  const file = input.file;
  if (!file?.buffer?.length) {
    throw new AppError('Select a PDF or image file.', 400, 'NO_FILE');
  }
  const name = file.originalname.toLowerCase();
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'].some((ext) => name.endsWith(ext));
  if (!allowed) {
    throw new AppError('Upload a PDF, JPG, or PNG file.', 400, 'INVALID_FILE_TYPE');
  }
  const job = await loadCollegeUploadJob(user, input.jobId);
  if (job.paymentStatus === 'PAID') {
    throw new AppError('Payment for this upload is already complete.', 409, 'ALREADY_PAID');
  }
  await mkdir(policyDocumentDir, { recursive: true });
  const ext = path.extname(file.originalname).slice(0, 8).toLowerCase() || '.bin';
  const storedName = `${String(job._id)}-${known.key}${ext}`;
  await writeFile(path.join(policyDocumentDir, storedName), file.buffer);
  const uploaded = {
    key: known.key,
    originalFilename: safeUploadFilename(file.originalname).slice(0, 180),
    storedName,
    mimeType: file.mimetype || '',
    sizeBytes: file.size,
    uploadedAt: new Date()
  };
  const kept = (job.policyDocuments || []).filter((item) => item.key !== known.key);
  job.set('policyDocuments', [
    ...kept.map((item) => ({
      key: item.key,
      originalFilename: item.originalFilename,
      storedName: item.storedName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      uploadedAt: item.uploadedAt
    })),
    uploaded
  ]);
  await job.save();
  const quote = job.premiumQuote as { insurerName?: string; policyLabel?: string } | null;
  await rememberPolicyDocument({
    instituteId: job.instituteId,
    uploadJobId: job._id,
    documentKey: known.key,
    originalFilename: uploaded.originalFilename,
    storedName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedAt: uploaded.uploadedAt,
    insurer: job.insurer,
    insurerName: quote?.insurerName,
    policyType: job.policyType,
    policyLabel: quote?.policyLabel,
    uploadFilename: job.filename
  });
  if (req) {
    await writeAudit({
      userId: user.id,
      action: 'STUDENT_UPLOAD_POLICY_DOCUMENT',
      entity: 'UploadJob',
      entityId: String(job._id),
      req,
      metadata: { documentKey: known.key, filename: safeUploadFilename(file.originalname) }
    });
  }
  return { documents: (job.policyDocuments || []).map(policyDocumentDto) };
}

export function collegePremiumOptions() {
  return insurerPremiumOptions();
}

export async function quoteCollegeUploadPremium(
  user: AuthUser,
  input: { jobId: string; insurer: string; policyType: string },
  req?: Request
) {
  const job = await loadCollegeUploadJob(user, input.jobId);
  if (job.paymentStatus === 'PAID') {
    throw new AppError('Payment for this upload is already complete, so the policy cannot be changed.', 409, 'ALREADY_PAID');
  }
  if (job.validCount < 1) {
    throw new AppError('Validate the Excel file and keep at least one valid student before selecting a policy.', 400, 'NO_VALID_ROWS');
  }
  const quote = computeInsurerPremium({
    insurer: input.insurer,
    policyType: input.policyType,
    studentCount: job.validCount
  });
  if (!quote) {
    throw new AppError('That insurer and policy combination is not available.', 400, 'INVALID_POLICY');
  }
  job.insurer = quote.insurer;
  job.policyType = quote.policyType;
  job.premiumQuote = quote;
  if (job.paymentStatus === 'NONE' || !job.paymentStatus || job.paymentStatus === 'PAYMENT_PENDING') {
    job.paymentStatus = 'QUOTED';
  }
  await job.save();
  if (req) {
    await writeAudit({
      userId: user.id,
      action: 'STUDENT_UPLOAD_PREMIUM_QUOTED',
      entity: 'UploadJob',
      entityId: String(job._id),
      req,
      metadata: {
        insurer: quote.insurer,
        policyType: quote.policyType,
        studentCount: quote.studentCount,
        totalPremium: quote.totalPremium
      }
    });
  }
  return { quote, paymentStatus: job.paymentStatus };
}

export async function requestCollegeUploadPayment(
  user: AuthUser,
  input: { jobId: string; insurer: string; policyType: string },
  req?: Request
) {
  const quoted = await quoteCollegeUploadPremium(user, input, req);
  const job = await loadCollegeUploadJob(user, input.jobId);
  assertPolicyDocumentsComplete(job);
  job.paymentStatus = 'AWAITING_PAYMENT_DETAILS';
  job.paymentRequestedAt = new Date();
  await job.save();
  if (req) {
    await writeAudit({
      userId: user.id,
      action: 'STUDENT_UPLOAD_PAYMENT_REQUESTED',
      entity: 'UploadJob',
      entityId: String(job._id),
      req,
      metadata: {
        insurer: quoted.quote.insurer,
        policyType: quoted.quote.policyType,
        totalPremium: quoted.quote.totalPremium
      }
    });
  }
  return {
    quote: quoted.quote,
    paymentStatus: job.paymentStatus,
    message: 'Online payment is not switched on yet. An administrator must save the Razorpay keys and enable online payment before this amount can be collected.'
  };
}

export async function collegeImportErrorFile(user: AuthUser, jobId: string) {
  const { instituteId } = await collegeOwnership(user);
  if (!mongoose.isValidObjectId(jobId)) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  const job = await UploadJob.findOne({ _id: jobId, instituteId });
  if (!job) {
    throw new AppError('Upload preview not found', 404, 'NOT_FOUND');
  }
  const issues = (job.issues as ExcelIssue[]) ?? [];
  return {
    filename: 'student_import_errors.xlsx',
    buffer: buildErrorWorkbook(issues)
  };
}
