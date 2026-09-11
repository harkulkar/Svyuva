import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const paymentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    insuranceId: { type: Schema.Types.ObjectId, ref: 'InsuranceEnrollment', default: null },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
    amount: { type: Number, default: null },
    currency: { type: String, trim: true, default: 'INR' },
    status: { type: String, trim: true, default: 'UNKNOWN' },
    paidAt: { type: Date, default: null },
    gateway: { type: String, trim: true, default: null },
    gatewayReference: { type: String, trim: true, default: null },
    verificationInfo: { type: String, trim: true, default: null },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'payments' }
);

applyLegacyIndexes(paymentSchema);
paymentSchema.index({ instituteId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ gatewayReference: 1 }, { sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & { _id: mongoose.Types.ObjectId };
export const Payment = mongoose.model('Payment', paymentSchema);
