import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const insuranceEnrollmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
    status: { type: String, trim: true, default: 'UNKNOWN' },
    policyNumber: { type: String, trim: true, default: null },
    insurer: { type: String, trim: true, default: null },
    premium: { type: Number, default: null },
    coverage: { type: String, trim: true, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    academicYear: { type: String, trim: true, default: '' },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'insurance' }
);

applyLegacyIndexes(insuranceEnrollmentSchema);
insuranceEnrollmentSchema.index({ studentId: 1 });
insuranceEnrollmentSchema.index({ instituteId: 1 });
insuranceEnrollmentSchema.index({ universityId: 1 });
insuranceEnrollmentSchema.index({ status: 1 });
insuranceEnrollmentSchema.index({ createdAt: -1 });

export type InsuranceEnrollmentDocument = InferSchemaType<typeof insuranceEnrollmentSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const InsuranceEnrollment = mongoose.model('InsuranceEnrollment', insuranceEnrollmentSchema);
