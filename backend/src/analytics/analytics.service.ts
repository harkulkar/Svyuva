import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Document } from '../models/Document.js';
import { ECard } from '../models/ECard.js';
import { Institute } from '../models/Institute.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { Student } from '../models/Student.js';
import { University } from '../models/University.js';
import { createdAtFilter, resolveUtcRange, type UtcRange } from './dateRange.js';
import { getOperationsSnapshot } from '../services/operationsService.js';
import { getOperationalSettings } from '../settings/settings.service.js';

export type AnalyticsFilters = {
  range?: string;
  from?: string;
  to?: string;
  universityId?: string;
  instituteId?: string;
  status?: string;
};

function oid(id?: string): mongoose.Types.ObjectId | undefined {
  if (!id) return undefined;
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid identifier.', 400, 'VALIDATION_ERROR');
  return new mongoose.Types.ObjectId(id);
}

export function parseAnalyticsFilters(query: AnalyticsFilters, collegeInstituteId?: string) {
  const range = resolveUtcRange(query.range, query.from, query.to);
  const universityId = collegeInstituteId ? undefined : oid(query.universityId);
  const instituteId = collegeInstituteId ? oid(collegeInstituteId) : oid(query.instituteId);
  const status = query.status && typeof query.status === 'string' ? query.status.slice(0, 40) : undefined;
  return { range, universityId, instituteId, status };
}

function matchFrom(filters: ReturnType<typeof parseAnalyticsFilters>, extra: Record<string, unknown> = {}) {
  const match: Record<string, unknown> = { ...createdAtFilter(filters.range), ...extra };
  if (filters.universityId) match.universityId = filters.universityId;
  if (filters.instituteId) match.instituteId = filters.instituteId;
  if (filters.status) match.status = filters.status;
  return match;
}

async function groupCounts(model: any, match: Record<string, unknown>, field: string) {
  const rows = (await model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ])) as Array<{ _id: string | null; count: number }>;
  return rows.map((row) => ({ label: String(row._id || 'UNKNOWN'), count: row.count }));
}

async function monthly(model: any, match: Record<string, unknown>) {
  const rows = (await model.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 24 }
  ])) as Array<{ _id: string | null; count: number }>;
  return rows.map((row) => ({ label: String(row._id || 'Unknown'), count: row.count }));
}

