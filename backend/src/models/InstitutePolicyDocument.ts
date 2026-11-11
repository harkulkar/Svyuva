import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const institutePolicyDocumentSchema = new Schema(
  {
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', required: true, index: true },
    uploadJobId: { type: Schema.Types.ObjectId, required: true },
    documentKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true, trim: true },
    storedName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: '' },
    sizeBytes: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    insurer: { type: String, trim: true, default: '' },
    insurerName: { type: String, trim: true, default: '' },
    policyType: { type: String, trim: true, default: '' },
    policyLabel: { type: String, trim: true, default: '' },
    uploadFilename: { type: String, trim: true, default: '' }
  },
  { timestamps: true, collection: 'institute_policy_documents' }
);

institutePolicyDocumentSchema.index({ uploadJobId: 1, documentKey: 1 }, { unique: true });

export type InstitutePolicyDocumentRecord = InferSchemaType<typeof institutePolicyDocumentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InstitutePolicyDocument = mongoose.model('InstitutePolicyDocument', institutePolicyDocumentSchema);
