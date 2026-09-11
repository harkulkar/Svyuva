import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';
import { NOTIFICATION_TYPES } from '../notifications/types.js';

export const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    recipientRole: { type: String, trim: true, default: '' },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    type: { type: String, trim: true, enum: [...NOTIFICATION_TYPES, ''], default: '' },
    title: { type: String, trim: true, default: '' },
    body: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH'], default: 'NORMAL' },
    status: { type: String, enum: ['UNREAD', 'READ', 'ARCHIVED'], default: 'UNREAD' },
    readAt: { type: Date, default: null },
    relatedEntityType: { type: String, trim: true, default: '' },
    relatedEntityId: { type: String, trim: true, default: '' },
    actionUrl: { type: String, trim: true, default: '' },
    expiresAt: { type: Date, default: null },
    announcementId: { type: Schema.Types.ObjectId, ref: 'Announcement' },
    reminderKey: { type: String, trim: true },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    channel: { type: String, enum: ['IN_APP', 'EMAIL'], default: 'IN_APP' },
    sentAt: { type: Date, default: null },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'notifications' }
);

applyLegacyIndexes(notificationSchema);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { sparse: true });
notificationSchema.index({ reminderKey: 1 }, { unique: true, sparse: true });
notificationSchema.index(
  { userId: 1, announcementId: 1 },
  { unique: true, partialFilterExpression: { announcementId: { $type: 'objectId' } } }
);
notificationSchema.index({ instituteId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: mongoose.Types.ObjectId };
export const Notification = mongoose.model('Notification', notificationSchema);
