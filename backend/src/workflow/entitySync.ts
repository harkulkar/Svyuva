import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Document } from '../models/Document.js';
import { ECard } from '../models/ECard.js';
import { Institute } from '../models/Institute.js';
import { InsuranceEnrollment } from '../models/InsuranceEnrollment.js';
import { Payment } from '../models/Payment.js';
import { Review } from '../models/Review.js';
import { UploadJob } from '../models/UploadJob.js';
import { User } from '../models/User.js';
import { approveInstitute, rejectInstitute } from '../services/instituteService.js';
import type { AuthUser } from '../types/auth.js';
import type { WorkflowActionName, WorkflowType } from './types.js';

export async function inferCurrentState(type: WorkflowType, entityId: string): Promise<string> {
  if (type === 'INSTITUTE_REGISTRATION') {
    const row = await Institute.findById(entityId).select('status');
    if (!row) return 'PENDING';
    if (row.status === 'ACTIVE') return 'APPROVED';
    if (row.status === 'REJECTED') return 'REJECTED';
    return 'PENDING';
  }
  if (type === 'STUDENT_UPLOAD') {
    const row = await UploadJob.findById(entityId).select('imported');
    if (!row) return 'VALIDATING';
    return row.imported ? 'COMPLETED' : 'VALIDATION_COMPLETE';
  }
  if (type === 'DOCUMENT_REVIEW') {
    const row = await Document.findById(entityId).select('reviewStatus');
    return (row?.reviewStatus as string) || 'NOT_STARTED';
  }
  if (type === 'INSURANCE_ENROLLMENT') {
    const row = await InsuranceEnrollment.findById(entityId).select('status');
    return (row?.status as string) || 'UNKNOWN';
  }
  if (type === 'PAYMENT_VERIFICATION') {
    const row = await Payment.findById(entityId).select('status');
    return (row?.status as string) || 'UNKNOWN';
  }
  if (type === 'APPLICATION_REVIEW') {
    const row = await Review.findById(entityId).select('status');
    return (row?.status as string) || 'UNKNOWN';
  }
  if (type === 'ECARD_ISSUANCE') {
    const row = await ECard.findById(entityId).select('status');
    return (row?.status as string) || 'UNKNOWN';
  }
  return 'PENDING';
}

export async function applyEntitySideEffects(params: {
  type: WorkflowType;
  action: WorkflowActionName;
  entityId: string;
  toState: string;
  reason?: string;
  user: AuthUser;
  req: Request;
  instance: { instituteId?: mongoose.Types.ObjectId | null };
}) {
  if (params.type === 'INSTITUTE_REGISTRATION') {
    await applyRegistration(params);
    return;
  }
  if (params.type === 'DOCUMENT_REVIEW') {
    await applyDocumentReview(params);
    return;
  }
  if (params.type === 'INSURANCE_ENROLLMENT') {
    await applyStoredStatus(InsuranceEnrollment, params, 'insurance');
    return;
  }
  if (params.type === 'PAYMENT_VERIFICATION') {
    if (params.action === 'VERIFY' && params.user.role !== 'ADMIN') {
      throw new AppError('College users cannot mark payment as verified.', 403, 'FORBIDDEN');
    }
    if (params.action === 'COMPLETE') {
      const pay = await Payment.findById(params.entityId).select('status');
      if (pay && /fail/i.test(String(pay.status))) {
        throw new AppError('A failed payment cannot advance this workflow.', 409, 'INVALID_TRANSITION');
      }
    }
    await applyStoredStatus(Payment, params, 'payment');
    return;
  }
  if (params.type === 'APPLICATION_REVIEW') {
    await applyStoredStatus(Review, params, 'review');
    return;
  }
  if (params.type === 'ECARD_ISSUANCE') {
    await applyStoredStatus(ECard, params, 'ecard');
  }
}

async function applyRegistration(params: {
  action: WorkflowActionName;
  entityId: string;
  toState: string;
  reason?: string;
  user: AuthUser;
  req: Request;
}) {
  const institute = await Institute.findById(params.entityId);
  if (!institute) throw new AppError('Institute not found', 404, 'NOT_FOUND');

  if (params.action === 'APPROVE') {
    await approveInstitute(params.entityId, params.user, params.req, { fromWorkflow: true });
    return;
  }
  if (params.action === 'REJECT') {
    await rejectInstitute(params.entityId, params.user, { reason: params.reason || '' }, params.req, { fromWorkflow: true });
    return;
  }
  if (params.action === 'REQUEST_CORRECTION') {
    if (institute.status !== 'PENDING') {
      throw new AppError('Correction can only be requested for a pending registration.', 409, 'INVALID_STATUS');
    }
    institute.correctionReason = params.reason || null;
    await institute.save();
    return;
  }
  if (params.action === 'RESUBMIT') {
    if (institute.status !== 'PENDING') {
      throw new AppError('Only a pending registration can be resubmitted.', 409, 'INVALID_STATUS');
    }
    institute.correctionReason = null;
    await institute.save();
    await User.updateMany({ instituteId: institute._id, role: 'COLLEGE' }, { $set: { status: 'PENDING' } });
  }
}

async function applyDocumentReview(params: {
  action: WorkflowActionName;
  entityId: string;
  toState: string;
  reason?: string;
}) {
  const doc = await Document.findById(params.entityId);
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  doc.reviewStatus = params.toState as typeof doc.reviewStatus;
  doc.reviewReason = params.reason?.trim() || doc.reviewReason;
  if (params.action === 'VERIFY') doc.reviewReason = null;
  await doc.save();
  const { DocumentVersion } = await import('../models/DocumentVersion.js');
  await DocumentVersion.updateOne(
    { documentId: doc._id, isCurrent: true },
    { $set: { status: params.toState, rejectionReason: params.reason?.trim() || null } }
  );
}

async function applyStoredStatus(
  _Model: typeof InsuranceEnrollment | typeof Payment | typeof Review | typeof ECard,
  params: { entityId: string; toState: string; type?: WorkflowType },
  kind: 'insurance' | 'payment' | 'review' | 'ecard'
) {
  const row =
    kind === 'insurance'
      ? await InsuranceEnrollment.findById(params.entityId)
      : kind === 'payment'
        ? await Payment.findById(params.entityId)
        : kind === 'review'
          ? await Review.findById(params.entityId)
          : await ECard.findById(params.entityId);
  if (!row) throw new AppError('Record not found.', 404, 'NOT_FOUND');
  if (kind === 'insurance' && params.toState === 'SUBMITTED') {
    const studentId = 'studentId' in row ? row.studentId : null;
    const year = 'academicYear' in row ? row.academicYear : '';
    if (studentId) {
      const dup = await InsuranceEnrollment.findOne({
        _id: { $ne: row._id },
        studentId,
        academicYear: year || row.get('academicYear'),
        status: { $regex: /active|enrolled|approved|submitted/i }
      }).select('_id');
      if (dup) throw new AppError('An active enrollment already exists for this student and academic year.', 409, 'DUPLICATE_ENROLLMENT');
    }
  }
  row.set('status', params.toState);
  await row.save();
}

