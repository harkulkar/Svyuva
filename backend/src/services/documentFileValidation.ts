import { AppError } from '../middleware/errorHandler.js';

type Allowed = { mime: string; match: (buffer: Buffer) => boolean };

const ZIP = (b: Buffer) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const OLE = (b: Buffer) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 && b[4] === 0xa1 && b[5] === 0xb1;
const JPEG = (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const PNG = (b: Buffer) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a;
const PDF = (b: Buffer) => b.subarray(0, 1024).includes('%PDF-');

const ALLOWED: Record<string, Allowed> = {
  pdf: { mime: 'application/pdf', match: PDF },
  jpg: { mime: 'image/jpeg', match: JPEG },
  jpeg: { mime: 'image/jpeg', match: JPEG },
  png: { mime: 'image/png', match: PNG },
  doc: { mime: 'application/msword', match: OLE },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', match: ZIP },
  xls: { mime: 'application/vnd.ms-excel', match: OLE },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', match: ZIP }
};

export const ALLOWED_DOCUMENT_EXTENSIONS = Object.keys(ALLOWED);

/** Extension must be allow-listed and the file's leading bytes must match it; the stored MIME comes from the extension, not the client. */
export function validateDocumentFile(file: { originalname: string; buffer: Buffer }, maxBytes: number) {
  const dot = file.originalname.lastIndexOf('.');
  const ext = dot >= 0 ? file.originalname.slice(dot + 1).toLowerCase() : '';
  const rule = ALLOWED[ext];
  if (!rule) {
    throw new AppError(`Upload a ${ALLOWED_DOCUMENT_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')} file.`, 400, 'INVALID_FILE_TYPE');
  }
  if (!file.buffer || file.buffer.length < 8) {
    throw new AppError('The file is empty.', 400, 'INVALID_FILE_TYPE');
  }
  if (file.buffer.length > maxBytes) {
    throw new AppError(`The file is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`, 413, 'FILE_TOO_LARGE');
  }
  if (!rule.match(file.buffer)) {
    throw new AppError('The file content does not match its type. Upload a valid file.', 400, 'INVALID_FILE_TYPE');
  }
  return { ext, mimeType: rule.mime };
}
