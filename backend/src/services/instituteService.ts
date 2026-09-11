import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Institute } from '../models/Institute.js';
import { Student } from '../models/Student.js';
import { University } from '../models/University.js';
import { User } from '../models/User.js';
import { writeAudit } from './auditService.js';
import { getCollegeAnalytics, invalidateDashboardCache } from '../analytics/analytics.service.js';
import { notifyInstituteUsers } from '../notifications/notification.service.js';
import { alignRegistrationWorkflow } from '../workflow/align.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import type { AuthUser } from '../types/auth.js';
import type { AdminInstituteQuery, CollegeProfileUpdate, CreateUniversityInput, RejectInstituteInput } from '../validators/authValidators.js';

export function requireCollegeInstituteId(user: AuthUser | undefined): string {
  if (!user?.instituteId) {
    throw new AppError('Institute is not linked to this account.', 403, 'INSTITUTE_NOT_LINKED');
  }
  return user.instituteId;
}

export function toPublicUniversity(row: { _id: mongoose.Types.ObjectId; name: string; code?: string | null; shortName?: string | null }) {
  return {
    id: String(row._id),
    name: row.name,
    code: row.code || null,
    shortName: row.shortName || ''
  };
}

export function toInstituteDto(
  institute: {
    _id: mongoose.Types.ObjectId;
    universityId: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string; code?: string | null; shortName?: string | null };
    name: string;
    code?: string | null;
    exclusiveType?: string;
    locationType?: string;
    minorityType?: string;
    linguisticType?: string;
    address: string;
    district: string;
    taluka: string;
    jdRegion: string;
    email: string;
    mobile: string;
    contactNumber1?: string;
    contactNumber2?: string;
    principalName: string;
    collegeType: string;
    status: string;
    rejectionReason?: string | null;
    correctionReason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }
) {
  const university =
    institute.universityId && typeof institute.universityId === 'object' && 'name' in institute.universityId
      ? toPublicUniversity(institute.universityId)
      : { id: String(institute.universityId), name: '', code: null, shortName: '' };

  return {
    id: String(institute._id),
    university,
    name: institute.name,
    code: institute.code || null,
    exclusiveType: institute.exclusiveType || '',
    locationType: institute.locationType || '',
    minorityType: institute.minorityType || '',
    linguisticType: institute.linguisticType || '',
    address: institute.address,
    district: institute.district,
    taluka: institute.taluka,
    jdRegion: institute.jdRegion,
    email: institute.email,
    mobile: institute.mobile,
    contactNumber1: institute.contactNumber1 || '',
    contactNumber2: institute.contactNumber2 || '',
    principalName: institute.principalName,
    collegeType: institute.collegeType,
    status: institute.status,
    rejectionReason: institute.status === 'REJECTED' ? institute.rejectionReason || '' : undefined,
    correctionReason: institute.correctionReason || undefined,
    createdAt: institute.createdAt,
    updatedAt: institute.updatedAt
  };
}

export async function getCollegeProfile(user: AuthUser) {
  const instituteId = requireCollegeInstituteId(user);
  const institute = await Institute.findById(instituteId).populate('universityId', 'name code shortName');
  if (!institute || String(institute._id) !== instituteId) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  return toInstituteDto(institute);
}

export async function updateCollegeProfile(user: AuthUser, input: CollegeProfileUpdate, req: Request) {
  const instituteId = requireCollegeInstituteId(user);
  const forbidden = ['role', 'status', 'instituteId', 'universityId', 'email', 'code', 'name'] as const;
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      throw new AppError('You are not allowed to change that field.', 403, 'FORBIDDEN_FIELD');
    }
  }

  const institute = await Institute.findOneAndUpdate(
    { _id: instituteId },
    {
      $set: {
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
        ...(input.contactNumber1 !== undefined ? { contactNumber1: input.contactNumber1 } : {}),
        ...(input.contactNumber2 !== undefined ? { contactNumber2: input.contactNumber2 } : {}),
        ...(input.principalName !== undefined ? { principalName: input.principalName } : {})
      }
    },
    { new: true }
  ).populate('universityId', 'name code shortName');

  if (!institute) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }

  if (input.mobile || input.principalName) {
    await User.updateOne(
      { _id: user.id, instituteId },
      {
        $set: {
          ...(input.mobile ? { phone: input.mobile } : {}),
          ...(input.principalName ? { name: input.principalName } : {})
        }
      }
    );
  }

  await writeAudit({
    userId: user.id,
    action: 'COLLEGE_PROFILE_UPDATED',
    entity: 'Institute',
    entityId: instituteId,
    req,
    metadata: { fields: Object.keys(input) }
  });

  return toInstituteDto(institute);
}

