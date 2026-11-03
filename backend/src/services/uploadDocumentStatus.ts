import { AppError } from '../middleware/errorHandler.js';
import { Document } from '../models/Document.js';
import { requiredUploadDocuments, uploadDocumentLabel, type UploadDocumentType } from '../data/uploadDocumentCatalog.js';

type JobLike = { _id: unknown; insurer?: string | null; policyType?: string | null };

export async function currentUploadDocuments(jobId: unknown) {
  return Document.find({ uploadJobId: jobId, isCurrent: true, fileStatus: 'AVAILABLE' })
    .select('documentType originalFilename sizeBytes uploadedAt reviewStatus')
    .lean();
}

export async function missingUploadDocuments(job: JobLike) {
  const required = requiredUploadDocuments(job.insurer, job.policyType);
  if (!required.length) return [];
  const have = new Set((await currentUploadDocuments(job._id)).map((row) => row.documentType));
  return required.filter((item) => !have.has(item.type));
}

/** Premium cannot be paid until the insurer's document pack is complete. */
export async function assertUploadDocumentsComplete(job: JobLike): Promise<void> {
  const missing = await missingUploadDocuments(job);
  if (missing.length) {
    throw new AppError(
      `Upload all required documents before payment. Missing: ${missing.map((item) => uploadDocumentLabel(item.type as UploadDocumentType)).join('; ')}.`,
      400,
      'DOCUMENTS_REQUIRED'
    );
  }
}
