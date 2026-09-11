import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const aiUsageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, default: 'GUEST' },
    operation: { type: String, required: true, index: true },
    success: { type: Boolean, default: true },
    provider: { type: String, default: 'none' },
    latencyMs: { type: Number, default: 0 },
    category: { type: String, default: '' },
    tokenUsage: { type: Number, default: null },
    requestId: { type: String, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'aiUsage' }
);

aiUsageSchema.index({ createdAt: -1 });
aiUsageSchema.index({ operation: 1, createdAt: -1 });

export type AiUsageRecord = InferSchemaType<typeof aiUsageSchema> & { _id: mongoose.Types.ObjectId };

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);
