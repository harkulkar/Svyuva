import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const submissionVersionSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'DataSubmission', required: true },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true },
    version: { type: Number, required: true },
    status: { type: String, required: true, trim: true },
    studentCount: { type: Number, default: 0 },
    validStudentCount: { type: Number, default: 0 },
    invalidStudentCount: { type: Number, default: 0 },
    premiumCalculationId: { type: Schema.Types.ObjectId, ref: 'PremiumCalculation', default: null },
    premiumSnapshot: { type: Schema.Types.Mixed, default: null },
    uploadedFile: { type: Schema.Types.Mixed, default: null },
    validation: { type: Schema.Types.Mixed, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'submissionVersions' }
);

submissionVersionSchema.index({ submissionId: 1, version: 1 }, { unique: true });
submissionVersionSchema.index({ instituteId: 1, createdAt: -1 });

export type SubmissionVersionDocument = InferSchemaType<typeof submissionVersionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SubmissionVersion = mongoose.model('SubmissionVersion', submissionVersionSchema);
