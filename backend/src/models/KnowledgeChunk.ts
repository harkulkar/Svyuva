import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const knowledgeChunkSchema = new Schema(
  {
    knowledgeDocumentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
    title: { type: String, required: true, trim: true },
    page: { type: Number, default: null },
    section: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: '' },
    sourceUrl: { type: String, trim: true, default: '' },
    version: { type: String, trim: true, default: '' },
    accessScope: {
      type: String,
      enum: ['GLOBAL_OFFICIAL_KNOWLEDGE', 'ADMIN_ONLY', 'INSTITUTE_SPECIFIC'],
      required: true,
      index: true
    },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] }
  },
  { timestamps: true, collection: 'knowledgeChunks' }
);

knowledgeChunkSchema.index({ accessScope: 1, knowledgeDocumentId: 1 });

export type KnowledgeChunkRecord = InferSchemaType<typeof knowledgeChunkSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
