import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { adminDownloadDocument, downloadUploadDocument, listUploadDocuments, uploadUploadDocument } from '../services/uploadDocumentService.js';
import { ok } from '../utils/apiResponse.js';

function requireUser(req: Request) {
  if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.authUser;
}

export async function listUploadDocumentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(ok(await listUploadDocuments(requireUser(req), String(req.params.jobId)), 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function uploadDocumentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError('Choose a file to upload.', 400, 'INVALID_FILE_TYPE');
    res.json(
      ok(await uploadUploadDocument(requireUser(req), String(req.params.jobId), String(req.params.type), file, req), 'Document uploaded')
    );
  } catch (error) {
    next(error);
  }
}

export async function downloadUploadDocumentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await downloadUploadDocument(requireUser(req), String(req.params.jobId), String(req.params.type), res);
  } catch (error) {
    next(error);
  }
}

export async function adminDocumentFileHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await adminDownloadDocument(requireUser(req), String(req.params.id), req, res);
  } catch (error) {
    next(error);
  }
}
