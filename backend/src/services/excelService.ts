import * as XLSX from 'xlsx';
import {
  EXCEL_COLUMNS,
  EXCEL_REQUIRED_COLUMNS,
  PARENT_RELATIONS,
  STUDENT_GENDERS,
  STUDENT_YEARS
} from '../data/studentMaster.js';
import { defaultAcademicYearConfig } from '../config/academicYear.js';
import { AppError } from '../middleware/errorHandler.js';
import { looksLikeSpreadsheetFormula } from '../utils/spreadsheet.js';
import { assertExcelRowCount } from '../config/excelLimits.js';
import { studentWriteSchema, type StudentWriteInput } from '../validators/studentValidators.js';

export type ExcelIssue = {
  row: number;
  identifier: string;
  field?: string;
  message: string;
  kind: 'invalid' | 'duplicate';
};

export type ParsedStudentRow = StudentWriteInput & { sourceRow: number };

export type ExcelParseResult = {
  totalRows: number;
  validRows: ParsedStudentRow[];
  issues: ExcelIssue[];
  invalidCount: number;
  duplicateCount: number;
};

export type ParseStudentWorkbookOptions = {
  academicYear?: string;
};

export const EXCEL_DEFAULT_COURSE = 'Not specified';
export const EXCEL_DEFAULT_YEAR = 'First Year';

function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  const text = String(value).trim();
  if (looksLikeSpreadsheetFormula(text)) {
    return '';
  }
  return text;
}

function cellToDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
  }
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const native = new Date(text);
  if (!Number.isNaN(native.getTime())) return native;
  return undefined;
}

function cellToNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cellToString(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function headerKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[()/._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalHeader(raw: string): string {
  const normalized = normalizeHeader(raw);
  const key = headerKey(normalized);
  const aliases: Record<string, (typeof EXCEL_COLUMNS)[number]> = {
    'sr no': 'Sr No',
    srno: 'Sr No',
    'serial no': 'Sr No',
    'student id no': 'Student ID No',
    'student id': 'Student ID No',
    'student name': 'Student Name',
    'parent name': 'Parent Name',
    'students dob': "Student's DOB",
    'student dob': "Student's DOB",
    'parents dob optional': "Parent's DOB (Optional)",
    'parents dob': "Parent's DOB (Optional)",
    'parent dob': "Parent's DOB (Optional)",
    age: 'Age',
    'parent age': 'Parent -Age',
    parentage: 'Parent -Age',
    'student gender': 'Student Gender',
    gender: 'Student Gender',
    'father mother': 'Father/Mother',
    fathermother: 'Father/Mother',
    'students mail id': "Student's Mail Id",
    'student mail id': "Student's Mail Id",
    'students email': "Student's Mail Id",
    email: "Student's Mail Id",
    'students mobile no': "Student's Mobile No",
    'student mobile no': "Student's Mobile No",
    'studentsmobile no': "Student's Mobile No",
    'studentsmobileno': "Student's Mobile No",
    mobile: "Student's Mobile No",
    'mobile no': "Student's Mobile No"
  };
  if (aliases[key]) return aliases[key];
  const official = EXCEL_COLUMNS.find((column) => headerKey(column) === key);
  return official || normalized;
}

function rowMap(headers: string[], cells: unknown[]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    mapped[header] = cells[index];
  });
  return mapped;
}

function identifierOf(values: { studentId?: string; enrollmentNumber?: string }): string {
  return values.studentId || values.enrollmentNumber || '';
}

function splitStudentName(full: string): { firstName: string; middleName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  if (!parts.length) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: first, middleName: '', lastName: first };
  if (parts.length === 2) return { firstName: first, middleName: '', lastName: last };
  return {
    firstName: first,
    middleName: parts.slice(1, -1).join(' '),
    lastName: last
  };
}

