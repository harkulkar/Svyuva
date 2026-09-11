import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const jobRunSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null },
    status: { type: String, enum: ['idle', 'running', 'success', 'failed'], default: 'idle' },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastError: { type: String, trim: true, default: '' },
    lastDurationMs: { type: Number, default: 0 },
    lastRunKey: { type: String, trim: true, default: '' },
    lockUntil: { type: Date, default: null },
    retryable: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'jobRuns' }
);

jobRunSchema.index({ status: 1, nextRunAt: 1 });

export type JobRunDocument = InferSchemaType<typeof jobRunSchema> & { _id: mongoose.Types.ObjectId };
export const JobRun = mongoose.model('JobRun', jobRunSchema);
