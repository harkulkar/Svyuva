import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { USER_ROLES, USER_STATUSES } from '../types/roles.js';
import { applyLegacyIndexes, legacyProvenanceDefinition } from './legacyProvenance.js';

export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: USER_ROLES },
    phone: { type: String, trim: true },
    status: { type: String, required: true, enum: USER_STATUSES, default: 'PENDING' },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },
    passwordResetRequired: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    legacyPasswordAlgorithm: { type: String, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
    notifyInApp: { type: Boolean, default: true },
    notifyEmail: { type: Boolean, default: true },
    ...legacyProvenanceDefinition
  },
  { timestamps: true, collection: 'users' }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ instituteId: 1 });
userSchema.index({ universityId: 1 });
userSchema.index({ passwordResetRequired: 1 });
applyLegacyIndexes(userSchema);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = mongoose.model('User', userSchema);
