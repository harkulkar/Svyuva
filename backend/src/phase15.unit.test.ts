import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedActionsFor, findRule, actionBlockedByFlag } from './workflow/definitions.js';
import { isWriteRequest, selectTools } from './ai/tools/registry.js';
import { computePremiumAmount } from './services/premiumCalculationService.js';
import { parseStudentWorkbook, buildStudentTemplate } from './services/excelService.js';
import { EXCEL_COLUMNS } from './data/studentMaster.js';
import * as XLSX from 'xlsx';
import { formatAcademicYear, isAcademicYear, academicYearLabel } from './config/academicYear.js';

test('registration transitions reject unauthorized and invalid moves', () => {
  assert.equal(findRule('INSTITUTE_REGISTRATION', 'APPROVE', 'PENDING')?.roles.includes('ADMIN'), true);
  assert.equal(findRule('INSTITUTE_REGISTRATION', 'APPROVE', 'PENDING')?.roles.includes('COLLEGE'), false);
  assert.equal(findRule('INSTITUTE_REGISTRATION', 'APPROVE', 'APPROVED'), undefined);
  assert.equal(findRule('INSTITUTE_REGISTRATION', 'REJECT', 'PENDING')?.reasonRequired, true);
  assert.deepEqual(allowedActionsFor('INSTITUTE_REGISTRATION', 'PENDING', 'COLLEGE'), []);
  assert.ok(allowedActionsFor('INSTITUTE_REGISTRATION', 'PENDING', 'ADMIN').includes('APPROVE'));
  assert.ok(allowedActionsFor('INSTITUTE_REGISTRATION', 'CORRECTION_REQUESTED', 'COLLEGE').includes('RESUBMIT'));
});

test('flagged insurance and payment actions stay blocked by default', () => {
  const approve = findRule('INSURANCE_ENROLLMENT', 'APPROVE', 'UNDER_REVIEW');
  assert.ok(approve);
  assert.equal(actionBlockedByFlag(approve!), true);
  const verifyPay = findRule('PAYMENT_VERIFICATION', 'VERIFY', 'PENDING');
  assert.ok(verifyPay);
  assert.equal(actionBlockedByFlag(verifyPay!), true);
});

test('student upload sequence is validating then import', () => {
  assert.equal(findRule('STUDENT_UPLOAD', 'COMPLETE', 'VALIDATING')?.to, 'VALIDATION_COMPLETE');
  assert.equal(findRule('STUDENT_UPLOAD', 'SUBMIT', 'VALIDATION_COMPLETE')?.to, 'IMPORTING');
  assert.equal(findRule('STUDENT_UPLOAD', 'COMPLETE', 'IMPORTING')?.to, 'COMPLETED');
  assert.equal(findRule('STUDENT_UPLOAD', 'REJECT', 'IMPORTING')?.to, 'FAILED');
});

test('AI workflow tools are read-only and selected from questions', () => {
  assert.equal(isWriteRequest('Approve this application'), true);
  assert.ok(selectTools('What are the main pending items today?', 'ADMIN').includes('getWorkflowQueueSummary'));
  assert.ok(selectTools('What do I need to do?', 'COLLEGE').includes('getMyActionCenter'));
  assert.equal(selectTools('What are the main pending items today?', 'COLLEGE').includes('getWorkflowQueueSummary'), false);
});

test('premium engine does not invent a rate', () => {
  const incomplete = computePremiumAmount(10, null);
  assert.equal(incomplete.calculationStatus, 'INCOMPLETE');
  assert.equal(incomplete.totalPremium, null);
  const complete = computePremiumAmount(10, 25);
  assert.equal(complete.calculationStatus, 'COMPLETE');
  assert.equal(complete.totalPremium, 250);
});

test('academic year helper stays configurable YYYY-YY', () => {
  assert.equal(isAcademicYear('2026-27'), true);
  assert.equal(isAcademicYear('2026-2027'), false);
  assert.equal(formatAcademicYear(2026), '2026-27');
  assert.equal(academicYearLabel('2026-27'), '2026-2027');
});

test('excel parser validates headers, rows, and duplicates', () => {
  function book(headers: unknown[], rows: unknown[][]) {
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
  const validRow = EXCEL_COLUMNS.map((column) => {
    const map: Record<string, string> = {
      'Sr No': '1',
      'Student ID No': 'S1',
      'Student Name': 'Ravi Patil',
      'Parent Name': 'Suresh Patil',
      "Student's DOB": '2004-01-01',
      'Student Gender': 'Male',
      'Father/Mother': 'Father',
      "Student's Mail Id": 'ravi.patil@example.com',
      "Student's Mobile No": '9876501111'
    };
    return map[column] || '';
  });
  const parsed = parseStudentWorkbook(book([...EXCEL_COLUMNS], [validRow]));
  assert.equal(parsed.totalRows, 1);
  assert.equal(parsed.validRows.length, 1);
  assert.equal(parsed.validRows[0]?.firstName, 'Ravi');
  assert.equal(parsed.validRows[0]?.lastName, 'Patil');
  assert.throws(() => parseStudentWorkbook(book(['Student ID'], [['S1']])));
  const dup = parseStudentWorkbook(book([...EXCEL_COLUMNS], [validRow, validRow]));
  assert.equal(dup.duplicateCount >= 1, true);
  const badMobile = [...validRow];
  const mobileIdx = EXCEL_COLUMNS.indexOf("Student's Mobile No");
  badMobile[mobileIdx] = '123';
  const invalid = parseStudentWorkbook(book([...EXCEL_COLUMNS], [badMobile]));
  assert.equal(invalid.invalidCount >= 1, true);
  assert.equal(invalid.issues[0]?.field, "Student's Mobile No");
  const parentMismatch = [...validRow];
  parentMismatch[EXCEL_COLUMNS.indexOf("Parent's DOB (Optional)")] = '1968-01-01';
  parentMismatch[EXCEL_COLUMNS.indexOf('Parent -Age')] = '40';
  const parentOptional = parseStudentWorkbook(book([...EXCEL_COLUMNS], [parentMismatch]));
  assert.equal(parentOptional.validRows.length, 1);
  assert.equal(parentOptional.invalidCount, 0);
  const template = XLSX.read(buildStudentTemplate(), { type: 'buffer' });
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(template.Sheets.Students as XLSX.WorkSheet, { header: 1 });
  assert.equal(matrix.length, 1);
  assert.deepEqual(matrix[0], [...EXCEL_COLUMNS]);
});
