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
