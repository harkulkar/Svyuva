export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export type StudentSummary = {
  id: string;
  studentId: string;
  enrollmentNumber: string;
  rollNumber: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gender: string;
  course: string;
  year: string;
  academicYear: string;
  mobile: string;
  status: StudentStatus;
  institute?: { id: string; name: string };
  university?: { id: string; name: string };
};

export type StudentDetail = {
  id: string;
  studentId: string;
  enrollmentNumber: string;
  rollNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  course: string;
  stream: string;
  year: string;
  semester: string;
  academicYear: string;
  address: string;
  parentName: string;
  parentMobile: string;
  category: string;
  status: StudentStatus;
  createdAt?: string;
  updatedAt?: string;
  institute?: { id: string; name: string };
  university?: { id: string; name: string; code?: string | null; shortName?: string };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type StudentList = {
  items: StudentSummary[];
  pagination: Pagination;
};

export type StudentMeta = {
  verification: string;
  genders: string[];
  years: string[];
  semesters: string[];
  categories: string[];
  statuses: string[];
  parentRelations?: string[];
  excelColumns: string[];
};

export type ExcelIssue = {
  row: number;
  identifier: string;
  field?: string;
  message: string;
  kind: 'invalid' | 'duplicate';
};

export type ExcelPreview = {
  jobId: string;
  filename: string;
  totalRows: number;
  valid: number;
  invalid: number;
  duplicates: number;
  issues: ExcelIssue[];
  preview: Array<{
    row: number;
    studentId: string;
    enrollmentNumber: string;
    name: string;
    gender?: string;
    mobile?: string;
    course: string;
    academicYear: string;
  }>;
  aiSuggestions?: Array<{
    row: number;
    identifier: string;
    observation: string;
    suggestion: string;
    kind: string;
  }>;
  aiSuggestionsNote?: string;
  expiresAt: string;
};

export type ImportResult = {
  jobId: string;
  filename: string;
  totalRows: number;
  imported: number;
  skipped: number;
  failed: number;
  duplicates: number;
  invalid: number;
};