async function namedLookup(
  model: any,
  match: Record<string, unknown>,
  local: 'universityId' | 'instituteId',
  from: 'universities' | 'institutes'
) {
  const rows = (await model.aggregate([
    { $match: match },
    { $group: { _id: `$${local}`, count: { $sum: 1 } } },
    { $lookup: { from, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $unwind: { path: '$ref', preserveNullAndEmptyArrays: true } },
    { $project: { _id: 0, name: { $ifNull: ['$ref.name', 'Unknown'] }, count: 1 } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ])) as Array<{ name: string; count: number }>;
  return rows.map((row) => ({ label: row.name, count: row.count }));
}

function countsMap(items: Array<{ label: string; count: number }>): Record<string, number> {
  const map: Record<string, number> = { total: 0 };
  for (const item of items) {
    map[item.label] = item.count;
    map.total = (map.total ?? 0) + item.count;
  }
  return map;
}

let summaryCache: { at: number; data: unknown } | null = null;

export async function getAdminAnalytics(query: AnalyticsFilters) {
  const filters = parseAnalyticsFilters(query);
  const instituteMatch = matchFrom(filters);
  const studentMatch = matchFrom(filters);
  const uniMatch: Record<string, unknown> = { ...createdAtFilter(filters.range) };
  if (filters.status && ['ACTIVE', 'INACTIVE'].includes(filters.status)) uniMatch.status = filters.status;

  const [
    universities,
    universityStatus,
    institutes,
    instituteStatus,
    institutesPerUniversity,
    students,
    studentStatus,
    studentsByUniversity,
    studentsByInstitute,
    studentsByDistrict,
    studentsByCollegeType,
    insuranceStatus,
    paymentStatus,
    documentStatus,
    ecardStatus,
    monthlyInstitutes,
    monthlyStudents,
    monthlyInsurance,
    monthlyPayments
  ] = await Promise.all([
    University.countDocuments(uniMatch),
    groupCounts(University, uniMatch, 'status'),
    Institute.countDocuments(instituteMatch),
    groupCounts(Institute, instituteMatch, 'status'),
    namedLookup(Institute, instituteMatch, 'universityId', 'universities'),
    Student.countDocuments(studentMatch),
    groupCounts(Student, studentMatch, 'status'),
    namedLookup(Student, studentMatch, 'universityId', 'universities'),
    namedLookup(Student, studentMatch, 'instituteId', 'institutes'),
    Institute.aggregate<{ _id: string; count: number }>([
      { $match: instituteMatch },
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).then((rows) => rows.map((row) => ({ label: row._id || 'Unknown', count: row.count }))),
    Institute.aggregate<{ _id: string; count: number }>([
      { $match: instituteMatch },
      { $group: { _id: '$collegeType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).then((rows) => rows.map((row) => ({ label: row._id || 'Unknown', count: row.count }))),
    groupCounts(InsuranceEnrollment, matchFrom(filters), 'status'),
    groupCounts(Payment, matchFrom(filters), 'status'),
    groupCounts(Document, { ...createdAtFilter(filters.range), ...(filters.instituteId ? { instituteId: filters.instituteId } : {}), ...(filters.universityId ? {} : {}) }, 'fileStatus'),
    groupCounts(ECard, matchFrom(filters), 'status'),
    monthly(Institute, instituteMatch),
    monthly(Student, studentMatch),
    monthly(InsuranceEnrollment, matchFrom(filters)),
    monthly(Payment, matchFrom(filters))
  ]);

  const [missingDocuments, documentTotal] = await Promise.all([
    Document.countDocuments({
      ...createdAtFilter(filters.range),
      ...(filters.instituteId ? { instituteId: filters.instituteId } : {}),
      $or: [
        { fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE', 'FILE_MIGRATION_FAILED'] } },
        { storageKey: { $in: [null, ''] } }
      ]
    }),
    Document.countDocuments({
      ...createdAtFilter(filters.range),
      ...(filters.instituteId ? { instituteId: filters.instituteId } : {})
    })
  ]);

  return {
    range: filters.range,
    universities: {
      total: universities,
      ...countsMap(universityStatus)
    },
    institutes: {
      total: institutes,
      ...countsMap(instituteStatus),
      perUniversity: institutesPerUniversity
    },
    students: {
      total: students,
      ...countsMap(studentStatus),
      byUniversity: studentsByUniversity,
      byInstitute: studentsByInstitute,
      byDistrict: studentsByDistrict,
      byCollegeType: studentsByCollegeType
    },
    insurance: countsMap(insuranceStatus),
    payments: countsMap(paymentStatus),
    documents: {
      ...countsMap(documentStatus),
      uploaded: documentTotal,
      missing: missingDocuments
    },
    ecards: {
      ...countsMap(ecardStatus),
      downloaded: null,
      downloadedNote: 'Download tracking is not stored on e-card records.'
    },
    charts: {
      institutesByUniversity: institutesPerUniversity,
      studentsByUniversity,
      studentsByInstitute,
      studentsByDistrict,
      studentsByCollegeType,
      insuranceByStatus: insuranceStatus,
      paymentsByStatus: paymentStatus,
      documentsByStatus: documentStatus,
      monthlyRegistrations: monthlyInstitutes,
      monthlyStudentUploads: monthlyStudents,
      monthlyInsuranceEnrollments: monthlyInsurance,
      monthlyPaymentActivity: monthlyPayments
    },
    note: 'Insurance, payment, document, review, and e-card HTTP APIs are not live. Status values are grouped from stored records only.'
  };
}

export async function getAdminDashboardSummary() {
  const ttl = env.NODE_ENV === 'test' ? 0 : env.DASHBOARD_CACHE_SECONDS * 1000;
  if (ttl > 0 && summaryCache && Date.now() - summaryCache.at < ttl) {
    return summaryCache.data;
  }
  const analytics = await getAdminAnalytics({});
  const operations = await getOperationsSnapshot();
  const recent = await AuditLog.find({
    action: {
      $in: [
        'COLLEGE_SIGNUP',
        'INSTITUTE_APPROVED',
        'INSTITUTE_REJECTED',
        'INSTITUTE_STATUS_CHANGED',
        'STUDENT_EXCEL_IMPORTED',
        'SUBMISSION_SUBMITTED',
        'SUBMISSION_RESUBMITTED',
        'SUBMISSION_APPROVED',
        'SUBMISSION_REJECTED',
        'SUBMISSION_CORRECTION_REQUESTED',
        'STUDENT_UPDATED',
        'STUDENT_CREATED',
        'COLLEGE_PROFILE_UPDATED',
        'ANNOUNCEMENT_PUBLISHED',
        'DATA_EXPORT',
        'REPORT_EXPORTED'
      ]
    }
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .populate('userId', 'name email role')
    .lean();

  const uni = analytics.universities as unknown as Record<string, number>;
  const inst = analytics.institutes as unknown as Record<string, number>;
  const stu = analytics.students as unknown as Record<string, number>;
  const data = {
    universities: uni.total,
    activeUniversities: uni.ACTIVE ?? 0,
    inactiveUniversities: uni.INACTIVE ?? 0,
    institutes: inst.total,
    activeInstitutes: inst.ACTIVE ?? 0,
    pendingInstitutes: inst.PENDING ?? 0,
    rejectedInstitutes: inst.REJECTED ?? 0,
    inactiveInstitutes: inst.INACTIVE ?? 0,
    students: stu.total,
    activeStudents: stu.ACTIVE ?? 0,
    inactiveStudents: stu.INACTIVE ?? 0,
    notifications: { pendingRegistrations: inst.PENDING ?? 0 },
    stats: analytics,
    charts: {
      institutesByStatus: [
        { label: 'Active', count: inst.ACTIVE ?? 0 },
        { label: 'Pending', count: inst.PENDING ?? 0 },
        { label: 'Rejected', count: inst.REJECTED ?? 0 },
        { label: 'Inactive', count: inst.INACTIVE ?? 0 }
      ],
      studentsByAcademicYear: analytics.charts.monthlyStudentUploads,
      institutesByUniversity: analytics.charts.institutesByUniversity,
      studentsByUniversity: analytics.charts.studentsByUniversity,
      studentsByDistrict: analytics.charts.studentsByDistrict,
      insuranceByStatus: analytics.charts.insuranceByStatus,
      paymentsByStatus: analytics.charts.paymentsByStatus,
      documentsByStatus: analytics.charts.documentsByStatus
    },
    recentActivity: recent.map((row) => {
      const actor =
        row.userId && typeof row.userId === 'object' && 'name' in row.userId
          ? { name: (row.userId as { name: string }).name, email: (row.userId as { email?: string }).email || '' }
          : { name: 'System', email: '' };
      return {
        id: String(row._id),
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        user: actor,
        createdAt: row.createdAt
      };
    }),
    operations
  };
  const { getSubmissionSummaryStats } = await import('../services/submissionService.js');
  const submissions = await getSubmissionSummaryStats();
  const withSubmissions = { ...data, submissions };
  summaryCache = { at: Date.now(), data: withSubmissions };
  return withSubmissions;
}

export function invalidateDashboardCache(): void {
  summaryCache = null;
}

export async function getCollegeAnalytics(instituteId: string, query: AnalyticsFilters = {}) {
  const filters = parseAnalyticsFilters(query, instituteId);
  const match = matchFrom(filters);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    students,
    studentStatus,
    recentStudents,
    insurance,
    documents,
    pendingDocs,
    approvedDocs,
    payments,
    pendingPayments,
    ecards,
    generatedEcards,
    monthlyStudents
  ] = await Promise.all([
    Student.countDocuments({ instituteId: filters.instituteId }),
    groupCounts(Student, { instituteId: filters.instituteId }, 'status'),
    Student.countDocuments({ instituteId: filters.instituteId, createdAt: { $gte: weekAgo } }),
    groupCounts(InsuranceEnrollment, match, 'status'),
    Document.countDocuments({ instituteId: filters.instituteId }),
    Document.countDocuments({
      instituteId: filters.instituteId,
      fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'] }
    }),
    Document.countDocuments({ instituteId: filters.instituteId, fileStatus: 'AVAILABLE' }),
    groupCounts(Payment, match, 'status'),
    Payment.countDocuments({
      instituteId: filters.instituteId,
      status: { $regex: /pending|verification/i }
    }),
    groupCounts(ECard, match, 'status'),
    ECard.countDocuments({
      instituteId: filters.instituteId,
      status: { $regex: /generated|issued|active/i }
    }),
    monthly(Student, { instituteId: filters.instituteId })
  ]);
  const pendingActions: string[] = [];
  if (pendingDocs > 0) pendingActions.push(`${pendingDocs} document record(s) still pending file availability`);
  if (pendingPayments > 0) pendingActions.push(`${pendingPayments} payment record(s) with a pending/verification status`);
  return {
    instituteIdFromSession: true,
    students: {
      total: students,
      ...countsMap(studentStatus),
      recentlyAdded: recentStudents
    },
    insurance: countsMap(insurance),
    documents: {
      total: documents,
      pending: pendingDocs,
      approved: approvedDocs
    },
    payments: { ...countsMap(payments), pending: pendingPayments },
    ecards: { ...countsMap(ecards), generated: generatedEcards, downloaded: null },
    pendingActions,
    charts: {
      studentsByStatus: studentStatus,
      monthlyStudents,
      insuranceByStatus: insurance,
      documentsPendingVsAvailable: [
        { label: 'Pending / missing file', count: pendingDocs },
        { label: 'Available', count: approvedDocs }
      ]
    },
    note: 'Figures are limited to this institute. Scheme HTTP modules are not live; status labels come from stored metadata.'
  };
}

export async function getAdminActivity(limit = 20) {
  const rows = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, limit)))
    .populate('userId', 'name email role')
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    createdAt: row.createdAt,
    user:
      row.userId && typeof row.userId === 'object' && 'name' in row.userId
        ? { name: (row.userId as { name: string }).name, email: (row.userId as { email?: string }).email || '' }
        : { name: 'System', email: '' }
  }));
}

export async function getEntityTimeline(entity: string, entityId: string, instituteId?: string) {
  const allowed = ['Institute', 'Student', 'InsuranceEnrollment', 'Document', 'Payment', 'ECard', 'User', 'UploadJob'];
  if (!allowed.includes(entity) || !entityId) {
    throw new AppError('Timeline is not available for that record.', 400, 'VALIDATION_ERROR');
  }
  if (instituteId) {
    if (entity === 'Student') {
      const student = await Student.findOne({ _id: entityId, instituteId }).select('_id');
      if (!student) throw new AppError('Record not found', 404, 'NOT_FOUND');
    } else if (entity === 'Institute' && entityId !== instituteId) {
      throw new AppError('Record not found', 404, 'NOT_FOUND');
    }
  }
  const rows = await AuditLog.find({ entity, entityId }).sort({ createdAt: 1 }).limit(100).lean();
  return rows.map((row) => ({
    id: String(row._id),
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    createdAt: row.createdAt,
    metadata: row.metadata && typeof row.metadata === 'object' ? sanitizeTimelineMeta(row.metadata as Record<string, unknown>) : {}
  }));
}

function sanitizeTimelineMeta(metadata: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/password|token|hash|secret|authorization|cookie/i.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export async function getAttentionStats(scope?: { instituteId: string }) {
  const settings = await getOperationalSettings();
  const pendingSince = new Date(Date.now() - settings.pendingRegistrationDays * 86400000);
  const docSince = new Date(Date.now() - settings.pendingDocumentDays * 86400000);
  const paySince = new Date(Date.now() - settings.paymentDays * 86400000);
  const reviewSince = new Date(Date.now() - settings.reviewDays * 86400000);
  const instFilter = scope?.instituteId ? { instituteId: oid(scope.instituteId) } : {};

  if (scope?.instituteId) {
    const [pendingDocs, pendingPay, students] = await Promise.all([
      Document.countDocuments({ ...instFilter, fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'] } }),
      Payment.countDocuments({ ...instFilter, status: { $regex: /pending|verification/i } }),
      Student.countDocuments(instFilter)
    ]);
    return { scope: 'college', instituteIdFromSession: true, pendingDocs, pendingPay, students };
  }

  const [pendingInstitutes, stalePending, pendingDocs, pendingPay, pendingReview, pendingInsurance] = await Promise.all([
    Institute.countDocuments({ status: 'PENDING' }),
    Institute.countDocuments({ status: 'PENDING', createdAt: { $lte: pendingSince } }),
    Document.countDocuments({ fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'] }, updatedAt: { $lte: docSince } }),
    Payment.countDocuments({ status: { $regex: /pending|verification/i }, updatedAt: { $lte: paySince } }),
    Review.countDocuments({ status: { $regex: /pending|review/i }, updatedAt: { $lte: reviewSince } }),
    InsuranceEnrollment.countDocuments({ status: { $regex: /pending|review|submitted/i }, updatedAt: { $lte: reviewSince } })
  ]);
  return {
    scope: 'admin',
    pendingInstitutes,
    stalePending,
    reminderDays: settings.pendingRegistrationDays,
    pendingDocs,
    pendingPay,
    pendingReview,
    pendingInsurance
  };
}

export function attentionSentences(stats: Awaited<ReturnType<typeof getAttentionStats>>): string[] {
  const lines: string[] = [];
  if (stats.scope === 'admin') {
    lines.push(`${stats.pendingInstitutes} institute registrations are pending.`);
    lines.push(
      `${stats.stalePending} have been pending longer than the configured reminder period (${stats.reminderDays} days).`
    );
    lines.push(`${stats.pendingDocs} document records remain incomplete beyond the reminder interval.`);
    lines.push(`${stats.pendingPay} payment records still show a pending/verification status beyond the reminder interval.`);
    lines.push(`${stats.pendingInsurance} insurance records still show a pending/review/submitted status beyond the reminder interval.`);
  } else {
    lines.push(`${stats.students} students are registered for this institute.`);
    lines.push(`${stats.pendingDocs} document records still need a file.`);
    lines.push(`${stats.pendingPay} payment records currently show a pending/verification status.`);
  }
  return lines;
}

export type { UtcRange };