export async function getCollegeDashboard(user: AuthUser) {
  const profile = await getCollegeProfile(user);
  const instituteId = requireCollegeInstituteId(user);
  const analytics = await getCollegeAnalytics(instituteId);
  const { getCollegeActionCenter } = await import('../workflow/actionCenter.js');
  const { getSubmissionSummaryStats } = await import('./submissionService.js');
  const actionCenter = await getCollegeActionCenter(user);
  const submissions = await getSubmissionSummaryStats({ instituteId });
  return {
    instituteStatus: profile.status,
    university: profile.university,
    principal: profile.principalName,
    students: {
      total: analytics.students.total,
      active: Number((analytics.students as Record<string, number>).ACTIVE ?? 0),
      inactive: Number((analytics.students as Record<string, number>).INACTIVE ?? 0),
      count: analytics.students.total,
      available: true,
      recentlyAdded: analytics.students.recentlyAdded
    },
    submissions,
    insurance: analytics.insurance,
    documents: analytics.documents,
    payments: analytics.payments,
    ecards: analytics.ecards,
    pendingActions: analytics.pendingActions,
    actionItems: actionCenter.items,
    actionHeadline: actionCenter.headline,
    charts: analytics.charts,
    note: analytics.note
  };
}

export async function listAdminUniversities() {
  const rows = await University.find().sort({ name: 1 });
  return rows.map(toPublicUniversity);
}

export async function createUniversity(input: CreateUniversityInput, admin?: AuthUser, req?: Request) {
  const nameNormalized = input.name.trim().toLowerCase();
  const existing = await University.findOne({ nameNormalized });
  if (existing) {
    throw new AppError('A university with this name already exists.', 409, 'UNIVERSITY_EXISTS');
  }
  const code =
    input.code?.trim().toUpperCase() ||
    `UNI-${input.name.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8).toUpperCase() || 'NEW'}-${Date.now().toString(36).toUpperCase()}`;
  const row = await University.create({
    name: input.name.trim(),
    nameNormalized,
    code,
    shortName: input.shortName?.trim() || '',
    status: 'ACTIVE'
  });
  if (admin) {
    await writeAudit({
      userId: admin.id,
      action: 'UNIVERSITY_CREATED',
      entity: 'University',
      entityId: String(row._id),
      req,
      metadata: { name: row.name }
    });
  }
  return toPublicUniversity(row);
}

export async function getAdminDashboardStats() {
  const [universities, institutes, pendingInstitutes, activeInstitutes, totalStudents] = await Promise.all([
    University.countDocuments(),
    Institute.countDocuments(),
    Institute.countDocuments({ status: 'PENDING' }),
    Institute.countDocuments({ status: 'ACTIVE' }),
    Student.countDocuments()
  ]);
  return { universities, institutes, pendingInstitutes, activeInstitutes, totalStudents };
}

export async function listAdminInstitutes(query: AdminInstituteQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.universityId) filter.universityId = query.universityId;
  if (query.district) filter.district = query.district;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { principalName: rx }, { code: rx }];
  }

  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    Institute.countDocuments(filter),
    Institute.find(filter)
      .populate('universityId', 'name code shortName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
  ]);

  return {
    items: rows.map((row) => toInstituteDto(row)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    }
  };
}

export async function listPendingInstitutes(query: AdminInstituteQuery) {
  return listAdminInstitutes({ ...query, status: 'PENDING' });
}

export async function getAdminInstitute(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  const institute = await Institute.findById(id).populate('universityId', 'name code shortName');
  if (!institute) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  const [total, active, inactive] = await Promise.all([
    Student.countDocuments({ instituteId: institute._id }),
    Student.countDocuments({ instituteId: institute._id, status: 'ACTIVE' }),
    Student.countDocuments({ instituteId: institute._id, status: 'INACTIVE' })
  ]);
  return {
    ...toInstituteDto(institute),
    studentCount: { total, active, inactive }
  };
}

