import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './errorHandler.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      next(new AppError(first?.message ?? 'Invalid request', 400, 'VALIDATION_ERROR'));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      next(new AppError(first?.message ?? 'Invalid request', 400, 'VALIDATION_ERROR'));
      return;
    }
    req.query = parsed.data as Request['query'];
    next();
  };
}
