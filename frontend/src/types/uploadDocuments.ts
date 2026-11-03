export type UploadDocumentItem = {
  type: string;
  label: string;
  uploaded: boolean;
  filename: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
};

export type UploadDocumentList = {
  required: boolean;
  locked: boolean;
  maxFileMb: number;
  allowedExtensions: string[];
  items: UploadDocumentItem[];
  uploadedCount: number;
  total: number;
  complete: boolean;
};

export type InstituteDocumentItem = {
  id: string;
  documentType: string;
  label: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  version: number;
  isCurrent: boolean;
};

export type InstituteDocumentGroup = {
  uploadJobId: string | null;
  uploadedAt: string | null;
  uploadFilename: string | null;
  insurer: string | null;
  policyType: string | null;
  paymentStatus: string | null;
  studentCount: number | null;
  items: InstituteDocumentItem[];
};

export type InstituteDocuments = { total: number; groups: InstituteDocumentGroup[] };
