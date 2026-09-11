import type { NextFunction, Request, Response } from 'express';
import { ok } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';
import { listSchemeRecords } from '../services/schemeRecords.service.js';
import { env } from '../config/env.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function collegeInsurance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listSchemeRecords(requireUser(req), 'insurance', req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listSchemeRecords(requireUser(req), 'documents', req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegePayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listSchemeRecords(requireUser(req), 'payments', req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeEcards(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listSchemeRecords(requireUser(req), 'ecards', req.query as Record<string, string>), 'OK'));
  } catch (error) {
    next(error);
  }
}

export function documentUploadDisabled(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Document upload is not available yet. Please try again later.', 501, 'FEATURE_DISABLED'));
}

export function ecardFileDisabled(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('E-card download is not available yet.', 501, 'FEATURE_DISABLED'));
}

export function pushStatus(_req: Request, res: Response): void {
  const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  res.json(
    ok(
      {
        enabled,
        permissionRequired: true,
        note: enabled
          ? 'Browser push is optional. The portal will ask before enabling it.'
          : 'Browser push is not configured. In-app notifications remain available.'
      },
      'OK'
    )
  );
}

export function pushSubscribeDisabled(_req: Request, res: Response): void {
  const enabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (!enabled) {
    res.status(501).json({
      success: false,
      message: 'Browser push is not configured. In-app notifications remain available.',
      code: 'PUSH_NOT_CONFIGURED'
    });
    return;
  }
  res.status(501).json({
    success: false,
    message: 'Browser push delivery is not enabled in this deployment.',
    code: 'PUSH_NOT_IMPLEMENTED'
  });
}
