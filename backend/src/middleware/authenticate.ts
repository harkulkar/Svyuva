import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import { User } from '../models/User.js';
import { toAuthUser } from '../services/authService.js';
import { collegeMayLoginForCorrection } from '../workflow/engine.js';
import { readAccessToken } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readAccessToken(req);
    if (!token) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }
    if (user.status === 'ACTIVE') {
      // continue
    } else if (
      user.status === 'PENDING' &&
      user.role === 'COLLEGE' &&
      (await collegeMayLoginForCorrection(user.instituteId ? String(user.instituteId) : undefined))
    ) {
      // correction-only session
    } else {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (user.passwordChangedAt && typeof payload.iat === 'number') {
      const changedSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedSec) {
        throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
      }
    }

    req.authUser = toAuthUser(user);
    req.user = req.authUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readAccessToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    void User.findById(payload.userId)
      .then((user) => {
        if (user?.status === 'ACTIVE') {
          req.authUser = toAuthUser(user);
          req.user = req.authUser;
        }
        next();
      })
      .catch(() => next());
  } catch {
    next();
  }
}
