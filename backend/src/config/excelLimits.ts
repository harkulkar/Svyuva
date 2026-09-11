import { env } from './env.js';
import { AppError } from '../middleware/errorHandler.js';

export function excelLimits() {
  return {
    maxFileSizeMb: env.MAX_EXCEL_FILE_SIZE_MB,
    maxFileBytes: env.MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024,
    maxRows: env.MAX_EXCEL_ROWS,
    parseTimeoutMs: env.MAX_EXCEL_PARSE_MS
  };
}

export function assertExcelFileSize(sizeBytes: number): void {
  const { maxFileBytes, maxFileSizeMb } = excelLimits();
  if (sizeBytes > maxFileBytes) {
    throw new AppError(`The Excel file is too large. Maximum size is ${maxFileSizeMb} MB.`, 400, 'FILE_TOO_LARGE');
  }
}

export function assertExcelRowCount(rowCount: number): void {
  const { maxRows } = excelLimits();
  if (rowCount > maxRows) {
    throw new AppError(`The Excel file has too many rows. Maximum is ${maxRows}.`, 400, 'TOO_MANY_ROWS');
  }
}
