import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import type { UserRole } from '../types/roles.js';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      next(new AppError('You are not allowed to access this resource.', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
}
