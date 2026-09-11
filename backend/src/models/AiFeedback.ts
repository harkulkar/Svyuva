import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const aiFeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    conversationId: { type: Schema.Types.ObjectId, ref: 'AiConversation', required: true },
    messageId: { type: String, required: true },
    rating: { type: String, enum: ['helpful', 'not_helpful'], required: true },
    category: { type: String, trim: true, default: '' },
    comment: { type: String, trim: true, maxlength: 500, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'aiFeedback' }
);

export type AiFeedbackRecord = InferSchemaType<typeof aiFeedbackSchema> & { _id: mongoose.Types.ObjectId };

export const AiFeedback = mongoose.model('AiFeedback', aiFeedbackSchema);
