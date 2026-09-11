import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import {
  getCollegeDashboard,
  getCollegeProfile,
  updateCollegeProfile
} from '../services/instituteService.js';
import { ok } from '../utils/apiResponse.js';
import type { CollegeProfileUpdate } from '../validators/authValidators.js';

export async function collegeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const profile = await getCollegeProfile(req.authUser);
    res.json(ok({ profile }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function patchCollegeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const profile = await updateCollegeProfile(req.authUser, req.body as CollegeProfileUpdate, req);
    res.json(ok({ profile }, 'Profile updated'));
  } catch (error) {
    next(error);
  }
}

export async function collegeDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const dashboard = await getCollegeDashboard(req.authUser);
    res.json(ok({ dashboard }, 'OK'));
  } catch (error) {
    next(error);
  }
}
