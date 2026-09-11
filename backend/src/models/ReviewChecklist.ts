import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { WORKFLOW_TYPES } from '../workflow/types.js';

const reviewChecklistItemSchema = new Schema(
  {
    workflowType: { type: String, required: true, enum: WORKFLOW_TYPES },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: 'TODO: VERIFY OFFICIAL CONTENT' },
    required: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'reviewChecklistItems' }
);

reviewChecklistItemSchema.index({ workflowType: 1, name: 1 }, { unique: true });

const reviewChecklistResultSchema = new Schema(
  {
    reviewId: { type: String, required: true, trim: true },
    workflowInstanceId: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance', default: null },
    itemId: { type: Schema.Types.ObjectId, ref: 'ReviewChecklistItem', required: true },
    result: { type: String, enum: ['PASS', 'FAIL', 'NA'], required: true },
    comment: { type: String, trim: true, default: '' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, collection: 'reviewChecklistResults' }
);

reviewChecklistResultSchema.index({ reviewId: 1, itemId: 1 }, { unique: true });

export type ReviewChecklistItemRecord = InferSchemaType<typeof reviewChecklistItemSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type ReviewChecklistResultRecord = InferSchemaType<typeof reviewChecklistResultSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const ReviewChecklistItem = mongoose.model('ReviewChecklistItem', reviewChecklistItemSchema);
export const ReviewChecklistResult = mongoose.model('ReviewChecklistResult', reviewChecklistResultSchema);
