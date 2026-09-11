/** TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT */

export const STUDENT_GENDERS = ['Male', 'Female', 'Other'] as const;
export const STUDENT_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] as const;
export const STUDENT_SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
export const STUDENT_CATEGORIES = ['Open', 'SC', 'ST', 'OBC', 'NT', 'SBC', 'EWS', 'Other'] as const;
export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const PARENT_RELATIONS = ['Father', 'Mother'] as const;

export const EXCEL_COLUMNS = [
  'Sr No',
  'Student ID No',
  'Student Name',
  'Parent Name',
  "Student's DOB",
  "Parent's DOB (Optional)",
  'Age',
  'Parent -Age',
  'Student Gender',
  'Father/Mother',
  "Student's Mail Id",
  "Student's Mobile No"
] as const;

export const EXCEL_REQUIRED_COLUMNS = [
  'Sr No',
  'Student ID No',
  'Student Name',
  'Parent Name',
  "Student's DOB",
  'Student Gender',
  'Father/Mother',
  "Student's Mail Id",
  "Student's Mobile No"
] as const;

export function studentMasterData() {
  return {
    verification: 'TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT',
    genders: [...STUDENT_GENDERS],
    years: [...STUDENT_YEARS],
    semesters: [...STUDENT_SEMESTERS],
    categories: [...STUDENT_CATEGORIES],
    statuses: [...STUDENT_STATUSES],
    parentRelations: [...PARENT_RELATIONS],
    excelColumns: [...EXCEL_COLUMNS]
  };
}
