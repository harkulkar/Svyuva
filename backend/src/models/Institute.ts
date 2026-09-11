import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { INSTITUTE_STATUSES } from '../types/roles.js';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const instituteSchema = new Schema(
  {
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true, trim: true, lowercase: true },
    code: { type: String, trim: true, uppercase: true, default: null },
    exclusiveType: { type: String, trim: true, default: '' },
    locationType: { type: String, trim: true, default: '' },
    minorityType: { type: String, trim: true, default: '' },
    linguisticType: { type: String, trim: true, default: '' },
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    taluka: { type: String, required: true, trim: true },
    jdRegion: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, trim: true },
    contactNumber1: { type: String, trim: true, default: '' },
    contactNumber2: { type: String, trim: true, default: '' },
    principalName: { type: String, required: true, trim: true },
    collegeType: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: INSTITUTE_STATUSES, default: 'PENDING' },
    rejectionReason: { type: String, trim: true, default: null },
    correctionReason: { type: String, trim: true, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'institutes' }
);

instituteSchema.index({ email: 1 }, { unique: true });
instituteSchema.index({ code: 1 }, { unique: true, sparse: true });
instituteSchema.index({ universityId: 1, nameNormalized: 1 }, { unique: true });
instituteSchema.index({ universityId: 1 });
instituteSchema.index({ name: 1 });
instituteSchema.index({ district: 1 });
instituteSchema.index({ status: 1 });
instituteSchema.index({ createdAt: -1 });
applyLegacyIndexes(instituteSchema);

export type InstituteDocument = InferSchemaType<typeof instituteSchema> & { _id: mongoose.Types.ObjectId };

export const Institute = mongoose.model('Institute', instituteSchema);
