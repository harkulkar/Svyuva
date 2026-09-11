import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: { type: [Schema.Types.Mixed], default: [] },
    sourceQuality: { type: String, default: '' }
  },
  { _id: false }
);

export const aiConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: { type: String, enum: ['GUEST', 'ADMIN', 'COLLEGE'], default: 'GUEST' },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true, collection: 'aiConversations' }
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export type AiConversationRecord = InferSchemaType<typeof aiConversationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AiConversation = mongoose.model('AiConversation', aiConversationSchema);
