import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_DOCUMENT_FILE_SIZE_MB * 1024 * 1024, files: 1 }
});

export function documentFileUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(`The file is larger than ${env.MAX_DOCUMENT_FILE_SIZE_MB} MB.`, 413, 'FILE_TOO_LARGE'));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    if (!req.file?.buffer) {
      next(new AppError('Choose a file to upload.', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    next();
  });
}
