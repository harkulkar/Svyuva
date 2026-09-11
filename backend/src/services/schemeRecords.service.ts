import type { AuthUser } from '../types/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getFeatureFlags } from '../config/featureFlags.js';
import { Document } from '../models/Document.js';
import { ECard } from '../models/ECard.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Student } from '../models/Student.js';
import { Institute } from '../models/Institute.js';
import { requireCollegeInstituteId } from './instituteService.js';

export type SchemeKind = 'insurance' | 'documents' | 'payments' | 'ecards';

type ListQuery = { page?: string | number; limit?: string | number; status?: string; q?: string; instituteId?: string };

function pageParams(query: ListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function instituteFilter(user: AuthUser, query: ListQuery): Record<string, unknown> {
  if (user.role === 'COLLEGE') {
    return { instituteId: requireCollegeInstituteId(user) };
  }
  if (user.role === 'ADMIN' && query.instituteId) {
    return { instituteId: query.instituteId };
  }
  return {};
}

async function studentNames(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, { name: string; studentId: string }>();
  const rows = await Student.find({ _id: { $in: unique } })
    .select('firstName lastName studentId')
    .lean();
  return new Map(rows.map((row) => [String(row._id), { name: `${row.firstName} ${row.lastName}`.trim(), studentId: row.studentId }]));
}

async function instituteNames(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, string>();
  const rows = await Institute.find({ _id: { $in: unique } }).select('name').lean();
  return new Map(rows.map((row) => [String(row._id), row.name]));
}

export async function listSchemeRecords(user: AuthUser, kind: SchemeKind, query: ListQuery) {
  const { page, limit, skip } = pageParams(query);
  const filter = instituteFilter(user, query);
  if (query.status) filter.status = String(query.status).slice(0, 40);
  const flags = getFeatureFlags();

  if (kind === 'insurance') {
    const [total, rows] = await Promise.all([
      InsuranceEnrollment.countDocuments(filter),
      InsuranceEnrollment.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('status academicYear studentId instituteId updatedAt').lean()
    ]);
    const students = await studentNames(rows.map((row) => String(row.studentId || '')));
    const institutes = await instituteNames(rows.map((row) => String(row.instituteId || '')));
    return {
      kind,
      httpApi: flags.insuranceHttpApi,
      items: rows.map((row) => {
        const student = students.get(String(row.studentId || ''));
        return {
          id: String(row._id),
          title: student?.name || 'Insurance record',
          subtitle: student?.studentId || row.academicYear || '',
          status: row.status || 'UNKNOWN',
          studentId: row.studentId ? String(row.studentId) : null,
          instituteId: row.instituteId ? String(row.instituteId) : null,
          instituteName: institutes.get(String(row.instituteId || '')) || null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
        };
      }),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    };
  }

  if (kind === 'documents') {
    const docFilter = { ...filter };
    if (query.status) {
      delete docFilter.status;
      docFilter.fileStatus = String(query.status).slice(0, 40);
    }
    const [total, rows] = await Promise.all([
      Document.countDocuments(docFilter),
      Document.find(docFilter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('documentType originalFilename fileStatus studentId instituteId updatedAt mimeType')
        .lean()
    ]);
    const students = await studentNames(rows.map((row) => String(row.studentId || '')));
    const institutes = await instituteNames(rows.map((row) => String(row.instituteId || '')));
    return {
      kind,
      httpApi: flags.documentHttpApi,
      items: rows.map((row) => {
        const student = students.get(String(row.studentId || ''));
        return {
          id: String(row._id),
          title: row.documentType || row.originalFilename || 'Document',
          subtitle: student?.studentId || row.mimeType || '',
          status: row.fileStatus || 'UNKNOWN',
          studentId: row.studentId ? String(row.studentId) : null,
          instituteId: row.instituteId ? String(row.instituteId) : null,
          instituteName: institutes.get(String(row.instituteId || '')) || null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
        };
      }),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    };
  }

  if (kind === 'payments') {
    const [total, rows] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('status amount currency studentId instituteId updatedAt paidAt').lean()
    ]);
    const students = await studentNames(rows.map((row) => String(row.studentId || '')));
    const institutes = await instituteNames(rows.map((row) => String(row.instituteId || '')));
    return {
      kind,
      httpApi: flags.paymentHttpApi,
      items: rows.map((row) => {
        const student = students.get(String(row.studentId || ''));
        return {
          id: String(row._id),
          title: student?.name || 'Payment record',
          subtitle: row.amount != null ? `${row.currency || 'INR'} ${row.amount}` : student?.studentId || '',
          status: row.status || 'UNKNOWN',
          studentId: row.studentId ? String(row.studentId) : null,
          instituteId: row.instituteId ? String(row.instituteId) : null,
          instituteName: institutes.get(String(row.instituteId || '')) || null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
        };
      }),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    };
  }

  const ecardFilter = { ...filter };
  if (query.status) ecardFilter.status = String(query.status).slice(0, 40);
  const [total, rows] = await Promise.all([
    ECard.countDocuments(ecardFilter),
    ECard.find(ecardFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('status studentId instituteId issuedAt updatedAt').lean()
  ]);
  const students = await studentNames(rows.map((row) => String(row.studentId || '')));
  const institutes = await instituteNames(rows.map((row) => String(row.instituteId || '')));
  return {
    kind,
    httpApi: flags.ecardHttpApi,
    items: rows.map((row) => {
      const student = students.get(String(row.studentId || ''));
      return {
        id: String(row._id),
        title: student?.name || 'E-card',
        subtitle: student?.studentId || '',
        status: row.status || 'UNKNOWN',
        studentId: row.studentId ? String(row.studentId) : null,
        instituteId: row.instituteId ? String(row.instituteId) : null,
        instituteName: institutes.get(String(row.instituteId || '')) || null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null
      };
    }),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export function featureDisabled(feature: 'document' | 'ecard' | 'insurance' | 'payment'): never {
  throw new AppError(
    feature === 'document'
      ? 'Document upload is not available yet. Please try again later.'
      : feature === 'ecard'
        ? 'E-card download is not available yet.'
        : 'This action is not available yet.',
    501,
    'FEATURE_DISABLED'
  );
}