export async function setInstituteActiveStatus(id: string, status: 'ACTIVE' | 'INACTIVE', admin: AuthUser, req: Request) {
  const institute = await Institute.findById(id);
  if (!institute) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  if (institute.status === 'PENDING' || institute.status === 'REJECTED') {
    throw new AppError('Use approve or reject for pending registrations.', 409, 'INVALID_STATUS');
  }
  if (institute.status === status) {
    return getAdminInstitute(id);
  }
  if (institute.status !== 'ACTIVE' && institute.status !== 'INACTIVE') {
    throw new AppError('This institute cannot be activated or deactivated from its current status.', 409, 'INVALID_STATUS');
  }
  institute.status = status;
  if (status === 'ACTIVE') institute.rejectionReason = null;
  await institute.save();
  await User.updateMany({ instituteId: institute._id, role: 'COLLEGE' }, { $set: { status } });
  await writeAudit({
    userId: admin.id,
    action: 'INSTITUTE_STATUS_CHANGED',
    entity: 'Institute',
    entityId: String(institute._id),
    req,
    metadata: { status }
  });
  return getAdminInstitute(id);
}

export async function approveInstitute(
  id: string,
  admin: AuthUser,
  req: Request,
  options?: { fromWorkflow?: boolean }
) {
  const institute = await Institute.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    {
      $set: {
        status: 'ACTIVE',
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedBy: new mongoose.Types.ObjectId(admin.id)
      }
    },
    { new: true }
  );
  if (!institute) {
    const exists = await Institute.findById(id).select('_id status');
    if (!exists) throw new AppError('Institute not found', 404, 'NOT_FOUND');
    throw new AppError('Only pending registrations can be approved.', 409, 'INVALID_STATUS');
  }

  await User.updateMany({ instituteId: institute._id }, { $set: { status: 'ACTIVE' } });

  await writeAudit({
    userId: admin.id,
    action: 'INSTITUTE_APPROVED',
    entity: 'Institute',
    entityId: String(institute._id),
    req,
    metadata: { instituteName: institute.name }
  });
  invalidateDashboardCache();
  await notifyInstituteUsers(String(institute._id), {
    type: 'ACCOUNT_APPROVED',
    title: 'Institute registration approved',
    message: 'Your institute registration for {{instituteName}} was approved.',
    relatedEntityType: 'Institute',
    relatedEntityId: String(institute._id),
    actionUrl: '/college',
    vars: { instituteName: institute.name, status: 'ACTIVE' }
  });

  if (!options?.fromWorkflow) {
    await alignRegistrationWorkflow(id, 'APPROVED', 'APPROVE', admin, req);
  }

  return getAdminInstitute(id);
}

export async function rejectInstitute(
  id: string,
  admin: AuthUser,
  input: RejectInstituteInput,
  req: Request,
  options?: { fromWorkflow?: boolean }
) {
  const institute = await Institute.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    {
      $set: {
        status: 'REJECTED',
        rejectionReason: input.reason,
        reviewedAt: new Date(),
        reviewedBy: new mongoose.Types.ObjectId(admin.id)
      }
    },
    { new: true }
  );
  if (!institute) {
    const exists = await Institute.findById(id).select('_id status');
    if (!exists) throw new AppError('Institute not found', 404, 'NOT_FOUND');
    throw new AppError('Only pending registrations can be rejected.', 409, 'INVALID_STATUS');
  }
  await User.updateMany({ instituteId: institute._id }, { $set: { status: 'INACTIVE' } });

  await writeAudit({
    userId: admin.id,
    action: 'INSTITUTE_REJECTED',
    entity: 'Institute',
    entityId: String(institute._id),
    req,
    metadata: { reason: input.reason }
  });
  invalidateDashboardCache();
  await notifyInstituteUsers(String(institute._id), {
    type: 'ACCOUNT_REJECTED',
    title: 'Institute registration not approved',
    message: 'Your institute registration for {{instituteName}} was not approved.',
    relatedEntityType: 'Institute',
    relatedEntityId: String(institute._id),
    actionUrl: '/college/profile',
    vars: { instituteName: institute.name, status: 'REJECTED' }
  });

  if (!options?.fromWorkflow) {
    await alignRegistrationWorkflow(id, 'REJECTED', 'REJECT', admin, req);
  }

  return getAdminInstitute(id);
}
