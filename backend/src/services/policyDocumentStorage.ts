import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { POLICY_DOCUMENTS } from '../data/insurerPremiumCatalog.js';
import { AppError } from '../middleware/errorHandler.js';
import { Institute } from '../models/Institute.js';
import { InstitutePolicyDocument } from '../models/InstitutePolicyDocument.js';
import { UploadJob } from '../models/UploadJob.js';
import { writeAudit } from './auditService.js';
import type { Request } from 'express';

export const policyDocumentDir = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  'storage',
  'policy-documents'
);

const storedNamePattern = /^[a-f0-9]{24}-[A-Z0-9_]+\.(pdf|jpg|jpeg|png)$/;

export function policyDocumentFilePath(storedName: string) {
  const base = path.basename(storedName);
  if (!storedNamePattern.test(base)) {
    throw new AppError('Document file is not available.', 404, 'NOT_FOUND');
  }
  const root = path.resolve(policyDocumentDir);
  const full = path.resolve(root, base);
  if (!full.startsWith(root + path.sep)) {
    throw new AppError('Document file is not available.', 404, 'NOT_FOUND');
  }
  return full;
}

type JobDocument = {
  key?: string | null;
  originalFilename?: string | null;
  storedName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: Date | null;
};

export async function rememberPolicyDocument(input: {
  instituteId: mongoose.Types.ObjectId | string;
  uploadJobId: mongoose.Types.ObjectId | string;
  documentKey: string;
  originalFilename: string;
  storedName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  uploadedAt?: Date | null;
  insurer?: string | null;
  insurerName?: string | null;
  policyType?: string | null;
  policyLabel?: string | null;
  uploadFilename?: string | null;
}) {
  const known = POLICY_DOCUMENTS.find((item) => item.key === input.documentKey);
  await InstitutePolicyDocument.updateOne(
    { uploadJobId: input.uploadJobId, documentKey: input.documentKey },
    {
      $set: {
        instituteId: input.instituteId,
        label: known?.label || input.documentKey,
        originalFilename: input.originalFilename,
        storedName: input.storedName,
        mimeType: input.mimeType || '',
        sizeBytes: input.sizeBytes || 0,
        uploadedAt: input.uploadedAt || new Date(),
        insurer: input.insurer || '',
        insurerName: input.insurerName || '',
        policyType: input.policyType || '',
        policyLabel: input.policyLabel || '',
        uploadFilename: input.uploadFilename || ''
      }
    },
    { upsert: true }
  );
}

function quoteText(quote: unknown, field: string) {
  if (!quote || typeof quote !== 'object') return '';
  const value = (quote as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

async function syncJobsIntoArchive(instituteId: string) {
  const jobs = await UploadJob.find({ instituteId, 'policyDocuments.0': { $exists: true } }).select(
    'filename insurer policyType premiumQuote policyDocuments'
  );
  for (const job of jobs) {
    const rows = (job.policyDocuments || []) as JobDocument[];
    for (const row of rows) {
      if (!row.key || !row.storedName || !row.originalFilename) continue;
      await rememberPolicyDocument({
        instituteId,
        uploadJobId: job._id,
        documentKey: row.key,
        originalFilename: row.originalFilename,
        storedName: row.storedName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        uploadedAt: row.uploadedAt,
        insurer: job.insurer,
        insurerName: quoteText(job.premiumQuote, 'insurerName'),
        policyType: job.policyType,
        policyLabel: quoteText(job.premiumQuote, 'policyLabel'),
        uploadFilename: job.filename
      });
    }
  }
}

function toDto(row: {
  _id: mongoose.Types.ObjectId;
  documentKey: string;
  label: string;
  originalFilename: string;
  sizeBytes?: number | null;
  uploadedAt?: Date | null;
  insurer?: string | null;
  insurerName?: string | null;
  policyType?: string | null;
  policyLabel?: string | null;
  uploadFilename?: string | null;
  uploadJobId: mongoose.Types.ObjectId;
}) {
  return {
    id: String(row._id),
    key: row.documentKey,
    label: row.label,
    filename: row.originalFilename,
    sizeBytes: row.sizeBytes || 0,
    uploadedAt: row.uploadedAt ? new Date(row.uploadedAt).toISOString() : null,
    insurer: row.insurer || '',
    insurerName: row.insurerName || '',
    policyType: row.policyType || '',
    policyLabel: row.policyLabel || '',
    uploadFilename: row.uploadFilename || '',
    uploadJobId: String(row.uploadJobId)
  };
}

export async function listInstitutePolicyDocuments(instituteId: string) {
  if (!mongoose.isValidObjectId(instituteId)) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  const institute = await Institute.findById(instituteId).select('_id');
  if (!institute) {
    throw new AppError('Institute not found', 404, 'NOT_FOUND');
  }
  await syncJobsIntoArchive(instituteId);
  const rows = await InstitutePolicyDocument.find({ instituteId }).sort({ uploadedAt: -1, documentKey: 1 });
  return rows.map(toDto);
}

function mimeFor(name: string, stored: string) {
  const ext = path.extname(stored || name).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function readInstitutePolicyDocument(instituteId: string, documentId: string, adminId: string, req?: Request) {
  if (!mongoose.isValidObjectId(instituteId) || !mongoose.isValidObjectId(documentId)) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }
  const row = await InstitutePolicyDocument.findOne({ _id: documentId, instituteId });
  if (!row) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }
  const filePath = policyDocumentFilePath(row.storedName);
  try {
    await access(filePath);
  } catch {
    throw new AppError('Document file is not available.', 404, 'NOT_FOUND');
  }
  const buffer = await readFile(filePath);
  if (req) {
    await writeAudit({
      userId: adminId,
      action: 'INSTITUTE_POLICY_DOCUMENT_DOWNLOADED',
      entity: 'InstitutePolicyDocument',
      entityId: String(row._id),
      req,
      metadata: { instituteId, documentKey: row.documentKey }
    });
  }
  return {
    buffer,
    filename: row.originalFilename || `${row.documentKey}${path.extname(row.storedName)}`,
    mimeType: row.mimeType || mimeFor(row.originalFilename, row.storedName)
  };
}