function normalizeGender(value: string): string {
  const key = value.trim().toLowerCase();
  if (key === 'm' || key === 'male') return 'Male';
  if (key === 'f' || key === 'female') return 'Female';
  if (key === 'o' || key === 'other') return 'Other';
  return value.trim();
}

function normalizeParentRelation(value: string): string {
  const key = value.trim().toLowerCase();
  if (key === 'father') return 'Father';
  if (key === 'mother') return 'Mother';
  return value.trim();
}

function normalizeMobile(value: string): string {
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits || value.trim();
}

export function ageInYears(dob: Date, on = new Date()): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const month = on.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

const COLUMN_BY_FIELD: Record<string, string> = {
  studentId: 'Student ID No',
  enrollmentNumber: 'Student ID No',
  rollNumber: 'Sr No',
  serialNumber: 'Sr No',
  firstName: 'Student Name',
  middleName: 'Student Name',
  lastName: 'Student Name',
  gender: 'Student Gender',
  dateOfBirth: "Student's DOB",
  mobile: "Student's Mobile No",
  email: "Student's Mail Id",
  parentName: 'Parent Name',
  parentRelation: 'Father/Mother',
  parentDateOfBirth: "Parent's DOB (Optional)",
  age: 'Age',
  parentAge: 'Parent -Age',
  course: 'Course',
  year: 'Year',
  academicYear: 'Academic Year'
};

export function studentDocumentFromParsedRow(row: StudentWriteInput) {
  return {
    studentId: row.studentId,
    enrollmentNumber: row.enrollmentNumber,
    rollNumber: row.rollNumber,
    firstName: row.firstName,
    middleName: row.middleName || '',
    lastName: row.lastName,
    gender: row.gender,
    dateOfBirth: new Date(row.dateOfBirth),
    mobile: row.mobile,
    email: row.email || '',
    course: row.course,
    stream: row.stream || '',
    year: row.year,
    semester: row.semester || '',
    academicYear: row.academicYear,
    address: row.address || '',
    parentName: row.parentName || '',
    parentMobile: row.parentMobile || '',
    parentRelation: row.parentRelation || '',
    parentDateOfBirth: row.parentDateOfBirth ? new Date(row.parentDateOfBirth) : null,
    serialNumber: row.serialNumber || '',
    age: row.age ?? null,
    parentAge: row.parentAge ?? null,
    category: row.category || '',
    status: row.status || 'ACTIVE'
  };
}

export function serializeExcelValidRows(rows: ParsedStudentRow[]) {
  return rows.map((row) => ({
    ...row,
    dateOfBirth: row.dateOfBirth instanceof Date ? row.dateOfBirth.toISOString() : row.dateOfBirth,
    parentDateOfBirth:
      row.parentDateOfBirth instanceof Date ? row.parentDateOfBirth.toISOString() : row.parentDateOfBirth
  }));
}

