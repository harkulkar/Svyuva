import { getDatabaseStatus } from '../config/db.js';
import { markHealthSuccess } from '../utils/errorEvents.js';
import { pingDatabase } from '../services/operationsService.js';
import { ok } from '../utils/apiResponse.js';
import type { Request, Response, NextFunction } from 'express';

export async function getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const connected = getDatabaseStatus().connected;
    if (connected) markHealthSuccess();
    res.json(
      ok(
        {
          status: connected ? 'ok' : 'degraded',
          database: { connected }
        },
        connected ? 'Service healthy' : 'Service running, database disconnected'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function getDatabaseHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ping = await pingDatabase();
    const okStatus = ping.status === 'ok';
    res.status(okStatus ? 200 : 503).json(
      ok(
        {
          status: okStatus ? 'ok' : 'unavailable',
          database: { connected: okStatus }
        },
        okStatus ? 'Database reachable' : 'Database unavailable'
      )
    );
  } catch (error) {
    next(error);
  }
}
