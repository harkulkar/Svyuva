import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const systemSettingSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'settings' }
);

systemSettingSchema.index({ key: 1 }, { unique: true });

export type SystemSettingDocument = InferSchemaType<typeof systemSettingSchema> & { _id: mongoose.Types.ObjectId };
export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
