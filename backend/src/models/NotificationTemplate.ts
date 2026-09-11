import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from '../notifications/types.js';

export const notificationTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    channel: { type: String, required: true, enum: NOTIFICATION_CHANNELS },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    subject: { type: String, trim: true, maxlength: 200, default: '' },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    variables: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'notificationTemplates' }
);

notificationTemplateSchema.index({ name: 1, channel: 1, language: 1 }, { unique: true });
notificationTemplateSchema.index({ type: 1, channel: 1, language: 1, active: 1 });

export type NotificationTemplateDocument = InferSchemaType<typeof notificationTemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
