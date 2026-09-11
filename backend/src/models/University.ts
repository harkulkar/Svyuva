import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameNormalized: { type: String, required: true, trim: true, lowercase: true },
    code: { type: String, trim: true, uppercase: true, default: null },
    shortName: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'universities' }
);

universitySchema.index({ nameNormalized: 1 }, { unique: true });
universitySchema.index({ code: 1 }, { unique: true, sparse: true });
universitySchema.index({ name: 1 });
universitySchema.index({ status: 1 });
universitySchema.index({ createdAt: -1 });
applyLegacyIndexes(universitySchema);

export type UniversityDocument = InferSchemaType<typeof universitySchema> & { _id: mongoose.Types.ObjectId };

export const University = mongoose.model('University', universitySchema);
