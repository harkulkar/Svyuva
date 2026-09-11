import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { WORKFLOW_TYPES } from '../workflow/types.js';

const documentRequirementSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    documentType: { type: String, required: true, trim: true },
    workflowType: { type: String, required: true, enum: WORKFLOW_TYPES },
    required: { type: Boolean, default: false },
    allowedFileTypes: { type: [String], default: ['application/pdf', 'image/jpeg', 'image/png'] },
    maxFileSize: { type: Number, default: 8 * 1024 * 1024 },
    active: { type: Boolean, default: false },
    instructions: { type: String, trim: true, default: 'TODO: VERIFY OFFICIAL CONTENT' },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'documentRequirements' }
);

documentRequirementSchema.index({ workflowType: 1, documentType: 1 }, { unique: true });
documentRequirementSchema.index({ workflowType: 1, active: 1, sortOrder: 1 });

export type DocumentRequirementRecord = InferSchemaType<typeof documentRequirementSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const DocumentRequirement = mongoose.model('DocumentRequirement', documentRequirementSchema);
