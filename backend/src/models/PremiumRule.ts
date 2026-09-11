import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const premiumRuleSchema = new Schema(
  {
    academicYear: { type: String, required: true, trim: true },
    ruleType: { type: String, trim: true, default: 'PER_STUDENT' },
    /** TODO: VERIFY OFFICIAL PREMIUM RULE — null until an authorized rate is configured. */
    ratePerStudent: { type: Number, default: null },
    minimumStudents: { type: Number, default: null },
    maximumStudents: { type: Number, default: null },
    currency: { type: String, trim: true, default: 'INR' },
    version: { type: String, required: true, trim: true },
    active: { type: Boolean, default: false },
    officialVerified: { type: Boolean, default: false },
    verificationNote: {
      type: String,
      default: 'TODO: VERIFY OFFICIAL PREMIUM RULE'
    },
    effectiveFrom: { type: Date, default: null },
    effectiveTo: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'premiumRules' }
);

premiumRuleSchema.index({ academicYear: 1, active: 1, version: 1 });
premiumRuleSchema.index({ academicYear: 1, version: 1 }, { unique: true });

export type PremiumRuleDocument = InferSchemaType<typeof premiumRuleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PremiumRule = mongoose.model('PremiumRule', premiumRuleSchema);
