import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const ecardSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', default: null },
    issuedAt: { type: Date, default: null },
    status: { type: String, trim: true, default: 'UNKNOWN' },
    historicalFile: { type: Boolean, default: true },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'ecards' }
);

applyLegacyIndexes(ecardSchema);
ecardSchema.index({ studentId: 1 });
ecardSchema.index({ instituteId: 1 });
ecardSchema.index({ status: 1 });
ecardSchema.index({ createdAt: -1 });

export type ECardDocument = InferSchemaType<typeof ecardSchema> & { _id: mongoose.Types.ObjectId };
export const ECard = mongoose.model('ECard', ecardSchema);
