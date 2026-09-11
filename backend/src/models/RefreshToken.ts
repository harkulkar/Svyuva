import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    persistent: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'refreshTokens' }
);

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
