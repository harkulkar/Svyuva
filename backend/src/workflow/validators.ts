import { z } from 'zod';
import { PRIORITIES, WORKFLOW_ACTIONS, WORKFLOW_TYPES } from '../workflow/types.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const workflowActionSchema = z
  .object({
    action: z.enum(WORKFLOW_ACTIONS),
    reason: z.string().trim().max(2000).optional(),
    comments: z.string().trim().max(2000).optional(),
    expectedRevision: z.number().int().positive().optional(),
    expectedState: z.string().trim().max(40).optional(),
    workflowType: z.enum(WORKFLOW_TYPES).optional(),
    entityId: objectId.optional()
  })
  .strict();

export const workQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  workflowType: z.enum(WORKFLOW_TYPES).optional(),
  status: z.string().trim().max(40).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedUserId: objectId.optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  mine: z.enum(['true', 'false']).optional(),
  unassigned: z.enum(['true', 'false']).optional(),
  overdue: z.enum(['true', 'false']).optional()
});

export const assignWorkflowSchema = z
  .object({
    assignedUserId: objectId,
    priority: z.enum(PRIORITIES).optional()
  })
  .strict();

export const bulkAssignSchema = z
  .object({
    ids: z.array(objectId).min(1).max(50),
    assignedUserId: objectId
  })
  .strict();

export const documentRequirementSchema = z
  .object({
    id: objectId.optional(),
    name: z.string().trim().min(2).max(120),
    documentType: z.string().trim().min(2).max(80),
    workflowType: z.enum(WORKFLOW_TYPES),
    required: z.boolean().optional(),
    allowedFileTypes: z.array(z.string().trim().max(80)).max(10).optional(),
    maxFileSize: z.number().int().positive().max(20 * 1024 * 1024).optional(),
    active: z.boolean().optional(),
    instructions: z.string().trim().max(500).optional(),
    sortOrder: z.number().int().min(0).max(1000).optional()
  })
  .strict();

export const reviewChecklistItemSchema = z
  .object({
    id: objectId.optional(),
    workflowType: z.enum(WORKFLOW_TYPES),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    required: z.boolean().optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional()
  })
  .strict();

export const reviewDecisionSchema = z
  .object({
    action: z.enum(['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_CORRECTION']),
    reason: z.string().trim().max(2000).optional(),
    comments: z.string().trim().max(2000).optional(),
    checklist: z
      .array(
        z.object({
          itemId: objectId,
          result: z.enum(['PASS', 'FAIL', 'NA']),
          comment: z.string().trim().max(500).optional()
        })
      )
      .max(50)
      .optional()
  })
  .strict();

export const documentReviewSchema = z
  .object({
    action: z.enum(['VERIFY', 'REJECT', 'REQUEST_CORRECTION']),
    reason: z.string().trim().max(2000).optional()
  })
  .strict();
