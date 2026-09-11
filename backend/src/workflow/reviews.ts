import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { getFeatureFlags } from '../config/featureFlags.js';
import { Review } from '../models/Review.js';
import { ReviewChecklistItem, ReviewChecklistResult } from '../models/ReviewChecklist.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { applyWorkflowAction, ensureWorkflowInstance, listWorkflowHistory, toWorkflowDto } from './engine.js';
import type { WorkflowType } from './types.js';

export async function listReviewChecklist(workflowType?: string) {
  const filter: Record<string, unknown> = {};
  if (workflowType) filter.workflowType = workflowType;
  const items = await ReviewChecklistItem.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  return {
    note: 'Checklist items are administrator-configured. None are official unless verified and activated.',
    items: items.map((row) => ({
      id: String(row._id),
      workflowType: row.workflowType,
      name: row.name,
      description: row.description,
      required: row.required,
      active: row.active,
      sortOrder: row.sortOrder
    }))
  };
}

export async function upsertReviewChecklistItem(
  user: AuthUser,
  input: {
    id?: string;
    workflowType: WorkflowType;
    name: string;
    description?: string;
    required?: boolean;
    active?: boolean;
    sortOrder?: number;
  }
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  const payload = {
    workflowType: input.workflowType,
    name: input.name.trim(),
    description: input.description?.trim() || 'TODO: VERIFY OFFICIAL CONTENT',
    required: Boolean(input.required),
    active: Boolean(input.active),
    sortOrder: input.sortOrder || 0
  };
  if (input.id && mongoose.isValidObjectId(input.id)) {
    await ReviewChecklistItem.findByIdAndUpdate(input.id, payload);
  } else {
    await ReviewChecklistItem.findOneAndUpdate({ workflowType: payload.workflowType, name: payload.name }, payload, {
      upsert: true
    });
  }
  return listReviewChecklist(input.workflowType);
}

export async function getReviewBundle(user: AuthUser, reviewId: string) {
  if (!mongoose.isValidObjectId(reviewId)) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  const review = await Review.findById(reviewId).lean();
  if (!review) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  if (user.role === 'COLLEGE') {
    if (!user.instituteId || String(review.instituteId || '') !== user.instituteId) {
      throw new AppError('Review not found.', 404, 'NOT_FOUND');
    }
  }
  const instance = await ensureWorkflowInstance({
    workflowType: 'APPLICATION_REVIEW',
    entityId: reviewId,
    instituteId: review.instituteId ? String(review.instituteId) : null
  });
  const items = await ReviewChecklistItem.find({ workflowType: 'APPLICATION_REVIEW', active: true }).sort({ sortOrder: 1 });
  const results = await ReviewChecklistResult.find({ reviewId }).lean();
  const history = await listWorkflowHistory(String(instance._id), user);
  return {
    review: {
      id: String(review._id),
      status: review.status,
      instituteId: review.instituteId ? String(review.instituteId) : null
    },
    workflow: toWorkflowDto(instance),
    history,
    checklist: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      description: item.description,
      required: item.required,
      result: results.find((row) => String(row.itemId) === String(item._id)) || null
    })),
    note: 'Insurance, payment, and document HTTP mutations stay feature-flagged.'
  };
}

export async function recordChecklistResults(
  user: AuthUser,
  reviewId: string,
  results: Array<{ itemId: string; result: 'PASS' | 'FAIL' | 'NA'; comment?: string }>
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  for (const row of results.slice(0, 50)) {
    if (!mongoose.isValidObjectId(row.itemId)) continue;
    await ReviewChecklistResult.findOneAndUpdate(
      { reviewId, itemId: row.itemId },
      {
        reviewId,
        itemId: row.itemId,
        result: row.result,
        comment: row.comment?.trim() || '',
        recordedBy: user.id
      },
      { upsert: true }
    );
  }
  return getReviewBundle(user, reviewId);
}

export async function decideReview(
  user: AuthUser,
  reviewId: string,
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'START_REVIEW',
  reason: string | undefined,
  req: Parameters<typeof applyWorkflowAction>[2]
) {
  if (user.role !== 'ADMIN') throw new AppError('Not allowed.', 403, 'FORBIDDEN');
  if (!getFeatureFlags().reviewHttpApi) {
    throw new AppError('Review decisions are not available yet.', 501, 'FEATURE_DISABLED');
  }
  const review = await Review.findById(reviewId).select('instituteId status');
  if (!review) throw new AppError('Review not found.', 404, 'NOT_FOUND');
  await ensureWorkflowInstance({
    workflowType: 'APPLICATION_REVIEW',
    entityId: reviewId,
    instituteId: review.instituteId ? String(review.instituteId) : null
  });
  const workflow = await applyWorkflowAction(
    user,
    { workflowType: 'APPLICATION_REVIEW', entityId: reviewId, action, reason, expectedState: String(review.status || 'PENDING') },
    req
  );
  await writeAudit({
    userId: user.id,
    action: `REVIEW_${action}`,
    entity: 'Review',
    entityId: reviewId,
    req,
    metadata: { reason: reason || undefined }
  });
  return workflow;
}
