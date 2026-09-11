import type { NextFunction, Request, Response } from 'express';
import { publicMasterData } from '../data/masterData.js';
import { listUniversities } from '../services/authService.js';
import { ok } from '../utils/apiResponse.js';

export async function getUniversities(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const universities = await listUniversities();
    res.json(ok({ universities }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export function getMasterData(_req: Request, res: Response): void {
  res.json(ok(publicMasterData(), 'OK'));
}
