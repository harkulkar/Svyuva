import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED'], default: 'DRAFT' },
    audienceType: { type: String, enum: ['ALL', 'ROLE', 'UNIVERSITY', 'INSTITUTES', 'USERS'], default: 'ALL' },
    audienceRole: { type: String, enum: ['ADMIN', 'COLLEGE', ''], default: '' },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    instituteIds: [{ type: Schema.Types.ObjectId, ref: 'Institute' }],
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    publishAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    fanoutStatus: { type: String, enum: ['IDLE', 'PENDING', 'RUNNING', 'DONE', 'FAILED'], default: 'IDLE' },
    fanoutCursor: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'announcements' }
);

announcementSchema.index({ status: 1, publishAt: 1 });
announcementSchema.index({ fanoutStatus: 1, status: 1 });
announcementSchema.index({ createdAt: -1 });

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema> & { _id: mongoose.Types.ObjectId };
export const Announcement = mongoose.model('Announcement', announcementSchema);
