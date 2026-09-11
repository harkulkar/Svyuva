import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const documentVersionSchema = new Schema(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    version: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedAt: { type: Date, default: Date.now },
    originalFilename: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: null },
    sha256: { type: String, trim: true, default: null },
    storageKey: { type: String, trim: true, default: null },
    status: { type: String, trim: true, default: 'PENDING_REVIEW' },
    rejectionReason: { type: String, trim: true, default: null },
    isCurrent: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'documentVersions' }
);

documentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });
documentVersionSchema.index({ documentId: 1, isCurrent: 1 });

export type DocumentVersionRecord = InferSchemaType<typeof documentVersionSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);
