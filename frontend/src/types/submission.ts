export type SubmissionStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'PREMIUM_CALCULATED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED';

export type SubmissionSummary = {
  id: string;
  submissionNumber: string;
  academicYear: string;
  status: SubmissionStatus;
  version: number;
  studentCount: number;
  validStudentCount: number;
  invalidStudentCount: number;
  premium: number | null;
  premiumStatus: string | null;
  ruleVersion: string;
  currency: string;
  submittedAt: string | null;
  createdAt: string | null;
  institute: { id: string; name: string; district?: string };
  university: { id: string; name: string };
  locked: boolean;
};

export type PremiumDto = {
  id: string;
  submissionId: string;
  academicYear: string;
  studentCount: number;
  inputs: { studentCount: number; ratePerStudent: number | null; formula: string };
  basePremium: number | null;
  adjustments: unknown[];
  taxes: unknown[];
  totalPremium: number | null;
  currency: string;
  ruleVersion: string;
  calculationStatus: 'COMPLETE' | 'INCOMPLETE';
  requiresOfficialVerification: boolean;
  verificationNote: string;
  message: string;
  calculatedAt: string | null;
  incompleteBanner: string | null;
};

export type SubmissionDetail = SubmissionSummary & {
  studentsConfirmed: boolean;
  totalRowCount: number;
  duplicateStudentCount: number;
  uploadedFile: { originalFilename: string; mimeType: string; sizeBytes: number | null; checksum: string } | null;
  validation: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    issueCount: number;
    completedAt: string | null;
  };
  premium: PremiumDto | null;
  reviewComment: string;
  reviewedAt: string | null;
  lastCalculatedAt: string | null;
  reconciliation: {
    linkedStudentCount: number;
    studentCountMatch: boolean;
    premiumMatch: boolean;
    warnings: string[];
  };
  documents: Array<{
    id: string;
    documentType: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number | null;
    uploadedAt: string | null;
    fileStatus: string;
    versionNumber: number;
  }>;
  versions: Array<{
    version: number;
    status: string;
    studentCount: number;
    premium: PremiumDto | null;
    uploadedFile: SubmissionDetail['uploadedFile'];
    createdAt: string;
  }>;
  timeline: Array<{ id: string; action: string; createdAt: string; user: { name: string } | null }>;
  canEdit: boolean;
  canSubmit: boolean;
};

export type SubmissionMeta = {
  institute: { id: string; name: string; district?: string };
  university: { id: string; name: string };
  academicYears: { current: string; years: string[]; options: Array<{ value: string; label: string }>; note: string };
  excelNote: string;
  premiumNote: string;
};

export type SubmissionStats = {
  total: number;
  byStatus: Record<string, number>;
  totalStudentsSubmitted: number;
  totalCalculatedPremium: number;
};

export type PreviewRow = {
  id?: string;
  row?: number;
  studentId: string;
  enrollmentNumber: string;
  name: string;
  course: string;
  academicYear: string;
  mobile?: string;
  valid: boolean;
  field?: string;
  message?: string;
  kind?: string;
};
