import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const documentSchema = new Schema(
  {
    ownerType: {
      type: String,
      enum: ['STUDENT', 'INSTITUTE', 'INSURANCE', 'PAYMENT', 'ECARD', 'PUBLIC', 'UNKNOWN'],
      default: 'UNKNOWN'
    },
    ownerId: { type: Schema.Types.ObjectId, default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    submissionId: { type: Schema.Types.ObjectId, ref: 'DataSubmission', default: null },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    documentType: { type: String, trim: true, default: '' },
    originalFilename: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: null },
    sha256: { type: String, trim: true, default: null },
    storageKey: { type: String, trim: true, default: null },
    legacyPath: { type: String, trim: true, default: null },
    uploadedAt: { type: Date, default: null },
    fileStatus: {
      type: String,
      enum: ['PENDING_COPY', 'AVAILABLE', 'FILE_MIGRATION_FAILED', 'NOT_AVAILABLE_IN_LEGACY_SOURCE'],
      default: 'PENDING_COPY'
    },
    reviewStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REPLACEMENT_REQUIRED'],
      default: 'NOT_STARTED'
    },
    reviewReason: { type: String, trim: true, default: null },
    versionNumber: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true },
    parentDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
    failureReason: { type: String, trim: true, default: null },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'documents' }
);

applyLegacyIndexes(documentSchema);
documentSchema.index({ sha256: 1 }, { sparse: true });
documentSchema.index({ instituteId: 1 });
documentSchema.index({ submissionId: 1, instituteId: 1 });
documentSchema.index({ studentId: 1 });
documentSchema.index({ fileStatus: 1 });
documentSchema.index({ reviewStatus: 1, instituteId: 1 });
documentSchema.index({ parentDocumentId: 1 });
documentSchema.index({ createdAt: -1 });

export type DocumentRecord = InferSchemaType<typeof documentSchema> & { _id: mongoose.Types.ObjectId };
export const Document = mongoose.model('Document', documentSchema);
