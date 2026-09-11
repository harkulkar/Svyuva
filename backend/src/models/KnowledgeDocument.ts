import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const knowledgeDocumentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    documentType: { type: String, trim: true, default: 'txt' },
    source: { type: String, trim: true, default: '' },
    sourceUrl: { type: String, trim: true, default: '' },
    version: { type: String, trim: true, default: '1' },
    effectiveDate: { type: Date, default: null },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['DRAFT', 'PROCESSING', 'ACTIVE', 'ARCHIVED', 'FAILED', 'REVIEW_REQUIRED'],
      default: 'DRAFT',
      index: true
    },
    accessScope: {
      type: String,
      enum: ['GLOBAL_OFFICIAL_KNOWLEDGE', 'ADMIN_ONLY', 'INSTITUTE_SPECIFIC'],
      default: 'GLOBAL_OFFICIAL_KNOWLEDGE',
      index: true
    },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    fileReference: { type: String, trim: true, default: '' },
    originalFilename: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: 0 },
    checksum: { type: String, trim: true, default: '' },
    chunkingStatus: { type: String, default: 'PENDING' },
    embeddingStatus: { type: String, default: 'PENDING' },
    ocrStatus: { type: String, default: 'NOT_REQUIRED' },
    ocrConfidence: { type: Number, default: null },
    extractedTextPreview: { type: String, default: '' },
    processingError: { type: String, default: '' },
    seedKey: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, collection: 'knowledgeDocuments' }
);

knowledgeDocumentSchema.index({ status: 1, accessScope: 1 });
knowledgeDocumentSchema.index({ seedKey: 1 }, { unique: true, sparse: true });

export type KnowledgeDocumentRecord = InferSchemaType<typeof knowledgeDocumentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
