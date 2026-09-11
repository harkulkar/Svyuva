import { fail } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { categorizeError, recordErrorEvent } from '../utils/errorEvents.js';
import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function routeOf(req: Request): string {
  return (req.originalUrl || req.url || '').split('?')[0] || '';
}

function shouldCapture(status: number, code: string, route: string): boolean {
  if (status >= 500) return true;
  if (code === 'FILE_TOO_LARGE' || code === 'UPLOAD_ERROR' || code === 'INVALID_FILE_TYPE' || code === 'DOWNLOAD_ERROR' || code === 'ECARD_ERROR') {
    return true;
  }
  if (code === 'UNAUTHORIZED' && route.includes('/api/auth/login')) return true;
  if (status === 401 || status === 404) return false;
  if (status >= 400) return true;
  return false;
}

function capture(req: Request, status: number, code: string, message: string): void {
  const route = routeOf(req);
  const category = categorizeError(code, status);
  if (!shouldCapture(status, code, route)) return;
  recordErrorEvent({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    route,
    status,
    category,
    message,
    code
  });
  if (status >= 500) {
    logger.error('api_error', {
      requestId: req.requestId,
      method: req.method,
      route,
      status,
      category,
      code,
      message
    });
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(fail('Route not found', 'NOT_FOUND', req.requestId));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    capture(req, err.statusCode, err.code, err.message);
    res.status(err.statusCode).json(fail(err.message, err.code, req.requestId));
    return;
  }

  if (err instanceof MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The Excel file is too large.' : 'The file could not be uploaded.';
    capture(req, 400, code, message);
    res.status(400).json(fail(message, code, req.requestId));
    return;
  }

  if (err instanceof SyntaxError) {
    capture(req, 400, 'VALIDATION_ERROR', 'Invalid request');
    res.status(400).json(fail('Invalid request', 'VALIDATION_ERROR', req.requestId));
    return;
  }

  const mongoName = err instanceof Error ? err.name : '';
  const category = mongoName.includes('Mongo') ? 'database' : 'unhandled';
  const safeMessage = err instanceof Error ? err.message : 'Unknown error';
  recordErrorEvent({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    route: routeOf(req),
    status: 500,
    category,
    message: 'Unable to process request',
    code: 'INTERNAL_ERROR'
  });
  logger.error('Unhandled error', {
    requestId: req.requestId,
    method: req.method,
    route: routeOf(req),
    status: 500,
    category,
    name: err instanceof Error ? err.name : 'UnknownError',
    message: safeMessage
  });

  res.status(500).json(fail('Unable to process request', 'INTERNAL_ERROR', req.requestId));
}
