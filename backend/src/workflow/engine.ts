import type { Request } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { WorkflowHistory } from '../models/WorkflowHistory.js';
import { WorkflowInstance } from '../models/WorkflowInstance.js';
import { WorkflowTask } from '../models/WorkflowTask.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { actionBlockedByFlag, allowedActionsFor, entityTypeFor, findRule } from './definitions.js';
import { applyEntitySideEffects, inferCurrentState } from './entitySync.js';
import { notifyWorkflowChange } from './notify.js';
import type { WorkflowActionName, WorkflowPriority, WorkflowType } from './types.js';

export type ApplyActionInput = {
  workflowType: WorkflowType;
  entityId: string;
  action: WorkflowActionName;
  reason?: string;
  comments?: string;
  expectedRevision?: number;
  expectedState?: string;
  priority?: WorkflowPriority;
  idempotencyKey?: string;
};

function oid(id: string | undefined | null) {
  if (!id || !mongoose.isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export function toWorkflowDto(row: {
  _id: mongoose.Types.ObjectId;
  workflowType: string;
  entityType: string;
  entityId: string;
  currentState: string;
  assignedTo?: mongoose.Types.ObjectId | null;
  assignedRole?: string | null;
  instituteId?: mongoose.Types.ObjectId | null;
  universityId?: mongoose.Types.ObjectId | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  dueAt?: Date | null;
  priority?: string;
  revision?: number;
  metadata?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(row._id),
    workflowType: row.workflowType,
    entityType: row.entityType,
    entityId: row.entityId,
    currentState: row.currentState,
    assignedTo: row.assignedTo ? String(row.assignedTo) : null,
    assignedRole: row.assignedRole || null,
    instituteId: row.instituteId ? String(row.instituteId) : null,
    universityId: row.universityId ? String(row.universityId) : null,
    startedAt: row.startedAt || null,
    completedAt: row.completedAt || null,
    dueAt: row.dueAt || null,
    overdue: Boolean(row.dueAt && !row.completedAt && row.dueAt.getTime() < Date.now()),
    priority: row.priority || 'NORMAL',
    revision: row.revision || 1,
    metadata: row.metadata && typeof row.metadata === 'object' ? sanitizeMeta(row.metadata as Record<string, unknown>) : {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function sanitizeMeta(metadata: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/password|token|hash|secret|storageKey|sha256|gatewayReference/i.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export async function ensureWorkflowInstance(params: {
  workflowType: WorkflowType;
  entityId: string;
  instituteId?: string | null;
  universityId?: string | null;
  actor?: AuthUser;
  dueAt?: Date | null;
  metadata?: Record<string, unknown>;
  initialState?: string;
}) {
  const entityType = entityTypeFor(params.workflowType);
  const existing = await WorkflowInstance.findOne({
    workflowType: params.workflowType,
    entityType,
    entityId: params.entityId
  });
  if (existing) return existing;
  const inferred = params.initialState || (await inferCurrentState(params.workflowType, params.entityId));
  let dueAt = params.dueAt || null;
  if (!dueAt) {
    const { getOperationalSettings } = await import('../settings/settings.service.js');
    const days = (await getOperationalSettings()).workflowDefaultDueDays;
    if (days > 0) dueAt = new Date(Date.now() + days * 86400000);
  }
  const instituteId =
    oid(params.instituteId) || (params.workflowType === 'INSTITUTE_REGISTRATION' ? oid(params.entityId) : null);
  return WorkflowInstance.create({
    workflowType: params.workflowType,
    entityType,
    entityId: params.entityId,
    currentState: inferred || 'PENDING',
    instituteId,
    universityId: oid(params.universityId),
    dueAt,
    metadata: params.metadata || {},
    revision: 1
  });
}

export async function applyWorkflowAction(user: AuthUser, input: ApplyActionInput, req: Request) {
  const instance = await ensureWorkflowInstance({
    workflowType: input.workflowType,
    entityId: input.entityId,
    instituteId: user.instituteId,
    universityId: user.universityId,
    actor: user
  });

  if (user.role === 'COLLEGE') {
    const inst = user.instituteId || '';
    const owns =
      (instance.instituteId && String(instance.instituteId) === inst) ||
      instance.entityId === inst;
    if (!owns) {
      throw new AppError('You cannot access another institute workflow.', 403, 'FORBIDDEN');
    }
  }

  const fromState = instance.currentState || '';
  if (input.expectedRevision != null && Number(instance.revision) !== Number(input.expectedRevision)) {
    throw new AppError('This record was updated by someone else. Refresh and try again.', 409, 'STALE_STATE');
  }
  if (input.expectedState && input.expectedState !== fromState) {
    throw new AppError('This record was updated by someone else. Refresh and try again.', 409, 'STALE_STATE');
  }

  const rule = findRule(input.workflowType, input.action, fromState);
  if (!rule) {
    throw new AppError('That action is not allowed from the current status.', 409, 'INVALID_TRANSITION');
  }
  if (actionBlockedByFlag(rule)) {
    throw new AppError('This action is not available yet.', 501, 'FEATURE_DISABLED');
  }
  const role = user.role === 'ADMIN' || user.role === 'COLLEGE' ? user.role : 'COLLEGE';
  if (!rule.roles.includes(role) && !rule.roles.includes('SYSTEM')) {
    throw new AppError('You are not allowed to perform this action.', 403, 'FORBIDDEN');
  }
  if (rule.reasonRequired && (!input.reason || input.reason.trim().length < 8)) {
    throw new AppError('A meaningful reason is required.', 400, 'REASON_REQUIRED');
  }

  const actionKey = input.idempotencyKey || `${String(instance._id)}:${input.action}:${fromState}:${rule.to}:${user.id}`;
  if (instance.lastActionKey === actionKey) {
    throw new AppError('This action was already recorded.', 409, 'DUPLICATE_ACTION');
  }

  const terminal = ['APPROVED', 'REJECTED', 'COMPLETED', 'FAILED', 'GENERATED', 'CANCELLED', 'VERIFIED'].includes(rule.to);
  const meta = instance.metadata && typeof instance.metadata === 'object' ? { ...(instance.metadata as Record<string, unknown>) } : {};
  if (input.reason) meta.lastReason = input.reason.trim();
  if (input.action === 'REQUEST_CORRECTION') meta.correctionReason = input.reason?.trim();

  const nextRevision = Number(instance.revision || 1) + 1;
  let claimed;
  try {
    claimed = await WorkflowInstance.findOneAndUpdate(
      { _id: instance._id, currentState: fromState, revision: instance.revision },
      {
        $set: {
          currentState: rule.to,
          revision: nextRevision,
          lastActionKey: actionKey,
          completedAt: terminal ? new Date() : null,
          metadata: meta,
          ...(input.priority ? { priority: input.priority } : {})
        }
      },
      { new: true }
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000) {
      throw new AppError('This action was already recorded.', 409, 'DUPLICATE_ACTION');
    }
    throw error;
  }
  if (!claimed) {
    throw new AppError('This record was updated by someone else. Refresh and try again.', 409, 'STALE_STATE');
  }

  try {
    await applyEntitySideEffects({
      type: input.workflowType,
      action: input.action,
      entityId: input.entityId,
      toState: rule.to,
      reason: input.reason,
      user,
      req,
      instance: claimed
    });
  } catch (error) {
    await WorkflowInstance.updateOne(
      { _id: instance._id, revision: nextRevision },
      instance.lastActionKey
        ? {
            $set: {
              currentState: fromState,
              revision: instance.revision,
              lastActionKey: instance.lastActionKey,
              completedAt: instance.completedAt || null,
              metadata: instance.metadata || {}
            }
          }
        : {
            $set: {
              currentState: fromState,
              revision: instance.revision,
              completedAt: instance.completedAt || null,
              metadata: instance.metadata || {}
            },
            $unset: { lastActionKey: 1 }
          }
    );
    throw error;
  }

  instance.currentState = claimed.currentState;
  instance.revision = claimed.revision;
  instance.lastActionKey = claimed.lastActionKey;
  instance.completedAt = claimed.completedAt;
  instance.metadata = claimed.metadata;
  instance.priority = claimed.priority;

  await WorkflowHistory.create({
    workflowInstanceId: instance._id,
    fromState,
    toState: rule.to,
    action: input.action,
    performedBy: oid(user.id),
    performedRole: user.role,
    reason: input.reason?.trim() || null,
    comments: input.comments?.trim() || null,
    requestId: req.requestId || null
  });

  if (terminal) {
    await WorkflowTask.updateMany(
      { workflowInstanceId: instance._id, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } },
      { $set: { status: 'COMPLETED', completedAt: new Date() } }
    );
  }

  await writeAudit({
    userId: user.id,
    action: `WORKFLOW_${input.action}`,
    entity: instance.entityType,
    entityId: instance.entityId,
    req,
    metadata: { workflowType: input.workflowType, fromState, toState: rule.to, reason: input.reason || undefined }
  });

  await notifyWorkflowChange({
    type: input.workflowType,
    action: input.action,
    toState: rule.to,
    instance,
    user,
    reason: input.reason
  });

  return toWorkflowDto(instance);
}

export async function getWorkflowForEntity(workflowType: WorkflowType, entityId: string) {
  const entityType = entityTypeFor(workflowType);
  const row = await WorkflowInstance.findOne({ workflowType, entityType, entityId });
  return row ? toWorkflowDto(row) : null;
}

export async function getWorkflowById(id: string, user: AuthUser) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
  const row = await WorkflowInstance.findById(id);
  if (!row) throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
  if (user.role === 'COLLEGE') {
    const inst = user.instituteId || '';
    const owns = (row.instituteId && String(row.instituteId) === inst) || row.entityId === inst;
    if (!owns) throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
  }
  return { ...toWorkflowDto(row), allowedActions: allowedActionsFor(row.workflowType as WorkflowType, row.currentState, user.role === 'ADMIN' ? 'ADMIN' : 'COLLEGE') };
}

export async function listWorkflowHistory(id: string, user: AuthUser) {
  await getWorkflowById(id, user);
  const rows = await WorkflowHistory.find({ workflowInstanceId: id }).sort({ createdAt: 1 }).limit(200).lean();
  return rows.map((row) => ({
    id: String(row._id),
    fromState: row.fromState,
    toState: row.toState,
    action: row.action,
    performedBy: row.performedBy ? String(row.performedBy) : null,
    performedRole: row.performedRole,
    reason: row.reason,
    comments: row.comments,
    timestamp: row.createdAt
  }));
}

export async function collegeMayLoginForCorrection(instituteId: string | undefined): Promise<boolean> {
  if (!instituteId) return false;
  const row = await WorkflowInstance.findOne({
    workflowType: 'INSTITUTE_REGISTRATION',
    entityType: 'Institute',
    entityId: instituteId,
    currentState: 'CORRECTION_REQUESTED'
  }).select('_id');
  return Boolean(row);
}
