import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { WORKFLOW_ACTIONS } from '../workflow/types.js';

const workflowHistorySchema = new Schema(
  {
    workflowInstanceId: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance', required: true, index: true },
    fromState: { type: String, required: true, trim: true },
    toState: { type: String, required: true, trim: true },
    action: { type: String, required: true, enum: WORKFLOW_ACTIONS },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    performedRole: { type: String, default: '' },
    reason: { type: String, trim: true, default: null },
    comments: { type: String, trim: true, default: null },
    requestId: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'workflowHistory' }
);

workflowHistorySchema.index({ workflowInstanceId: 1, createdAt: 1 });
workflowHistorySchema.index({ createdAt: -1 });

export type WorkflowHistoryRecord = InferSchemaType<typeof workflowHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};
export const WorkflowHistory = mongoose.model('WorkflowHistory', workflowHistorySchema);
