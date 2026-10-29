import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  isUploadDocumentType,
  requiredUploadDocuments,
  uploadDocumentLabel,
  type UploadDocumentType
} from '../data/uploadDocumentCatalog.js';
import { AppError } from '../middleware/errorHandler.js';
import { Document } from '../models/Document.js';
import type { AuthUser } from '../types/auth.js';
import { safeUploadFilename } from '../utils/spreadsheet.js';
import { ALLOWED_DOCUMENT_EXTENSIONS, validateDocumentFile } from './documentFileValidation.js';
import { openDocumentFile, saveDocumentFile } from './fileStorage.js';
import { writeAudit } from './auditService.js';
import { requireCollegeInstituteId } from './instituteService.js';
import { loadCollegeUploadJob } from './studentService.js';
import { currentUploadDocuments } from './uploadDocumentStatus.js';

function requireType(value: string): UploadDocumentType {
  if (!isUploadDocumentType(value)) throw new AppError('Unknown document type.', 400, 'VALIDATION_ERROR');
  return value;
}

export async function listUploadDocuments(user: AuthUser, jobId: string) {
  const job = await loadCollegeUploadJob(user, jobId);
  const required = requiredUploadDocuments(job.insurer, job.policyType);
  const current = new Map((await currentUploadDocuments(job._id)).map((row) => [row.documentType, row]));
  const items = required.map((item) => {
    const doc = current.get(item.type);
    return {
      type: item.type,
      label: item.label,
      uploaded: Boolean(doc),
      filename: doc?.originalFilename ?? null,
      sizeBytes: doc?.sizeBytes ?? null,
      uploadedAt: doc?.uploadedAt ? new Date(doc.uploadedAt).toISOString() : null
    };
  });
  const uploadedCount = items.filter((item) => item.uploaded).length;
  return {
    required: required.length > 0,
    locked: job.paymentStatus === 'PAID',
    maxFileMb: env.MAX_DOCUMENT_FILE_SIZE_MB,
    allowedExtensions: ALLOWED_DOCUMENT_EXTENSIONS,
    items,
    uploadedCount,
    total: items.length,
    complete: items.length > 0 && uploadedCount === items.length
  };
}

export async function uploadUploadDocument(
  user: AuthUser,
  jobId: string,
  typeParam: string,
  file: { originalname: string; buffer: Buffer },
  req: Request
) {
  const type = requireType(typeParam);
  const job = await loadCollegeUploadJob(user, jobId);
  if (!requiredUploadDocuments(job.insurer, job.policyType).some((item) => item.type === type)) {
    throw new AppError('This document is not required for the selected policy.', 400, 'VALIDATION_ERROR');
  }
  if (job.paymentStatus === 'PAID') {
    throw new AppError('Payment is already complete, so documents can no longer be changed.', 409, 'ALREADY_PAID');
  }
  const { ext, mimeType } = validateDocumentFile(file, env.MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024);
  const instituteId = requireCollegeInstituteId(user);
  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  const storageKey = await saveDocumentFile(file.buffer, ext);
  const previous = await Document.findOne({ uploadJobId: job._id, documentType: type, isCurrent: true }).select('versionNumber');

  const created = await Document.create({
    ownerType: 'INSTITUTE',
    ownerId: instituteId,
    instituteId,
    uploadJobId: job._id,
    documentType: type,
    originalFilename: safeUploadFilename(file.originalname),
    mimeType,
    sizeBytes: file.buffer.length,
    sha256,
    storageKey,
    uploadedAt: new Date(),
    fileStatus: 'AVAILABLE',
    reviewStatus: 'PENDING_REVIEW',
    versionNumber: (previous?.versionNumber ?? 0) + 1,
    isCurrent: true,
    parentDocumentId: previous?._id ?? null
  });
  await Document.updateMany(
    { uploadJobId: job._id, documentType: type, isCurrent: true, _id: { $ne: created._id } },
    { $set: { isCurrent: false } }
  );
  await writeAudit({
    userId: user.id,
    action: 'UPLOAD_DOCUMENT_SAVED',
    entity: 'Document',
    entityId: String(created._id),
    req,
    metadata: { uploadJobId: String(job._id), documentType: type, sizeBytes: file.buffer.length, sha256, version: created.versionNumber }
  });
  return listUploadDocuments(user, jobId);
}

function sendStoredFile(
  res: Response,
  doc: { originalFilename?: string | null; mimeType?: string | null; storageKey?: string | null }
): Promise<void> {
  return (async () => {
    if (!doc.storageKey) throw new AppError('File not found.', 404, 'NOT_FOUND');
    let opened;
    try {
      opened = await openDocumentFile(doc.storageKey);
    } catch {
      throw new AppError('File not found.', 404, 'NOT_FOUND');
    }
    const name = safeUploadFilename(doc.originalFilename || 'document');
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(opened.size));
    res.setHeader('Content-Disposition', `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    opened.stream.on('error', () => res.destroy());
    opened.stream.pipe(res);
  })();
}

export async function downloadUploadDocument(user: AuthUser, jobId: string, typeParam: string, res: Response) {
  const type = requireType(typeParam);
  const job = await loadCollegeUploadJob(user, jobId);
  const doc = await Document.findOne({ uploadJobId: job._id, documentType: type, isCurrent: true, fileStatus: 'AVAILABLE' });
  if (!doc) throw new AppError('File not found.', 404, 'NOT_FOUND');
  await sendStoredFile(res, doc);
}

export async function adminDownloadDocument(admin: AuthUser, documentId: string, req: Request, res: Response) {
  if (admin.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  if (!mongoose.isValidObjectId(documentId)) throw new AppError('File not found.', 404, 'NOT_FOUND');
  const doc = await Document.findById(documentId);
  if (!doc || doc.fileStatus !== 'AVAILABLE' || !doc.storageKey) throw new AppError('File not found.', 404, 'NOT_FOUND');
  await writeAudit({
    userId: admin.id,
    action: 'DOCUMENT_DOWNLOADED',
    entity: 'Document',
    entityId: String(doc._id),
    req,
    metadata: { documentType: doc.documentType, instituteId: doc.instituteId ? String(doc.instituteId) : null }
  });
  await sendStoredFile(res, doc);
}

export { uploadDocumentLabel };
