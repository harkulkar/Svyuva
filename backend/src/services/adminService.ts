import type { Request } from 'express';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Institute } from '../models/Institute.js';
import { Student } from '../models/Student.js';
import { University } from '../models/University.js';
import { User } from '../models/User.js';
import { writeAudit } from './auditService.js';
import { toAuthUser } from './authService.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { neutralizeSpreadsheetFormula } from '../utils/spreadsheet.js';
import { toPublicUniversity } from './instituteService.js';
import { getSchemeModuleCounts } from './operationsService.js';
import { getAdminDashboardSummary } from '../analytics/analytics.service.js';
import type { AuthUser } from '../types/auth.js';
import type {
  AdminAuditQuery,
  AdminProfileUpdate,
  AdminUniversityQuery,
  AdminUserQuery,
  ExportQuery,
  UpdateUniversityInput
} from '../validators/adminValidators.js';

const SENSITIVE_KEY = /password|token|hash|secret|authorization|cookie/i;

function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export async function getAdminDashboard() {
  return getAdminDashboardSummary();
}

export async function listAdminUniversitiesPaged(query: AdminUniversityQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { code: rx }, { shortName: rx }];
  }
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    University.countDocuments(filter),
    University.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit)
  ]);
  return {
    items: rows.map((row) => ({
      ...toPublicUniversity(row),
      status: row.status,
      createdAt: row.createdAt
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function listUniversityOptions() {
  const rows = await University.find().sort({ name: 1 }).select('name code shortName status').limit(500);
  return rows.map((row) => ({ ...toPublicUniversity(row), status: row.status }));
}

export async function getAdminUniversity(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('University not found', 404, 'NOT_FOUND');
  const row = await University.findById(id);
  if (!row) throw new AppError('University not found', 404, 'NOT_FOUND');
  const instituteCount = await Institute.countDocuments({ universityId: row._id });
  return { ...toPublicUniversity(row), status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt, instituteCount };
}

export async function updateUniversity(id: string, input: UpdateUniversityInput, admin: AuthUser, req: Request) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('University not found', 404, 'NOT_FOUND');
  const row = await University.findById(id);
  if (!row) throw new AppError('University not found', 404, 'NOT_FOUND');
  if (input.name) {
    const nameNormalized = input.name.trim().toLowerCase();
    const clash = await University.findOne({ nameNormalized, _id: { $ne: id } });
    if (clash) throw new AppError('A university with this name already exists.', 409, 'UNIVERSITY_EXISTS');
    row.name = input.name.trim();
    row.nameNormalized = nameNormalized;
  }
  if (input.code !== undefined) row.code = input.code.trim().toUpperCase() || null;
  if (input.shortName !== undefined) row.shortName = input.shortName.trim();
  await row.save();
  await writeAudit({
    userId: admin.id,
    action: 'UNIVERSITY_UPDATED',
    entity: 'University',
    entityId: id,
    req,
    metadata: { fields: Object.keys(input) }
  });
  return getAdminUniversity(id);
}

export async function updateUniversityStatus(id: string, status: 'ACTIVE' | 'INACTIVE', admin: AuthUser, req: Request) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('University not found', 404, 'NOT_FOUND');
  const row = await University.findById(id);
  if (!row) throw new AppError('University not found', 404, 'NOT_FOUND');
  row.status = status;
  await row.save();
  await writeAudit({
    userId: admin.id,
    action: 'UNIVERSITY_STATUS_CHANGED',
    entity: 'University',
    entityId: id,
    req,
    metadata: { status }
  });
  return getAdminUniversity(id);
}

export async function getAdminReports() {
  const [institutesByUniversity, institutesByDistrict, studentsByUniversity, studentsByInstitute, studentsByAcademicYear] =
    await Promise.all([
      Institute.aggregate([
        { $group: { _id: '$universityId', count: { $sum: 1 } } },
        { $lookup: { from: 'universities', localField: '_id', foreignField: '_id', as: 'university' } },
        { $unwind: { path: '$university', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: { $ifNull: ['$university.name', 'Unknown'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),
      Institute.aggregate([
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $project: { _id: 0, name: { $ifNull: ['$_id', 'Unknown'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),
      Student.aggregate([
        { $group: { _id: '$universityId', count: { $sum: 1 } } },
        { $lookup: { from: 'universities', localField: '_id', foreignField: '_id', as: 'university' } },
        { $unwind: { path: '$university', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: { $ifNull: ['$university.name', 'Unknown'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),
      Student.aggregate([
        { $group: { _id: '$instituteId', count: { $sum: 1 } } },
        { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'institute' } },
        { $unwind: { path: '$institute', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: { $ifNull: ['$institute.name', 'Unknown'] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]),
      Student.aggregate([
        { $group: { _id: '$academicYear', count: { $sum: 1 } } },
        { $project: { _id: 0, name: { $ifNull: ['$_id', 'Unknown'] }, count: 1 } },
        { $sort: { name: 1 } },
        { $limit: 50 }
      ])
    ]);

  return {
    institutesByUniversity,
    institutesByDistrict,
    studentsByUniversity,
    studentsByInstitute,
    studentsByAcademicYear,
    schemeModules: await getSchemeModuleCounts()
  };
}

function auditResult(action: string): 'success' | 'failure' | 'info' {
  if (/FAILED|REJECTED/.test(action)) return 'failure';
  if (/SUCCESS|APPROVED|CREATED|UPDATED|CHANGED|IMPORTED|EXPORT|LOGOUT|CORRECTION/.test(action)) return 'success';
  return 'info';
}

export async function listAuditLogs(query: AdminAuditQuery) {
  const filter: Record<string, unknown> = {};
  if (query.action) filter.action = query.action;
  if (query.entity) filter.entity = query.entity;
  if (query.entityId) filter.entityId = query.entityId;
  if (query.actor) {
    const rx = new RegExp(escapeRegex(query.actor), 'i');
    const actors = await User.find({ $or: [{ email: rx }, { name: rx }] }).select('_id').limit(50);
    const ids = actors.map((row) => row._id);
    if (ids.length === 0) {
      return {
        items: [],
        pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 }
      };
    }
    if (query.userId && !ids.some((id) => String(id) === query.userId)) {
      return {
        items: [],
        pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 1 }
      };
    }
    filter.userId = query.userId || { $in: ids };
  } else if (query.userId) {
    filter.userId = query.userId;
  }
  if (!query.action && query.result === 'failure') {
    filter.action = /FAILED|REJECTED/;
  } else if (!query.action && query.result === 'success') {
    filter.action = /SUCCESS|APPROVED|CREATED|UPDATED|CHANGED|IMPORTED|EXPORT|LOGOUT|CORRECTION/;
  } else if (!query.action && query.result === 'info') {
    filter.action = { $not: /FAILED|REJECTED|SUCCESS|APPROVED|CREATED|UPDATED|CHANGED|IMPORTED|EXPORT|LOGOUT|CORRECTION/ };
  }
  if (query.startDate || query.endDate) {
    const createdAt: Record<string, Date> = {};
    if (query.startDate) createdAt.$gte = query.startDate;
    if (query.endDate) createdAt.$lte = query.endDate;
    filter.createdAt = createdAt;
  }
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('userId', 'name email role')
  ]);
  return {
    items: rows.map((row) => {
      const populated = row.userId as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string } | null;
      const user = populated && populated._id && populated.email
        ? { id: String(populated._id), name: populated.name, email: populated.email }
        : null;
      const metadata = sanitizeMetadata(row.metadata);
      return {
        id: String(row._id),
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        user,
        result: auditResult(row.action),
        requestId: typeof metadata.requestId === 'string' ? metadata.requestId : null,
        metadata,
        createdAt: row.createdAt
      };
    }),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function adminSearch(q: string) {
  const rx = new RegExp(escapeRegex(q), 'i');
  const [institutes, students] = await Promise.all([
    Institute.find({
      $or: [{ name: rx }, { email: rx }, { mobile: rx }, { principalName: rx }, { code: rx }]
    })
      .select('name email mobile status universityId')
      .populate('universityId', 'name')
      .limit(8),
    Student.find({
      $or: [{ studentId: rx }, { enrollmentNumber: rx }, { firstName: rx }, { lastName: rx }, { mobile: rx }, { email: rx }]
    })
      .select('studentId enrollmentNumber firstName lastName instituteId status')
      .populate('instituteId', 'name')
      .limit(8)
  ]);
  return {
    institutes: institutes.map((row) => ({
      id: String(row._id),
      name: row.name,
      email: row.email,
      status: row.status,
      university:
        row.universityId && typeof row.universityId === 'object' && 'name' in row.universityId
          ? (row.universityId as { name: string }).name
          : ''
    })),
    students: students.map((row) => ({
      id: String(row._id),
      studentId: row.studentId,
      enrollmentNumber: row.enrollmentNumber,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      status: row.status,
      institute:
        row.instituteId && typeof row.instituteId === 'object' && 'name' in row.instituteId
          ? (row.instituteId as { name: string }).name
          : ''
    }))
  };
}

function toUserDto(user: {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  instituteId?: mongoose.Types.ObjectId | null;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLoginAt || null,
    createdAt: user.createdAt,
    instituteId: user.instituteId ? String(user.instituteId) : null
  };
}

export async function listAdminUsers(query: AdminUserQuery) {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit)
  ]);
  return {
    items: rows.map(toUserDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function updateAdminUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE', admin: AuthUser, req: Request) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('User not found', 404, 'NOT_FOUND');
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  if (user.role === 'ADMIN' && status === 'INACTIVE') {
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
    const isLast = activeAdmins <= 1 && user.status === 'ACTIVE';
    if (isLast) {
      throw new AppError('The last active administrator cannot be deactivated.', 409, 'LAST_ADMIN');
    }
  }
  if (user.role === 'COLLEGE' && status === 'ACTIVE' && user.instituteId) {
    const institute = await Institute.findById(user.instituteId).select('status');
    if (institute && institute.status !== 'ACTIVE') {
      throw new AppError('College users can only be activated when their institute is active.', 409, 'INSTITUTE_NOT_ACTIVE');
    }
  }
  user.status = status;
  await user.save();
  await writeAudit({
    userId: admin.id,
    action: 'USER_STATUS_CHANGED',
    entity: 'User',
    entityId: id,
    req,
    metadata: { status, targetRole: user.role }
  });
  return toUserDto(user);
}

export async function updateAdminProfile(admin: AuthUser, input: AdminProfileUpdate, req: Request) {
  const forbidden = ['role', 'status', 'email', 'passwordHash', 'instituteId', 'universityId'];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      throw new AppError('You are not allowed to change that field.', 403, 'FORBIDDEN_FIELD');
    }
  }
  const user = await User.findByIdAndUpdate(
    admin.id,
    {
      $set: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {})
      }
    },
    { new: true }
  );
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
  await writeAudit({
    userId: admin.id,
    action: 'ADMIN_PROFILE_UPDATED',
    entity: 'User',
    entityId: admin.id,
    req,
    metadata: { fields: Object.keys(input) }
  });
  return toAuthUser(user);
}

function csvEscape(value: unknown): string {
  const text = neutralizeSpreadsheetFormula(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function workbookOrCsv(filename: string, headers: string[], rows: unknown[][], format: 'csv' | 'xlsx') {
  if (format === 'csv') {
    const body = [headers, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
    return {
      filename: `${filename}.csv`,
      contentType: 'text/csv; charset=utf-8',
      buffer: Buffer.from(body, 'utf8')
    };
  }
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((line) => line.map((cell) => neutralizeSpreadsheetFormula(cell)))
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Export');
  return {
    filename: `${filename}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  };
}

export async function exportInstitutes(query: ExportQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.universityId) filter.universityId = query.universityId;
  if (query.district) filter.district = query.district;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { principalName: rx }];
  }
  const rows = await Institute.find(filter)
    .populate('universityId', 'name')
    .sort({ name: 1 })
    .limit(env.MAX_EXPORT_ROWS)
    .select('name district principalName email mobile status createdAt universityId');
  const headers = ['Institute', 'University', 'District', 'Principal', 'Email', 'Mobile', 'Status', 'Created'];
  const data = rows.map((row) => [
    row.name,
    row.universityId && typeof row.universityId === 'object' && 'name' in row.universityId
      ? (row.universityId as { name: string }).name
      : '',
    row.district,
    row.principalName,
    row.email,
    row.mobile,
    row.status,
    row.createdAt ? new Date(row.createdAt).toISOString() : ''
  ]);
  return workbookOrCsv('institutes', headers, data, query.format);
}

export async function exportStudents(query: ExportQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.universityId) filter.universityId = query.universityId;
  if (query.instituteId) filter.instituteId = query.instituteId;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.course) filter.course = query.course;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ studentId: rx }, { enrollmentNumber: rx }, { firstName: rx }, { lastName: rx }, { mobile: rx }];
  }
  const rows = await Student.find(filter)
    .populate('instituteId', 'name')
    .populate('universityId', 'name')
    .sort({ lastName: 1 })
    .limit(env.MAX_EXPORT_ROWS)
    .select('studentId enrollmentNumber firstName lastName course academicYear status instituteId universityId');
  const headers = ['Student ID', 'Enrollment Number', 'Name', 'Institute', 'University', 'Course', 'Academic Year', 'Status'];
  const data = rows.map((row) => [
    row.studentId,
    row.enrollmentNumber,
    [row.firstName, row.lastName].filter(Boolean).join(' '),
    row.instituteId && typeof row.instituteId === 'object' && 'name' in row.instituteId
      ? (row.instituteId as { name: string }).name
      : '',
    row.universityId && typeof row.universityId === 'object' && 'name' in row.universityId
      ? (row.universityId as { name: string }).name
      : '',
    row.course,
    row.academicYear,
    row.status
  ]);
  return workbookOrCsv('students', headers, data, query.format);
}