export function buildStudentTemplate(): Buffer {
  const notes = [
    ['TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT'],
    ['This template contains column headings and notes only. It does not include sample student rows.'],
    [
      "Columns: Sr No, Student ID No, Student Name, Parent Name, Student's DOB, Parent's DOB (Optional), Age, Parent -Age, Student Gender, Father/Mother, Student's Mail Id, Student's Mobile No"
    ],
    ['Institute and university are taken from the signed-in college account. Do not add those columns.'],
    [`Student Gender: ${STUDENT_GENDERS.join(', ')}`],
    [`Father/Mother: ${PARENT_RELATIONS.join(', ')}`],
    ['Dates: YYYY-MM-DD or DD/MM/YYYY. Age may be left blank and is calculated from Student\'s DOB when possible. Parent\'s DOB and Parent -Age are optional and are not cross-checked.'],
    [
      `Course, year of study, and academic year are not in this sheet. Imported course is stored as "${EXCEL_DEFAULT_COURSE}", year as ${EXCEL_DEFAULT_YEAR}, and academic year from the college year or the submission year.`
    ]
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...EXCEL_COLUMNS]]);
  const noteSheet = XLSX.utils.aoa_to_sheet(notes);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  XLSX.utils.book_append_sheet(workbook, noteSheet, 'Notes');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildErrorWorkbook(issues: ExcelIssue[]): Buffer {
  const rows = [
    ['Row', 'Field', 'Identifier', 'Error'],
    ...issues.map((issue) => [issue.row, issue.field || '', issue.identifier, issue.message])
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Errors');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function parseStudentWorkbook(buffer: Buffer, options?: ParseStudentWorkbookOptions): ExcelParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch {
    throw new AppError('The Excel file could not be read. Upload a valid .xlsx file.', 400, 'CORRUPT_FILE');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AppError('The Excel file has no worksheet.', 400, 'MISSING_SHEET');
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new AppError('The Excel file has no worksheet.', 400, 'MISSING_SHEET');
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  const dataRows = matrix.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''));
  const headerRow = dataRows[0];
  if (!headerRow) {
    throw new AppError('The Excel file is empty.', 400, 'EMPTY_FILE');
  }

  const headers = headerRow.map((cell) => canonicalHeader(normalizeHeader(cell)));
  while (headers.length && !headers[headers.length - 1]) {
    headers.pop();
  }
  if (!headers.length) {
    throw new AppError('The Excel file is empty.', 400, 'EMPTY_FILE');
  }
  const seen = new Set<string>();
  for (const header of headers) {
    if (!header) {
      throw new AppError('The Excel file has an empty column heading.', 400, 'INVALID_COLUMNS');
    }
    if (seen.has(header)) {
      throw new AppError(`Duplicate column: ${header}.`, 400, 'DUPLICATE_COLUMNS');
    }
    seen.add(header);
  }

  const missing = EXCEL_REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new AppError(`${missing[0]} column is required.`, 400, 'MISSING_COLUMNS');
  }

  const unexpected = headers.filter((header) => !(EXCEL_COLUMNS as readonly string[]).includes(header));
  if (unexpected.length) {
    throw new AppError(`Unexpected column: ${unexpected[0]}. Use the official template.`, 400, 'UNEXPECTED_COLUMNS');
  }

  const body = dataRows.slice(1);
  assertExcelRowCount(body.length);
  if (body.length === 0) {
    throw new AppError('The Excel file has a header row but no student records.', 400, 'EMPTY_FILE');
  }

  const academicYear = options?.academicYear || defaultAcademicYearConfig().current;
  const validRows: ParsedStudentRow[] = [];
  const issues: ExcelIssue[] = [];
  const studentIds = new Map<string, number>();
  const serials = new Map<string, number>();

  body.forEach((cells, index) => {
    const excelRow = index + 2;
    const mapped = rowMap(headers, cells);
    const studentId = cellToString(mapped['Student ID No']);
    const serialNumber = cellToString(mapped['Sr No']);
    const names = splitStudentName(cellToString(mapped['Student Name']));
    const studentDob = cellToDate(mapped["Student's DOB"]);
    const parentDobRaw = mapped["Parent's DOB (Optional)"];
    const parentDobText = cellToString(parentDobRaw);
    const parentDob = cellToDate(parentDobRaw);
    const providedAge = cellToNumber(mapped['Age']);
    const providedParentAge = cellToNumber(mapped['Parent -Age']);
    const computedAge = studentDob ? ageInYears(studentDob) : undefined;
    const computedParentAge = parentDob ? ageInYears(parentDob) : undefined;

    const payload: Record<string, unknown> = {
      studentId,
      enrollmentNumber: studentId,
      rollNumber: serialNumber,
      serialNumber,
      firstName: names.firstName,
      middleName: names.middleName,
      lastName: names.lastName,
      gender: normalizeGender(cellToString(mapped['Student Gender'])),
      dateOfBirth: studentDob ?? cellToString(mapped["Student's DOB"]),
      mobile: normalizeMobile(cellToString(mapped["Student's Mobile No"])),
      email: cellToString(mapped["Student's Mail Id"]).toLowerCase(),
      course: EXCEL_DEFAULT_COURSE,
      stream: '',
      year: EXCEL_DEFAULT_YEAR,
      semester: '',
      academicYear,
      address: '',
      parentName: cellToString(mapped['Parent Name']),
      parentMobile: '',
      parentRelation: normalizeParentRelation(cellToString(mapped['Father/Mother'])),
      category: '',
      status: 'ACTIVE',
      age: providedAge ?? computedAge ?? null,
      parentAge: providedParentAge ?? computedParentAge ?? null
    };
    if (parentDob) {
      payload.parentDateOfBirth = parentDob;
    }

    const pushIssue = (field: string, message: string, kind: ExcelIssue['kind'] = 'invalid') => {
      issues.push({
        row: excelRow,
        identifier: identifierOf({ studentId }),
        field,
        message,
        kind
      });
    };

    if (!serialNumber) {
      pushIssue('Sr No', 'Sr No is required.');
      return;
    }
    if (!cellToString(mapped['Student Name'])) {
      pushIssue('Student Name', 'Student Name is required.');
      return;
    }
    if (!cellToString(mapped['Parent Name'])) {
      pushIssue('Parent Name', 'Parent Name is required.');
      return;
    }
    if (!cellToString(mapped["Student's Mail Id"])) {
      pushIssue("Student's Mail Id", "Student's Mail Id is required.");
      return;
    }
    if (!payload.parentRelation) {
      pushIssue('Father/Mother', 'Select Father or Mother.');
      return;
    }
    if (!(PARENT_RELATIONS as readonly string[]).includes(String(payload.parentRelation))) {
      pushIssue('Father/Mother', 'Select Father or Mother.');
      return;
    }
    if (!(STUDENT_YEARS as readonly string[]).includes(EXCEL_DEFAULT_YEAR)) {
      pushIssue('Year', 'Year of study could not be set.');
      return;
    }
    if (parentDobText && !parentDob) {
      pushIssue("Parent's DOB (Optional)", 'Enter a valid parent date of birth.');
      return;
    }
    if (providedAge != null && computedAge != null && Math.abs(providedAge - computedAge) > 1) {
      pushIssue('Age', `Age does not match Student's DOB (expected about ${computedAge}).`);
      return;
    }

    const parsed = studentWriteSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const fieldKey = first?.path?.[0] ? String(first.path[0]) : '';
      issues.push({
        row: excelRow,
        identifier: identifierOf({ studentId }),
        field: COLUMN_BY_FIELD[fieldKey] || fieldKey || undefined,
        message: first?.message ?? 'This row is invalid.',
        kind: 'invalid'
      });
      return;
    }

    const record = parsed.data;
    const sidKey = record.studentId.toLowerCase();
    const serialKey = record.rollNumber.toLowerCase();

    if (studentIds.has(sidKey)) {
      issues.push({
        row: excelRow,
        identifier: record.studentId,
        field: 'Student ID No',
        message: `Student ID No is duplicated in this file (also on row ${studentIds.get(sidKey)}).`,
        kind: 'duplicate'
      });
      return;
    }
    if (serials.has(serialKey)) {
      issues.push({
        row: excelRow,
        identifier: record.rollNumber,
        field: 'Sr No',
        message: `Sr No is duplicated in this file (also on row ${serials.get(serialKey)}).`,
        kind: 'duplicate'
      });
      return;
    }

    studentIds.set(sidKey, excelRow);
    serials.set(serialKey, excelRow);
    validRows.push({ ...record, sourceRow: excelRow });
  });

  const invalidCount = issues.filter((issue) => issue.kind === 'invalid').length;
  const duplicateCount = issues.filter((issue) => issue.kind === 'duplicate').length;

  return {
    totalRows: body.length,
    validRows,
    issues,
    invalidCount,
    duplicateCount
  };
}
