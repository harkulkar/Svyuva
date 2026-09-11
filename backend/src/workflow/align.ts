import type { Request } from 'express';
import mongoose from 'mongoose';
import { Institute } from '../models/Institute.js';
import { WorkflowHistory } from '../models/WorkflowHistory.js';
import { WorkflowInstance } from '../models/WorkflowInstance.js';
import type { AuthUser } from '../types/auth.js';
import type { WorkflowActionName } from './types.js';

function oid(id: string | undefined | null) {
  if (!id || !mongoose.isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export async function alignRegistrationWorkflow(
  instituteId: string,
  toState: string,
  action: WorkflowActionName,
  user: AuthUser,
  req: Request
) {
  const inst = await Institute.findById(instituteId).select('universityId');
  let row = await WorkflowInstance.findOne({
    workflowType: 'INSTITUTE_REGISTRATION',
    entityType: 'Institute',
    entityId: instituteId
  });
  if (!row) {
    await WorkflowInstance.create({
      workflowType: 'INSTITUTE_REGISTRATION',
      entityType: 'Institute',
      entityId: instituteId,
      currentState: toState,
      instituteId: oid(instituteId),
      universityId: inst?.universityId || null,
      completedAt: ['APPROVED', 'REJECTED'].includes(toState) ? new Date() : null,
      revision: 1
    });
    return;
  }
  if (row.currentState === toState) return;
  const fromState = row.currentState;
  row.currentState = toState;
  row.revision = Number(row.revision || 1) + 1;
  if (['APPROVED', 'REJECTED'].includes(toState)) row.completedAt = new Date();
  await row.save();
  await WorkflowHistory.create({
    workflowInstanceId: row._id,
    fromState,
    toState,
    action,
    performedBy: oid(user.id),
    performedRole: user.role,
    requestId: req.requestId || null
  });
}
