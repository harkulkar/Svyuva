export type ClientFileCheck = {
  ok: boolean;
  message?: string;
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';
const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

export function validateExcelFile(file: File, maxBytes: number): ClientFileCheck {
  const ext = fileExtension(file.name);
  if (ext !== 'xlsx' && ext !== 'xls') {
    return { ok: false, message: 'Upload a .xlsx Excel file.' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: `File is too large. Maximum size is ${formatFileSize(maxBytes)}.` };
  }
  if (file.type && !EXCEL_TYPES.includes(file.type) && file.type !== 'application/octet-stream') {
    return { ok: false, message: 'Upload a valid Excel file.' };
  }
  return { ok: true };
}

export function validateDocumentFile(file: File, maxBytes: number, allowCameraImage = true): ClientFileCheck {
  const ext = fileExtension(file.name);
  const allowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
  if (!allowedExt.includes(ext)) {
    return { ok: false, message: 'Upload a PDF or image (JPG, PNG, WebP).' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: `File is too large. Maximum size is ${formatFileSize(maxBytes)}.` };
  }
  const allowedTypes = [PDF_TYPE, ...IMAGE_TYPES, 'application/octet-stream'];
  if (file.type && !allowedTypes.includes(file.type) && !(allowCameraImage && file.type.startsWith('image/'))) {
    return { ok: false, message: 'This file type is not accepted.' };
  }
  return { ok: true };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExtension(file.name));
}

export function isPdfFile(file: File): boolean {
  return file.type === PDF_TYPE || fileExtension(file.name) === 'pdf';
}
