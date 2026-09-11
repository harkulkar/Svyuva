import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { PRIORITIES, TASK_STATUSES } from '../workflow/types.js';

const workflowTaskSchema = new Schema(
  {
    workflowInstanceId: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance', required: true, index: true },
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedRole: { type: String, default: 'ADMIN' },
    priority: { type: String, enum: PRIORITIES, default: 'NORMAL' },
    dueAt: { type: Date, default: null },
    status: { type: String, enum: TASK_STATUSES, default: 'ASSIGNED' },
    assignedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    instituteId: { type: Schema.Types.ObjectId, ref: 'Institute', default: null },
    universityId: { type: Schema.Types.ObjectId, ref: 'University', default: null },
    workflowType: { type: String, required: true }
  },
  { timestamps: true, collection: 'workflowTasks' }
);

workflowTaskSchema.index({ assignedUserId: 1, status: 1, dueAt: 1 });
workflowTaskSchema.index({ workflowType: 1, status: 1, createdAt: -1 });
workflowTaskSchema.index({ instituteId: 1, status: 1 });

export type WorkflowTaskRecord = InferSchemaType<typeof workflowTaskSchema> & { _id: mongoose.Types.ObjectId };
export const WorkflowTask = mongoose.model('WorkflowTask', workflowTaskSchema);
