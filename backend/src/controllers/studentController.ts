import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { studentMasterData } from '../data/studentMaster.js';
import {
  collegeImportErrorFile,
  createCollegeStudent,
  getCollegeStudent,
  importCollegeExcel,
  listCollegeStudents,
  previewCollegeExcel,
  studentTemplateFile,
  updateCollegeStudent,
  updateCollegeStudentStatus
} from '../services/studentService.js';
import { ok } from '../utils/apiResponse.js';
import type { StudentListQuery, StudentUpdateInput, StudentWriteInput } from '../validators/studentValidators.js';

function requireCollege(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

function sendWorkbook(res: Response, filename: string, buffer: Buffer) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export function collegeStudentMeta(_req: Request, res: Response): void {
  res.json(ok(studentMasterData(), 'OK'));
}

export async function collegeStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const result = await listCollegeStudents(user, req.query as unknown as StudentListQuery);
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function collegeStudentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const student = await getCollegeStudent(user, String(req.params.id));
    res.json(ok({ student }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function postCollegeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const student = await createCollegeStudent(user, req.body as StudentWriteInput, req);
    res.status(201).json(ok({ student }, 'Student added'));
  } catch (error) {
    next(error);
  }
}

export async function patchCollegeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const student = await updateCollegeStudent(user, String(req.params.id), req.body as StudentUpdateInput, req);
    res.json(ok({ student }, 'Student updated'));
  } catch (error) {
    next(error);
  }
}

export async function patchCollegeStudentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const student = await updateCollegeStudentStatus(user, String(req.params.id), req.body.status, req);
    res.json(ok({ student }, 'Student status updated'));
  } catch (error) {
    next(error);
  }
}

export function collegeStudentTemplate(_req: Request, res: Response): void {
  const file = studentTemplateFile();
  sendWorkbook(res, file.filename, file.buffer);
}

export async function uploadCollegeStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const preview = await previewCollegeExcel(user, req.file, req);
    res.json(ok(preview, 'Excel validated'));
  } catch (error) {
    next(error);
  }
}

export async function importCollegeStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const result = await importCollegeExcel(user, String(req.body.jobId), req);
    res.json(ok(result, 'Import successful'));
  } catch (error) {
    next(error);
  }
}

export async function collegeStudentImportErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = requireCollege(req);
    const file = await collegeImportErrorFile(user, String(req.params.jobId));
    sendWorkbook(res, file.filename, file.buffer);
  } catch (error) {
    next(error);
  }
}
