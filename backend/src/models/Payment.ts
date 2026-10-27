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
    uploadJobId: { type: Schema.Types.ObjectId, ref: 'UploadJob', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    razorpayOrderId: { type: String, trim: true, default: undefined },
    razorpayPaymentId: { type: String, trim: true, default: null },
    amountPaise: { type: Number, default: null },
    receipt: { type: String, trim: true, default: null },
    method: { type: String, trim: true, default: null },
    gatewayMode: { type: String, trim: true, default: null },
    gatewayKeyId: { type: String, trim: true, default: null },
    insurer: { type: String, trim: true, default: null },
    policyType: { type: String, trim: true, default: null },
    failureReason: { type: String, trim: true, default: null },
    processedEventIds: { type: [String], default: [] },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'payments' }
);

applyLegacyIndexes(paymentSchema);
paymentSchema.index({ instituteId: 1 });
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ gatewayReference: 1 }, { sparse: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ uploadJobId: 1 }, { sparse: true });
paymentSchema.index(
  { razorpayOrderId: 1 },
  { unique: true, partialFilterExpression: { razorpayOrderId: { $type: 'string' } } }
);
paymentSchema.index({ createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema> & { _id: mongoose.Types.ObjectId };
export const Payment = mongoose.model('Payment', paymentSchema);
