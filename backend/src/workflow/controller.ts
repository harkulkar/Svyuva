import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import type { AuthUser } from '../types/auth.js';
import { getCollegeActionCenter } from './actionCenter.js';
import {
  documentChecklist,
  listDocumentVersions,
  listRequirements,
  replaceDocumentRecord,
  requestDocumentAccess,
  reviewDocument,
  upsertRequirement
} from './documents.js';
import {
  applyWorkflowAction,
  getWorkflowById,
  getWorkflowForEntity,
  listWorkflowHistory
} from './engine.js';
import { decideReview, getReviewBundle, listReviewChecklist, recordChecklistResults, upsertReviewChecklistItem } from './reviews.js';
import type { WorkflowActionName, WorkflowType } from './types.js';
import { assignWorkflow, assignWorkflowBulk, listWorkQueue, workQueueSummary } from './workQueue.js';

function userOf(req: Request): AuthUser {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function adminWorkQueue(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await listWorkQueue(userOf(req), req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminWorkQueueSummary(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await workQueueSummary(userOf(req)), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminAssignWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const assignedUserId = String(req.body.assignedUserId || '');
    res.json(
      ok(await assignWorkflow(userOf(req), req.params.id as string, assignedUserId, req, req.body.priority), 'Assigned')
    );
  } catch (error) {
    next(error);
  }
}

export async function adminBulkAssign(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await assignWorkflowBulk(userOf(req), req.body.ids as string[], String(req.body.assignedUserId), req), 'Assigned'));
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok({ workflow: await getWorkflowById(req.params.id as string, userOf(req)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok({ items: await listWorkflowHistory(req.params.id as string, userOf(req)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function postWorkflowAction(req: Request, res: Response, next: NextFunction) {
  try {
    const user = userOf(req);
    const existing = await getWorkflowById(req.params.id as string, user);
    const workflow = await applyWorkflowAction(
      user,
      {
        workflowType: existing.workflowType as WorkflowType,
        entityId: existing.entityId,
        action: req.body.action as WorkflowActionName,
        reason: req.body.reason,
        comments: req.body.comments,
        expectedRevision: req.body.expectedRevision,
        expectedState: req.body.expectedState
      },
      req
    );
    res.json(ok({ workflow }, 'Updated'));
  } catch (error) {
    next(error);
  }
}

export async function getEntityWorkflow(req: Request, res: Response, next: NextFunction) {
  try {
    const workflowType = req.params.workflowType as WorkflowType;
    const entityId = req.params.entityId as string;
    const row = await getWorkflowForEntity(workflowType, entityId);
    if (!row) {
      throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
    }
    if (userOf(req).role === 'COLLEGE') {
      const inst = userOf(req).instituteId || '';
      if (row.instituteId !== inst && row.entityId !== inst) {
        throw new AppError('Workflow not found.', 404, 'NOT_FOUND');
      }
    }
    res.json(ok({ workflow: await getWorkflowById(row.id, userOf(req)) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeActionCenter(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await getCollegeActionCenter(userOf(req)), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function documentVersionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await listDocumentVersions(userOf(req), req.params.id as string), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function documentAccessHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await requestDocumentAccess(userOf(req), req.params.id as string), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function documentReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(
      ok(
        await reviewDocument(userOf(req), req.params.id as string, req.body.action, req.body.reason, req),
        'Updated'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function documentReplaceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await replaceDocumentRecord(userOf(req), req.params.id as string, req), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function requirementsListHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok({ items: await listRequirements(req.query.workflowType as string | undefined) }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function requirementsUpsertHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok({ items: await upsertRequirement(userOf(req), req.body) }, 'Saved'));
  } catch (error) {
    next(error);
  }
}

export async function checklistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = (req.query.workflowType as WorkflowType) || 'INSTITUTE_REGISTRATION';
    res.json(ok(await documentChecklist(userOf(req), type), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function reviewChecklistHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await listReviewChecklist(req.query.workflowType as string | undefined), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function reviewChecklistUpsertHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await upsertReviewChecklistItem(userOf(req), req.body), 'Saved'));
  } catch (error) {
    next(error);
  }
}

export async function reviewDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await getReviewBundle(userOf(req), req.params.id as string), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function reviewDecisionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body.checklist) {
      await recordChecklistResults(userOf(req), req.params.id as string, req.body.checklist);
    }
    res.json(
      ok(await decideReview(userOf(req), req.params.id as string, req.body.action, req.body.reason, req), 'Updated')
    );
  } catch (error) {
    next(error);
  }
}
