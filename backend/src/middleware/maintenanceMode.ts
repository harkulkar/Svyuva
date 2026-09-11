import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { fail } from '../utils/apiResponse.js';
import { User } from '../models/User.js';
import { readAccessToken } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';

const ALWAYS_ALLOWED = new Set(['/api/health', '/api/health/db']);

async function isActiveAdmin(req: Request): Promise<boolean> {
  const token = readAccessToken(req);
  if (!token) return false;
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('role status');
    return Boolean(user && user.role === 'ADMIN' && user.status === 'ACTIVE');
  } catch {
    return false;
  }
}

export async function maintenanceMode(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!env.MAINTENANCE_MODE) {
    next();
    return;
  }

  const path = (req.originalUrl || req.url || '').split('?')[0] || '';
  if (ALWAYS_ALLOWED.has(path)) {
    next();
    return;
  }

  if (env.MAINTENANCE_ALLOW_ADMIN) {
    if (path === '/api/auth/login' || path === '/api/auth/refresh') {
      next();
      return;
    }
    if (await isActiveAdmin(req)) {
      next();
      return;
    }
  }

  res.status(503).json(
    fail('The portal is temporarily unavailable for maintenance.', 'MAINTENANCE', req.requestId)
  );
}
