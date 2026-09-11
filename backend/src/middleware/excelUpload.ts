import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { excelLimits } from '../config/excelLimits.js';
import { AppError } from './errorHandler.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: excelLimits().maxFileBytes,
    files: 1
  },
  fileFilter(_req, file, cb) {
    const name = file.originalname.toLowerCase();
    const allowed = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!allowed) {
      cb(new AppError('Upload a .xlsx Excel file.', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  }
});

export function excelTimeout(req: Request, _res: Response, next: NextFunction): void {
  req.setTimeout(excelLimits().parseTimeoutMs);
  next();
}

export function studentExcelUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }
    if (!req.file?.buffer) {
      next(new AppError('Upload an Excel file.', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    if (!looksLikeExcelFile(req.file.buffer, req.file.originalname)) {
      next(new AppError('Upload a valid Excel file.', 400, 'INVALID_FILE_TYPE'));
      return;
    }
    next();
  });
}

function looksLikeExcelFile(buffer: Buffer, originalName: string): boolean {
  if (buffer.length < 8) return false;
  const name = originalName.toLowerCase();
  const zipMagic = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const oleMagic = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
  if (name.endsWith('.xlsx')) return zipMagic;
  if (name.endsWith('.xls')) return oleMagic || zipMagic;
  return false;
}
