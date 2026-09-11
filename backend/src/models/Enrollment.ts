import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const enrollmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    academicYear: { type: String, trim: true, default: '' },
    enrollmentType: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: 'UNKNOWN' },
    submittedAt: { type: Date, default: null },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'enrollments' }
);

applyLegacyIndexes(enrollmentSchema);
enrollmentSchema.index({ studentId: 1 });
enrollmentSchema.index({ instituteId: 1 });

export type EnrollmentDocument = InferSchemaType<typeof enrollmentSchema> & { _id: mongoose.Types.ObjectId };
export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
