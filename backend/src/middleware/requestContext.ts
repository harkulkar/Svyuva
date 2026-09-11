import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-request-id');
  const requestId =
    incoming && /^[\w-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Request-ID', requestId);

  const started = Date.now();
  res.on('finish', () => {
    const route = (req.originalUrl || req.url || '').split('?')[0];
    logger.info('http', {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      route,
      path: route,
      status: res.statusCode,
      durationMs: Date.now() - started,
      userId: req.authUser?.id,
      role: req.authUser?.role
    });
  });

  next();
}
