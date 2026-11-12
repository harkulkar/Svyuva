/** Official college upload headings from SVYSY_Student_Upload_Template.xlsx */

export const STUDENT_GENDERS = ['Male', 'Female', 'Other'] as const;
export const STUDENT_YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'] as const;
export const STUDENT_SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
export const STUDENT_CATEGORIES = ['Open', 'SC', 'ST', 'OBC', 'NT', 'SBC', 'EWS', 'Other'] as const;
export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const PARENT_RELATIONS = ['Father', 'Mother'] as const;

export const EXCEL_COLUMNS = [
  'Sr No.',
  'Student ID',
  'Name of Insured',
  'DOB',
  'Age',
  'Gender',
  'Relation to',
  'Relation',
  'Location',
  'DOJ',
  'DOC',
  'Sum Insured',
  'Email ID',
  'Mobile No.'
] as const;

export const EXCEL_REQUIRED_COLUMNS = EXCEL_COLUMNS;

export function studentMasterData() {
  return {
    verification: 'Official SVYSY student upload template',
    genders: [...STUDENT_GENDERS],
    years: [...STUDENT_YEARS],
    semesters: [...STUDENT_SEMESTERS],
    categories: [...STUDENT_CATEGORIES],
    statuses: [...STUDENT_STATUSES],
    parentRelations: [...PARENT_RELATIONS],
    excelColumns: [...EXCEL_COLUMNS]
  };
}
