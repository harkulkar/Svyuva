import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { PRIORITIES, WORKFLOW_TYPES } from '../workflow/types.js';

const workflowInstanceSchema = new Schema(
  {
    workflowType: { type: String, required: true, enum: WORKFLOW_TYPES, index: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    currentState: { type: String, required: true, trim: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedRole: { type: String, default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    priority: { type: String, enum: PRIORITIES, default: 'NORMAL' },
    revision: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastActionKey: { type: String, default: undefined }
  },
  { timestamps: true, collection: 'workflowInstances' }
);

workflowInstanceSchema.index({ workflowType: 1, entityType: 1, entityId: 1 }, { unique: true });
workflowInstanceSchema.index({ workflowType: 1, currentState: 1, createdAt: -1 });
workflowInstanceSchema.index({ assignedTo: 1, currentState: 1 });
workflowInstanceSchema.index({ instituteId: 1, currentState: 1 });
workflowInstanceSchema.index({ lastActionKey: 1 }, { unique: true, sparse: true });

export type WorkflowInstanceRecord = InferSchemaType<typeof workflowInstanceSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const WorkflowInstance = mongoose.model('WorkflowInstance', workflowInstanceSchema);
