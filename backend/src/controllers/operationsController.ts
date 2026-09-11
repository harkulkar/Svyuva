import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { featureFlagDocs } from '../config/featureFlags.js';
import {
  applyDataCorrection,
  getOperationsSnapshot,
  getStorageHealth,
  getSystemHealth,
  listInactiveAccounts,
  listLoginActivity,
  searchSupport
} from '../services/operationsService.js';
import { ok } from '../utils/apiResponse.js';
import type { DataCorrectionInput, LoginActivityQuery } from '../validators/operationsValidators.js';

function requireAdmin(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function adminSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const started = Date.now();
    const health = await getSystemHealth();
    res.json(ok({ ...health, apiLatencyMs: Date.now() - started }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminStorageHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const health = await getStorageHealth();
    res.json(ok(health, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminFeatureFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    res.json(
      ok(
        {
          flags: featureFlagDocs().map(({ name, enabled }) => ({ name, enabled, default: false })),
          note: 'Flags are environment-controlled. They cannot be changed from this API.'
        },
        'OK'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function adminSupportSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const result = await searchSupport(String(req.query.q || ''));
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminLoginActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const result = await listLoginActivity(req.query as unknown as LoginActivityQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminInactiveAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const days = req.query.inactiveDays ? Number(req.query.inactiveDays) : undefined;
    const result = await listInactiveAccounts(days);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminDataCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = requireAdmin(req);
    const body = req.body as DataCorrectionInput;
    const result = await applyDataCorrection({
      entity: body.entity,
      entityId: body.entityId,
      field: body.field,
      value: body.value,
      reason: body.reason,
      adminId: admin.id,
      req
    });
    res.json(ok(result, 'Correction recorded'));
  } catch (error) {
    next(error);
  }
}

export async function adminOperationsSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdmin(req);
    const snapshot = await getOperationsSnapshot();
    res.json(ok(snapshot, 'OK'));
  } catch (error) {
    next(error);
  }
}
