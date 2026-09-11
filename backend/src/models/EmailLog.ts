import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const emailLogSchema = new Schema(
  {
    recipient: { type: String, required: true, trim: true, lowercase: true },
    template: { type: String, trim: true, default: '' },
    notificationType: { type: String, trim: true, default: '' },
    provider: { type: String, trim: true, default: 'none' },
    status: { type: String, enum: ['queued', 'skipped', 'sent', 'failed'], default: 'queued' },
    subject: { type: String, trim: true, default: '' },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorCode: { type: String, trim: true, default: '' },
    retryCount: { type: Number, default: 0 },
    relatedEntityType: { type: String, trim: true, default: '' },
    relatedEntityId: { type: String, trim: true, default: '' }
  },
  { timestamps: true, collection: 'emailLogs' }
);

emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ notificationType: 1, createdAt: -1 });

export type EmailLogDocument = InferSchemaType<typeof emailLogSchema> & { _id: mongoose.Types.ObjectId };
export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
