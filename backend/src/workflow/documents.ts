import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { getFeatureFlags } from '../config/featureFlags.js';
import { Document } from '../models/Document.js';
import { DocumentRequirement } from '../models/DocumentRequirement.js';
import { DocumentVersion } from '../models/DocumentVersion.js';
import { requireCollegeInstituteId } from '../services/instituteService.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { applyWorkflowAction, ensureWorkflowInstance } from './engine.js';
import type { WorkflowType } from './types.js';

function assertDocAccess(user: AuthUser, doc: { instituteId?: mongoose.Types.ObjectId | null }) {
  if (user.role === 'ADMIN') return;
  const inst = requireCollegeInstituteId(user);
  if (!doc.instituteId || String(doc.instituteId) !== inst) {
    throw new AppError('Document not found.', 404, 'NOT_FOUND');
  }
}

export async function listDocumentVersions(user: AuthUser, documentId: string) {
  if (!mongoose.isValidObjectId(documentId)) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  const doc = await Document.findById(documentId).select('instituteId originalFilename reviewStatus versionNumber');
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  assertDocAccess(user, doc);
  const versions = await DocumentVersion.find({ documentId }).sort({ version: -1 }).lean();
  return {
    documentId,
    reviewStatus: doc.reviewStatus,
    items: versions.map((row) => ({
      id: String(row._id),
      version: row.version,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      status: row.status,
      rejectionReason: row.rejectionReason,
      isCurrent: row.isCurrent,
      uploadedAt: row.uploadedAt
    }))
  };
}

export async function requestDocumentAccess(user: AuthUser, documentId: string) {
  if (!mongoose.isValidObjectId(documentId)) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  const doc = await Document.findById(documentId).select('instituteId fileStatus reviewStatus');
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  assertDocAccess(user, doc);
  if (!getFeatureFlags().documentHttpApi) {
    throw new AppError('Document download is not available yet.', 501, 'FEATURE_DISABLED');
  }
  throw new AppError('Secure file storage is not configured for this environment.', 501, 'STORAGE_NOT_CONFIGURED');
}

export async function reviewDocument(
  user: AuthUser,
  documentId: string,
  action: 'VERIFY' | 'REJECT' | 'REQUEST_CORRECTION',
  reason: string | undefined,
  req: Request
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  const doc = await Document.findById(documentId);
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  await ensureWorkflowInstance({
    workflowType: 'DOCUMENT_REVIEW',
    entityId: documentId,
    instituteId: doc.instituteId ? String(doc.instituteId) : null
  });
  return applyWorkflowAction(
    user,
    { workflowType: 'DOCUMENT_REVIEW', entityId: documentId, action, reason, expectedState: doc.reviewStatus || 'PENDING_REVIEW' },
    req
  );
}

export async function replaceDocumentRecord(user: AuthUser, documentId: string, req: Request) {
  requireCollegeInstituteId(user);
  if (!getFeatureFlags().documentHttpApi) {
    throw new AppError('Document upload is not available yet. Please try again later.', 501, 'FEATURE_DISABLED');
  }
  const doc = await Document.findById(documentId);
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  assertDocAccess(user, doc);
  if (!['REJECTED', 'REPLACEMENT_REQUIRED'].includes(String(doc.reviewStatus))) {
    throw new AppError('Only rejected documents can be replaced.', 409, 'INVALID_STATUS');
  }
  await writeAudit({
    userId: user.id,
    action: 'DOCUMENT_REPLACE_REQUESTED',
    entity: 'Document',
    entityId: documentId,
    req,
    metadata: { version: doc.versionNumber }
  });
  throw new AppError('Document upload is not available yet. Please try again later.', 501, 'FEATURE_DISABLED');
}

export async function listRequirements(workflowType?: string) {
  const filter: Record<string, unknown> = {};
  if (workflowType) filter.workflowType = workflowType;
  const rows = await DocumentRequirement.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    documentType: row.documentType,
    workflowType: row.workflowType,
    required: row.required,
    allowedFileTypes: row.allowedFileTypes,
    maxFileSize: row.maxFileSize,
    active: row.active,
    instructions: row.instructions,
    sortOrder: row.sortOrder
  }));
}

export async function upsertRequirement(
  user: AuthUser,
  input: {
    id?: string;
    name: string;
    documentType: string;
    workflowType: WorkflowType;
    required?: boolean;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    active?: boolean;
    instructions?: string;
    sortOrder?: number;
  }
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  const payload = {
    name: input.name.trim(),
    documentType: input.documentType.trim(),
    workflowType: input.workflowType,
    required: Boolean(input.required),
    allowedFileTypes: input.allowedFileTypes?.length ? input.allowedFileTypes : ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: input.maxFileSize || 8 * 1024 * 1024,
    active: Boolean(input.active),
    instructions: input.instructions || 'TODO: VERIFY OFFICIAL CONTENT',
    sortOrder: input.sortOrder || 0
  };
  if (input.id && mongoose.isValidObjectId(input.id)) {
    await DocumentRequirement.findByIdAndUpdate(input.id, payload);
  } else {
    await DocumentRequirement.findOneAndUpdate(
      { workflowType: payload.workflowType, documentType: payload.documentType },
      payload,
      { upsert: true, new: true }
    );
  }
  return listRequirements(input.workflowType);
}

export async function documentChecklist(user: AuthUser, workflowType: WorkflowType) {
  const instituteId = user.role === 'COLLEGE' ? requireCollegeInstituteId(user) : undefined;
  const requirements = await DocumentRequirement.find({ workflowType, active: true }).sort({ sortOrder: 1 }).lean();
  const docs = instituteId
    ? await Document.find({ instituteId, isCurrent: { $ne: false } }).select('documentType reviewStatus fileStatus')
    : [];
  const byType = new Map(docs.map((row) => [row.documentType, row]));
  return {
    note: 'Only configured requirements are listed. Empty lists mean no official document types have been entered.',
    items: requirements.map((req) => {
      const match = byType.get(req.documentType);
      let state = 'missing';
      if (match?.reviewStatus === 'VERIFIED') state = 'approved';
      else if (match?.reviewStatus === 'REJECTED' || match?.reviewStatus === 'REPLACEMENT_REQUIRED') state = 'rejected';
      else if (match?.reviewStatus === 'PENDING_REVIEW') state = 'pending';
      else if (match) state = 'uploaded';
      return {
        documentType: req.documentType,
        name: req.name,
        required: req.required,
        instructions: req.instructions,
        state,
        reviewStatus: match?.reviewStatus || 'NOT_STARTED',
        fileStatus: match?.fileStatus || null
      };
    })
  };
}
