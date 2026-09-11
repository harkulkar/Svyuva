import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getAdminStudent, listAdminStudents, updateAdminStudentStatus } from '../services/studentService.js';
import { ok } from '../utils/apiResponse.js';
import type { AdminStudentListQuery } from '../validators/studentValidators.js';

export async function adminStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const result = await listAdminStudents(req.query as unknown as AdminStudentListQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function adminStudentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const student = await getAdminStudent(String(req.params.id));
    res.json(ok({ student }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function patchAdminStudentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    const student = await updateAdminStudentStatus(String(req.params.id), req.body.status, req.authUser, req);
    res.json(ok({ student }, 'Student status updated'));
  } catch (error) {
    next(error);
  }
}
