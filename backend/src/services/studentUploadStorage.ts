import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../middleware/errorHandler.js';

export const studentUploadDir = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  'storage',
  'student-uploads'
);

const storedNamePattern = /^[a-f0-9]{24}\.(xlsx|xls)$/;

export function studentUploadStoredName(jobId: string, originalName: string) {
  if (!/^[a-f0-9]{24}$/.test(jobId)) {
    throw new AppError('The student file could not be stored.', 500, 'UPLOAD_STORE_FAILED');
  }
  const lower = originalName.toLowerCase();
  const ext = lower.endsWith('.xls') && !lower.endsWith('.xlsx') ? 'xls' : 'xlsx';
  return `${jobId}.${ext}`;
}

export function studentUploadFilePath(storedName: string) {
  const base = path.basename(storedName);
  if (!storedNamePattern.test(base)) {
    throw new AppError('Student file is not available.', 404, 'NOT_FOUND');
  }
  const root = path.resolve(studentUploadDir);
  const full = path.resolve(root, base);
  if (!full.startsWith(root + path.sep)) {
    throw new AppError('Student file is not available.', 404, 'NOT_FOUND');
  }
  return full;
}

export async function saveCollegeStudentUpload(jobId: string, originalName: string, buffer: Buffer) {
  const storedName = studentUploadStoredName(jobId, originalName);
  await mkdir(studentUploadDir, { recursive: true });
  await writeFile(studentUploadFilePath(storedName), buffer);
  return storedName;
}
