import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeRegex } from './escapeRegex.js';
import { looksLikeSpreadsheetFormula, neutralizeSpreadsheetFormula, safeUploadFilename } from './spreadsheet.js';

test('escapeRegex treats search metacharacters as literals', () => {
  const pattern = new RegExp(escapeRegex('a+b.*'), 'i');
  assert.equal(pattern.test('a+b.*'), true);
  assert.equal(pattern.test('abX'), false);
});

test('spreadsheet formula markers are detected and neutralized', () => {
  assert.equal(looksLikeSpreadsheetFormula('=1+1'), true);
  assert.equal(looksLikeSpreadsheetFormula('+cmd'), true);
  assert.equal(looksLikeSpreadsheetFormula('Asha'), false);
  assert.equal(neutralizeSpreadsheetFormula('=HYPERLINK("http://evil")'), "'=HYPERLINK(\"http://evil\")");
});

test('upload filenames cannot traverse directories', () => {
  assert.equal(safeUploadFilename('../../etc/passwd.xlsx'), 'passwd.xlsx');
  assert.equal(safeUploadFilename('students<script>.xlsx'), 'students_script_.xlsx');
});
