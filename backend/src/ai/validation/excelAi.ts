import type { ParsedStudentRow, ExcelIssue } from '../../services/excelService.js';

export type ExcelAiSuggestion = {
  row: number;
  identifier: string;
  observation: string;
  suggestion: string;
  kind: 'likely_duplicate' | 'unusual_value' | 'missing_optional' | 'inconsistent_format';
};

export function reviewExcelWithAi(validRows: ParsedStudentRow[], issues: ExcelIssue[]): ExcelAiSuggestion[] {
  const suggestions: ExcelAiSuggestion[] = [];
  const nameCounts = new Map<string, number[]>();
  for (const row of validRows) {
    const key = `${row.firstName}|${row.lastName}|${row.dateOfBirth?.toISOString().slice(0, 10) || ''}`.toLowerCase();
    const list = nameCounts.get(key) || [];
    list.push(row.sourceRow);
    nameCounts.set(key, list);
    if (!row.email) {
      suggestions.push({
        row: row.sourceRow,
        identifier: row.studentId,
        observation: 'Email is empty.',
        suggestion: 'Add an email if the institute has one. This is a suggestion only; the row was not changed.',
        kind: 'missing_optional'
      });
    }
    if (row.mobile && !/^[6-9]\d{9}$/.test(row.mobile)) {
      suggestions.push({
        row: row.sourceRow,
        identifier: row.studentId,
        observation: 'Mobile number does not look like a 10-digit Indian mobile.',
        suggestion: 'Confirm the mobile number before import. AI will not change the file.',
        kind: 'unusual_value'
      });
    }
  }
  for (const [, rows] of nameCounts) {
    if (rows.length > 1) {
      suggestions.push({
        row: rows[0]!,
        identifier: `rows ${rows.join(', ')}`,
        observation: 'Same name and date of birth appear more than once in this file.',
        suggestion: 'Review whether these are duplicates. AI will not merge or delete rows.',
        kind: 'likely_duplicate'
      });
    }
  }
  void issues;
  return suggestions.slice(0, 50);
}
