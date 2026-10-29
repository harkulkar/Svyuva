import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  UPLOAD_DOCUMENT_TYPES,
  isUploadDocumentType,
  requiredUploadDocuments,
  uploadDocumentLabel
} from './data/uploadDocumentCatalog.js';
import { validateDocumentFile } from './services/documentFileValidation.js';

const MB = 1024 * 1024;
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);
const ole = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32)]);

test('only ICICI Lombard requires the 8-document pack, for both GPA and GMC', () => {
  assert.equal(UPLOAD_DOCUMENT_TYPES.length, 8);
  assert.equal(requiredUploadDocuments('ICICI', 'GPA').length, 8);
  assert.equal(requiredUploadDocuments('ICICI', 'GMC').length, 8);
  assert.deepEqual(requiredUploadDocuments('NATIONAL', 'GPA'), []);
  assert.deepEqual(requiredUploadDocuments('ICICI', 'XXX'), []);
  assert.deepEqual(requiredUploadDocuments(null, null), []);
  assert.equal(uploadDocumentLabel('GPA_PROPOSAL_FORM'), 'GPA Proposal Form');
  assert.equal(uploadDocumentLabel('DCM_MATRIX'), 'DCM Matrix');
  assert.equal(isUploadDocumentType('PEP_KYC'), true);
  assert.equal(isUploadDocumentType('../etc/passwd'), false);
  assert.deepEqual(
    requiredUploadDocuments('ICICI', 'GPA').map((item) => item.label),
    [
      'GPA Proposal Form',
      'Student Data Sheet (Annexure)',
      'Signed & Stamped PEP–KYC',
      'Aadhaar & PAN of Authorized Signatory',
      'BML',
      'College PAN & GST Certificate / NON‑GST Declaration',
      'College Not‑NPO/NGO Declaration',
      'DCM Matrix'
    ]
  );
});

test('document files must match an allowed type by extension and content', () => {
  assert.deepEqual(validateDocumentFile({ originalname: 'form.PDF', buffer: pdf }, MB), { ext: 'pdf', mimeType: 'application/pdf' });
  assert.equal(validateDocumentFile({ originalname: 'id.jpeg', buffer: jpg }, MB).mimeType, 'image/jpeg');
  assert.equal(validateDocumentFile({ originalname: 'id.png', buffer: png }, MB).mimeType, 'image/png');
  assert.equal(validateDocumentFile({ originalname: 'sheet.xlsx', buffer: zip }, MB).ext, 'xlsx');
  assert.equal(validateDocumentFile({ originalname: 'letter.docx', buffer: zip }, MB).ext, 'docx');
  assert.equal(validateDocumentFile({ originalname: 'old.xls', buffer: ole }, MB).ext, 'xls');
  assert.equal(validateDocumentFile({ originalname: 'old.doc', buffer: ole }, MB).ext, 'doc');

  const code = (fn: () => unknown) => {
    try {
      fn();
    } catch (error) {
      return (error as { code?: string }).code;
    }
    return 'NO_ERROR';
  };
  assert.equal(code(() => validateDocumentFile({ originalname: 'run.exe', buffer: pdf }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'page.html', buffer: Buffer.from('<script>alert(1)</script>') }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'noext', buffer: pdf }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'fake.pdf', buffer: Buffer.from('<html>not a pdf at all</html>') }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'fake.png', buffer: pdf }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'tiny.pdf', buffer: Buffer.from('%PDF') }, MB)), 'INVALID_FILE_TYPE');
  assert.equal(code(() => validateDocumentFile({ originalname: 'big.pdf', buffer: Buffer.concat([pdf, Buffer.alloc(MB)]) }, MB)), 'FILE_TOO_LARGE');
});

test('stored files live under a private root and keys cannot escape it', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'svysy-docs-'));
  process.env.DOCUMENT_STORAGE_DIR = dir;
  t.after(async () => {
    delete process.env.DOCUMENT_STORAGE_DIR;
    await rm(dir, { recursive: true, force: true });
  });
  // env.ts reads DOCUMENT_STORAGE_DIR at import time, so load it after setting the variable.
  const storage = await import('./services/fileStorage.js');
  const key = await storage.saveDocumentFile(pdf, 'pdf', new Date('2026-03-09T00:00:00Z'));
  assert.match(key, /^2026\/03\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(storage.documentStorageRoot(), dir);
  assert.ok(storage.resolveStorageKey(key).startsWith(dir + path.sep));
  assert.deepEqual(await readFile(storage.resolveStorageKey(key)), pdf);
  const opened = await storage.openDocumentFile(key);
  assert.equal(opened.size, pdf.length);
  opened.stream.destroy();
  for (const bad of ['../../etc/passwd', '2026/03/../../x.pdf', '/etc/passwd', '2026/03/abc.pdf', '2026/03/' + 'a'.repeat(36) + '.exe.sh']) {
    assert.throws(() => storage.resolveStorageKey(bad), /Invalid storage key/);
  }
});
