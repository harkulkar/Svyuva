import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { getDatabaseStatus } from '../config/db.js';
import { featureFlagDocs, getFeatureFlags } from '../config/featureFlags.js';
import { processStartedAt, processUptimeSeconds } from '../config/runtime.js';
import { getAppVersion } from '../config/version.js';
import { AuditLog } from '../models/AuditLog.js';
import { Document } from '../models/Document.js';
import { ECard } from '../models/ECard.js';
import { Institute } from '../models/Institute.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { Student } from '../models/Student.js';
import { University } from '../models/University.js';
import { UploadJob } from '../models/UploadJob.js';
import { User } from '../models/User.js';
import { JobRun } from '../models/JobRun.js';
import { emailService } from './emailService.js';
import { getLastSuccessfulHealthAt, listRecentErrors, recentErrorCount } from '../utils/errorEvents.js';
import { logger } from '../utils/logger.js';

export async function pingDatabase(): Promise<{ connected: boolean; responseTimeMs: number; status: 'ok' | 'unavailable' }> {
  const started = Date.now();
  const connected = mongoose.connection.readyState === 1;
  if (!connected || !mongoose.connection.db) {
    return { connected: false, responseTimeMs: Date.now() - started, status: 'unavailable' };
  }
  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { connected: true, responseTimeMs: Date.now() - started, status: 'ok' };
  } catch {
    return { connected: false, responseTimeMs: Date.now() - started, status: 'unavailable' };
  }
}

function storageSnapshot() {
  const configured = Boolean(env.STORAGE_BUCKET && env.STORAGE_ENDPOINT);
  const flags = getFeatureFlags();
  return {
    configured,
    httpApi: flags.documentHttpApi ? 'enabled' : 'not_implemented',
    upload: flags.documentHttpApi ? 'unknown' : 'not_implemented',
    download: flags.documentHttpApi ? 'unknown' : 'not_implemented',
    status: configured ? (flags.documentHttpApi ? 'configured' : 'configured_not_live') : 'not_configured'
  };
}

export async function getSystemHealth() {
  const db = await pingDatabase();
  const storage = storageSnapshot();
  const applicationStatus = db.status === 'ok' ? 'ok' : 'degraded';

  return {
    application: {
      status: applicationStatus,
      backend: 'ok',
      frontend: 'independent_static',
      api: applicationStatus,
      version: getAppVersion()
    },
    database: {
      connected: db.connected,
      responseTimeMs: db.responseTimeMs,
      status: db.status
    },
    storage,
    email: {
      ...emailService.stats()
    },
    jobs: {
      backgroundProcessors: env.JOBS_ENABLED ? 'in_process' : 'none',
      uploadPreviewTtl: 'mongodb_ttl'
    },
    system: {
      lastSuccessfulHealthCheck: getLastSuccessfulHealthAt(),
      environment: env.NODE_ENV,
      uptimeSeconds: processUptimeSeconds(),
      startedAt: processStartedAt.toISOString(),
      maintenanceMode: env.MAINTENANCE_MODE
    },
    featureFlags: featureFlagDocs().map(({ name, enabled }) => ({ name, enabled }))
  };
}

export async function getOperationsSnapshot() {
  const db = getDatabaseStatus();
  const storage = storageSnapshot();
  const [pendingInstitutes, failedUploads, failedLogins, failedJobs] = await Promise.all([
    Institute.countDocuments({ status: 'PENDING' }),
    UploadJob.countDocuments({ $or: [{ imported: false, invalidCount: { $gt: 0 } }, { invalidCount: { $gt: 0 } }] }),
    AuditLog.countDocuments({
      action: 'LOGIN_FAILED',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }),
    JobRun.countDocuments({ status: 'failed' })
  ]);

  return {
    systemStatus: db.connected ? 'ok' : 'unavailable',
    databaseStatus: db.connected ? 'ok' : 'unavailable',
    storageStatus: storage.status,
    pendingCollegeApprovals: pendingInstitutes,
    recentFailedUploads: failedUploads,
    recentFailedJobs: failedJobs,
    recentErrors: listRecentErrors(8),
    recentErrorCount15m: recentErrorCount(),
    failedLogins24h: failedLogins
  };
}

