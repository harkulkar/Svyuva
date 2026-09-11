import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const PREMIUM_CALCULATION_STATUSES = ['COMPLETE', 'INCOMPLETE'] as const;

export const premiumCalculationSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'DataSubmission', required: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    academicYear: { type: String, required: true, trim: true },
    studentCount: { type: Number, required: true, default: 0 },
    ratePerStudent: { type: Number, default: null },
    basePremium: { type: Number, default: null },
    adjustments: { type: [Schema.Types.Mixed], default: [] },
    taxes: { type: [Schema.Types.Mixed], default: [] },
    totalPremium: { type: Number, default: null },
    currency: { type: String, trim: true, default: 'INR' },
    ruleId: { type: Schema.Types.ObjectId, ref: 'PremiumRule', default: null },
    ruleVersion: { type: String, trim: true, default: '' },
    calculationStatus: { type: String, enum: PREMIUM_CALCULATION_STATUSES, default: 'INCOMPLETE' },
    requiresOfficialVerification: { type: Boolean, default: true },
    verificationNote: { type: String, default: 'TODO: VERIFY OFFICIAL PREMIUM RULE' },
    message: { type: String, trim: true, default: '' },
    superseded: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'premiumCalculations' }
);

premiumCalculationSchema.index({ submissionId: 1, superseded: 1, calculatedAt: -1 });
premiumCalculationSchema.index({ instituteId: 1, academicYear: 1 });
premiumCalculationSchema.index({ academicYear: 1 });

export type PremiumCalculationDocument = InferSchemaType<typeof premiumCalculationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PremiumCalculation = mongoose.model('PremiumCalculation', premiumCalculationSchema);
