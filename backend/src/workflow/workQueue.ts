import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Institute } from '../models/Institute.js';
import { WorkflowInstance } from '../models/WorkflowInstance.js';
import { WorkflowTask } from '../models/WorkflowTask.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { OPEN_WORKFLOW_STATES, type WorkflowPriority, type WorkflowType } from './types.js';
import { toWorkflowDto } from './engine.js';

function pageParams(query: { page?: string | number; limit?: string | number }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function listWorkQueue(
  user: AuthUser,
  query: {
    page?: string;
    limit?: string;
    workflowType?: string;
    status?: string;
    priority?: string;
    assignedUserId?: string;
    universityId?: string;
    instituteId?: string;
    from?: string;
    to?: string;
    mine?: string;
    unassigned?: string;
    overdue?: string;
  }
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  const { page, limit, skip } = pageParams(query);
  const filter: Record<string, unknown> = {};
  if (query.workflowType) filter.workflowType = query.workflowType;
  if (query.status) filter.currentState = query.status;
  else filter.currentState = { $in: [...OPEN_WORKFLOW_STATES, 'PENDING_REVIEW', 'REPLACEMENT_REQUIRED'] };
  if (query.priority) filter.priority = query.priority;
  if (query.assignedUserId && mongoose.isValidObjectId(query.assignedUserId)) {
    filter.assignedTo = query.assignedUserId;
  }
  if (query.mine === 'true') filter.assignedTo = user.id;
  if (query.unassigned === 'true') filter.assignedTo = null;
  if (query.instituteId && mongoose.isValidObjectId(query.instituteId)) filter.instituteId = query.instituteId;
  if (query.universityId && mongoose.isValidObjectId(query.universityId)) filter.universityId = query.universityId;
  if (query.overdue === 'true') {
    filter.dueAt = { $lt: new Date() };
    filter.completedAt = null;
  }
  const created: Record<string, Date> = {};
  if (query.from) created.$gte = new Date(query.from);
  if (query.to) created.$lte = new Date(query.to);
  if (Object.keys(created).length) filter.createdAt = created;

  const [total, rows] = await Promise.all([
    WorkflowInstance.countDocuments(filter),
    WorkflowInstance.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean()
  ]);
  return {
    items: rows.map((row) => toWorkflowDto(row)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function workQueueSummary(user: AuthUser) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  const open = { currentState: { $in: [...OPEN_WORKFLOW_STATES, 'PENDING_REVIEW', 'REPLACEMENT_REQUIRED'] }, completedAt: null };
  const now = new Date();
  const [mine, unassigned, overdue, high, completed, pendingRegistrations] = await Promise.all([
    WorkflowInstance.countDocuments({ ...open, assignedTo: user.id }),
    WorkflowInstance.countDocuments({ ...open, assignedTo: null }),
    WorkflowInstance.countDocuments({ ...open, dueAt: { $lt: now } }),
    WorkflowInstance.countDocuments({ ...open, priority: { $in: ['HIGH', 'URGENT'] } }),
    WorkflowInstance.countDocuments({
      completedAt: { $gte: new Date(now.getTime() - 7 * 86400000) }
    }),
    Institute.countDocuments({ status: 'PENDING' })
  ]);
  return {
    myTasks: mine,
    unassignedTasks: unassigned,
    overdueTasks: overdue,
    highPriorityTasks: high,
    recentlyCompleted: completed,
    pendingRegistrations,
    note: 'Due dates are operational settings, not official scheme deadlines.'
  };
}

export async function assignWorkflow(
  user: AuthUser,
  workflowId: string,
  assignedUserId: string,
  req: { requestId?: string },
  priority?: WorkflowPriority
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  if (!mongoose.isValidObjectId(workflowId) || !mongoose.isValidObjectId(assignedUserId)) {
    throw new AppError('Invalid identifier.', 400, 'VALIDATION_ERROR');
  }
  const instance = await WorkflowInstance.findById(workflowId);
  if (!instance) throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
  instance.assignedTo = new mongoose.Types.ObjectId(assignedUserId);
  instance.assignedRole = 'ADMIN';
  if (priority) instance.priority = priority;
  instance.revision = Number(instance.revision || 1) + 1;
  await instance.save();
  await WorkflowTask.updateMany(
    { workflowInstanceId: instance._id, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] } },
    { $set: { status: 'CANCELLED' } }
  );
  await WorkflowTask.create({
    workflowInstanceId: instance._id,
    assignedUserId,
    assignedRole: 'ADMIN',
    priority: instance.priority,
    dueAt: instance.dueAt,
    status: 'ASSIGNED',
    instituteId: instance.instituteId,
    universityId: instance.universityId,
    workflowType: instance.workflowType
  });
  await writeAudit({
    userId: user.id,
    action: 'WORKFLOW_ASSIGNED',
    entity: 'WorkflowInstance',
    entityId: String(instance._id),
    req: req as never,
    metadata: { assignedUserId }
  });
  return toWorkflowDto(instance);
}

export async function assignWorkflowBulk(
  user: AuthUser,
  ids: string[],
  assignedUserId: string,
  req: { requestId?: string }
) {
  const unique = [...new Set(ids)].slice(0, 50);
  const items = [];
  for (const id of unique) {
    items.push(await assignWorkflow(user, id, assignedUserId, req));
  }
  return { assigned: items.length, items };
}

export type { WorkflowType };