export async function getStorageHealth() {
  const storage = storageSnapshot();
  const [total, byStatus, recentUploads, recentFailures] = await Promise.all([
    Document.countDocuments(),
    Document.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$fileStatus', count: { $sum: 1 } } }]),
    Document.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    Document.countDocuments({ fileStatus: 'FILE_MIGRATION_FAILED' })
  ]);
  const missingFiles = await Document.countDocuments({
    $or: [{ storageKey: null }, { storageKey: '' }, { fileStatus: { $in: ['PENDING_COPY', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'] } }]
  });

  return {
    connectivity: storage.status,
    httpApi: storage.httpApi,
    configured: storage.configured,
    totalDocuments: total,
    recentUploads7d: recentUploads,
    recentFailures,
    missingFiles,
    byStatus: Object.fromEntries(byStatus.map((row) => [row._id || 'UNKNOWN', row.count])),
    note: 'Document HTTP upload/download APIs are not live. Counts reflect MongoDB metadata only. Private file URLs are not returned.'
  };
}

export async function getSchemeModuleCounts() {
  const flags = getFeatureFlags();
  const [insurance, documents, payments, reviews, ecards] = await Promise.all([
    InsuranceEnrollment.countDocuments(),
    Document.countDocuments(),
    Payment.countDocuments(),
    Review.countDocuments(),
    ECard.countDocuments()
  ]);
  return {
    universities: await University.countDocuments(),
    institutes: await Institute.countDocuments(),
    activeInstitutes: await Institute.countDocuments({ status: 'ACTIVE' }),
    pendingRegistrations: await Institute.countDocuments({ status: 'PENDING' }),
    students: await Student.countDocuments(),
    insurance: { httpApi: flags.insuranceHttpApi, records: insurance },
    documents: { httpApi: flags.documentHttpApi, records: documents },
    payments: { httpApi: flags.paymentHttpApi, records: payments },
    reviews: { httpApi: flags.reviewHttpApi, records: reviews },
    ecards: { httpApi: flags.ecardHttpApi, records: ecards }
  };
}

export async function searchSupport(q: string) {
  const { escapeRegex } = await import('../utils/escapeRegex.js');
  const rx = new RegExp(escapeRegex(q), 'i');
  const [users, institutes, students, failedOps] = await Promise.all([
    User.find({ $or: [{ name: rx }, { email: rx }] })
      .select('name email role status lastLoginAt instituteId')
      .limit(8)
      .lean(),
    Institute.find({ $or: [{ name: rx }, { email: rx }, { mobile: rx }, { principalName: rx }, { code: rx }] })
      .select('name email status district universityId')
      .limit(8)
      .lean(),
    Student.find({
      $or: [{ studentId: rx }, { enrollmentNumber: rx }, { firstName: rx }, { lastName: rx }, { mobile: rx }, { email: rx }]
    })
      .select('studentId enrollmentNumber firstName lastName status instituteId')
      .limit(8)
      .lean(),
    AuditLog.find({
      action: { $in: ['LOGIN_FAILED', 'STUDENT_EXCEL_UPLOADED'] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .lean()
  ]);

  return {
    users: users.map((row) => ({
      id: String(row._id),
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      lastLoginAt: row.lastLoginAt || null
    })),
    institutes: institutes.map((row) => ({
      id: String(row._id),
      name: row.name,
      email: row.email,
      status: row.status,
      district: row.district
    })),
    students: students.map((row) => ({
      id: String(row._id),
      studentId: row.studentId,
      enrollmentNumber: row.enrollmentNumber,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      status: row.status
    })),
    recentFailedOperations: failedOps.map((row) => {
      const populated = row.userId as unknown as { name?: string; email?: string } | null;
      const actor = populated?.email ? { name: populated.name || '', email: populated.email } : null;
      return {
        id: String(row._id),
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        createdAt: row.createdAt,
        user: actor,
        requestId:
          row.metadata && typeof row.metadata === 'object' && 'requestId' in row.metadata
            ? String((row.metadata as { requestId?: string }).requestId || '')
            : ''
      };
    })
  };
}

export async function listLoginActivity(query: {
  page: number;
  limit: number;
  result?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
}) {
  const filter: Record<string, unknown> = {
    action: query.result === 'success' ? 'LOGIN_SUCCESS' : query.result === 'failure' ? 'LOGIN_FAILED' : { $in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] }
  };
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
      const metadata = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {};
      return {
        id: String(row._id),
        user: populated?.email
          ? { id: String(populated._id), name: populated.name, email: populated.email }
          : null,
        timestamp: row.createdAt,
        success: row.action === 'LOGIN_SUCCESS',
        action: row.action,
        requestId: typeof metadata.requestId === 'string' ? metadata.requestId : null,
        client: row.ipAddress ? 'recorded' : null
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

export async function listInactiveAccounts(inactiveDays = env.INACTIVE_ACCOUNT_DAYS) {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
  const rows = await User.find({
    status: 'ACTIVE',
    $or: [{ lastLoginAt: { $lt: cutoff } }, { lastLoginAt: null }]
  })
    .select('name email role status lastLoginAt createdAt')
    .sort({ lastLoginAt: 1 })
    .limit(100)
    .lean();

  return {
    inactiveDays,
    autoDisable: false,
    items: rows.map((row) => ({
      id: String(row._id),
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      lastLoginAt: row.lastLoginAt || null,
      createdAt: row.createdAt
    }))
  };
}

const STUDENT_FIELDS = new Set([
  'firstName',
  'middleName',
  'lastName',
  'mobile',
  'email',
  'course',
  'academicYear',
  'address',
  'parentName',
  'parentMobile'
]);
const INSTITUTE_FIELDS = new Set(['address', 'district', 'taluka', 'principalName', 'mobile', 'contactNumber1', 'contactNumber2']);
const USER_FIELDS = new Set(['name', 'phone']);

function stringifyValue(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function applyDataCorrection(input: {
  entity: 'Student' | 'Institute' | 'User';
  entityId: string;
  field: string;
  value: string;
  reason: string;
  adminId: string;
  req: import('express').Request;
}) {
  const { AppError } = await import('../middleware/errorHandler.js');
  const { writeAudit } = await import('./auditService.js');
  if (!mongoose.isValidObjectId(input.entityId)) {
    throw new AppError('Record not found', 404, 'NOT_FOUND');
  }

  let allowed: Set<string>;
  let model: mongoose.Model<mongoose.Document>;
  if (input.entity === 'Student') {
    allowed = STUDENT_FIELDS;
    model = Student as unknown as mongoose.Model<mongoose.Document>;
  } else if (input.entity === 'Institute') {
    allowed = INSTITUTE_FIELDS;
    model = Institute as unknown as mongoose.Model<mongoose.Document>;
  } else {
    allowed = USER_FIELDS;
    model = User as unknown as mongoose.Model<mongoose.Document>;
  }

  if (!allowed.has(input.field)) {
    throw new AppError('That field cannot be changed through the correction workflow.', 400, 'FIELD_NOT_ALLOWED');
  }

  const doc = await model.findById(input.entityId);
  if (!doc) throw new AppError('Record not found', 404, 'NOT_FOUND');

  const oldValue = stringifyValue((doc as unknown as Record<string, unknown>)[input.field]);
  (doc as unknown as Record<string, unknown>)[input.field] = input.value;
  await doc.save();

  await writeAudit({
    userId: input.adminId,
    action: 'DATA_CORRECTION',
    entity: input.entity,
    entityId: input.entityId,
    req: input.req,
    metadata: {
      field: input.field,
      oldValue,
      newValue: input.value,
      reason: input.reason
    }
  });

  logger.info('data_correction', {
    requestId: input.req.requestId,
    entity: input.entity,
    field: input.field
  });

  return {
    entity: input.entity,
    entityId: input.entityId,
    field: input.field,
    oldValue,
    newValue: input.value
  };
}
