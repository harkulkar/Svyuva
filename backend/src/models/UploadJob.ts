import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const uploadJobSchema = new Schema(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true, trim: true },
    totalRows: { type: Number, required: true },
    validCount: { type: Number, required: true },
    invalidCount: { type: Number, required: true },
    duplicateCount: { type: Number, required: true },
    validRows: { type: [Schema.Types.Mixed], default: [] },
    issues: { type: [Schema.Types.Mixed], default: [] },
    imported: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'uploads' }
);

uploadJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type UploadJobDocument = InferSchemaType<typeof uploadJobSchema> & { _id: mongoose.Types.ObjectId };

export const UploadJob = mongoose.model('UploadJob', uploadJobSchema);
