import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const reviewSchema = new Schema(
  {
    entityType: { type: String, trim: true, required: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerLegacyId: { type: String, trim: true, default: null },
    reviewedAt: { type: Date, default: null },
    status: { type: String, trim: true, default: 'UNKNOWN' },
    comments: { type: String, trim: true, default: '' },
    rejectionReason: { type: String, trim: true, default: '' },
    correctionRequest: { type: String, trim: true, default: '' },
    migratedHistorical: { type: Boolean, default: true },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'reviews' }
);

applyLegacyIndexes(reviewSchema);
reviewSchema.index({ entityType: 1, entityId: 1 });
reviewSchema.index({ instituteId: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & { _id: mongoose.Types.ObjectId };
export const Review = mongoose.model('Review', reviewSchema);
