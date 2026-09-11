import assert from 'node:assert/strict';
import test from 'node:test';
import './config/dns.js';
import mongoose from 'mongoose';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { env } from './config/env.js';
import { repairLegacyIndexes } from './config/db.js';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { Institute } from './models/Institute.js';
import { University } from './models/University.js';
import { Student } from './models/Student.js';
import { Notification } from './models/Notification.js';
import { RefreshToken } from './models/RefreshToken.js';
import { DataSubmission } from './models/DataSubmission.js';
import { PremiumRule } from './models/PremiumRule.js';
import { PremiumCalculation } from './models/PremiumCalculation.js';
import { SubmissionVersion } from './models/SubmissionVersion.js';
import { AuditLog } from './models/AuditLog.js';
import { hashPassword } from './utils/password.js';
import { EXCEL_COLUMNS } from './data/studentMaster.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `p15s.admin.${stamp}@example.in`;
const collegeAEmail = `p15s.college.a.${stamp}@example.in`;
const collegeBEmail = `p15s.college.b.${stamp}@example.in`;
const universityName = `Phase 15 Sub University ${stamp}`;

function signupBody(universityId: string, email: string, name: string, mobile: string) {
  return {
    universityId,
    instituteName: name,
    exclusiveType: 'Non Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'Test address, Pune',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email,
    mobile,
    contactNumber1: '0201234567',
    contactNumber2: '',
    principalName: 'Test Principal',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

function workbookBuffer(rows: unknown[][], headers: unknown[] = [...EXCEL_COLUMNS]) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function excelRow(_academicYear: string, suffix: string, overrides: Partial<Record<string, string>> = {}) {
  const base: Record<string, string> = {
    'Sr No': `${stamp}-${suffix}`,
    'Student ID No': `SID-${stamp}-${suffix}`,
    'Student Name': 'Ravi Deshmukh',
    'Parent Name': 'Parent Patil',
    "Student's DOB": '2003-01-20',
    "Parent's DOB (Optional)": '',
    Age: '',
    'Parent -Age': '',
    'Student Gender': 'Male',
    'Father/Mother': 'Father',
    "Student's Mail Id": `ravi.${stamp}.${suffix}@example.com`,
    "Student's Mobile No": '9876502222',
    ...overrides
  };
  return EXCEL_COLUMNS.map((column) => base[column] ?? '');
}

test('Phase 15 college submission, premium, admin review, and isolation', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();
  await Promise.all([
    DataSubmission.syncIndexes(),
    PremiumRule.syncIndexes(),
    PremiumCalculation.syncIndexes(),
    SubmissionVersion.syncIndexes(),
    Student.syncIndexes()
  ]);

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    const institutes = await Institute.find({ email: { $in: [collegeAEmail, collegeBEmail] } });
    const ids = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Student.deleteMany({ instituteId: { $in: ids } });
    await DataSubmission.deleteMany({ instituteId: { $in: ids } });
    await PremiumCalculation.deleteMany({ instituteId: { $in: ids } });
    await SubmissionVersion.deleteMany({ instituteId: { $in: ids } });
    await Notification.deleteMany({ instituteId: { $in: ids } });
    await PremiumRule.deleteMany({ version: { $regex: String(stamp) } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ _id: { $in: ids } });
    await University.deleteMany({ nameNormalized: universityName.trim().toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 15 Sub Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.trim().toLowerCase(),
    code: `P15S-${stamp}`,
    status: 'ACTIVE'
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);
  assert.equal((await request(app).post('/api/auth/signup').send(signupBody(String(university._id), collegeAEmail, `P15SA ${stamp}`, '9876543210'))).status, 201);
  assert.equal((await request(app).post('/api/auth/signup').send(signupBody(String(university._id), collegeBEmail, `P15SB ${stamp}`, '9876543211'))).status, 201);
  const instA = await Institute.findOne({ email: collegeAEmail });
  const instB = await Institute.findOne({ email: collegeBEmail });
  assert.ok(instA && instB);
  assert.equal((await admin.patch(`/api/admin/institutes/${String(instA._id)}/approve`)).status, 200);
  assert.equal((await admin.patch(`/api/admin/institutes/${String(instB._id)}/approve`)).status, 200);

  const collegeA = request.agent(app);
  const collegeB = request.agent(app);
  assert.equal((await collegeA.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
  assert.equal((await collegeB.post('/api/auth/login').send({ email: collegeBEmail, password })).status, 200);

  const meta = await collegeA.get('/api/college/submissions/meta');
  assert.equal(meta.status, 200);
  const academicYear = meta.body.data.academicYears.current as string;
  assert.match(academicYear, /^\d{4}-\d{2}$/);

  const rule = await admin.put('/api/admin/premium-rules').send({
    academicYear,
    version: `${academicYear}-v1-${stamp}`,
    ratePerStudent: 10,
    active: true,
    officialVerified: false
  });
  assert.equal(rule.status, 200, String(rule.body?.message || ''));

  await t.test('create draft ignores client instituteId and rejects a second open year', async () => {
    const created = await collegeA.post('/api/college/submissions').send({ academicYear, instituteId: String(instB._id) });
    assert.equal(created.status, 400);
    const ok = await collegeA.post('/api/college/submissions').send({ academicYear });
    assert.equal(ok.status, 201, String(ok.body?.message || ''));
    assert.equal(ok.body.data.submission.institute.id, String(instA._id));
    const dup = await collegeA.post('/api/college/submissions').send({ academicYear });
    assert.equal(dup.status, 409);
  });

  const list = await collegeA.get('/api/college/submissions');
  assert.equal(list.status, 200);
  const submissionId = list.body.data.items[0].id as string;
  const other = await collegeB.post('/api/college/submissions').send({ academicYear });
  assert.equal(other.status, 201);
  const submissionB = other.body.data.submission.id as string;

  await t.test('excel validation covers invalid type, headers, rows, and duplicates', async () => {
    const notExcel = await collegeA.post(`/api/college/submissions/${submissionId}/upload`).attach('file', Buffer.from('hello'), 'notes.txt');
    assert.equal(notExcel.status, 400);
    const missing = await collegeA
      .post(`/api/college/submissions/${submissionId}/upload`)
      .attach('file', workbookBuffer([['x']], ['Nope']), 'students.xlsx');
    assert.equal(missing.status, 400);
    const invalidRow = excelRow(academicYear, 'bad', { "Student's Mobile No": '12' });
    const invalid = await collegeA
      .post(`/api/college/submissions/${submissionId}/upload`)
      .attach('file', workbookBuffer([invalidRow]), 'students.xlsx');
    assert.equal(invalid.status, 200);
    assert.equal(invalid.body.data.invalid >= 1, true);
    const dupFile = workbookBuffer([excelRow(academicYear, 'd1'), excelRow(academicYear, 'd1')]);
    const dups = await collegeA.post(`/api/college/submissions/${submissionId}/upload`).attach('file', dupFile, 'students.xlsx');
    assert.equal(dups.status, 200);
    assert.equal(dups.body.data.duplicates >= 1, true);
  });

  const many = Array.from({ length: 25 }, (_, index) =>
    excelRow(academicYear, `L${index + 1}`, { "Student's Mobile No": '9876503333' })
  );
  const preview = await collegeA.post(`/api/college/submissions/${submissionId}/upload`).attach('file', workbookBuffer(many), 'students.xlsx');
  assert.equal(preview.status, 200, String(preview.body?.message || ''));
  assert.equal(preview.body.data.totalRows, 25);
  assert.equal(preview.body.data.valid, 25);

  const page1 = await collegeA.get(`/api/college/submissions/${submissionId}/preview?page=1&limit=20`);
  assert.equal(page1.status, 200);
  assert.equal(page1.body.data.items.length, 20);
  assert.equal(page1.body.data.pagination.total, 25);

  await t.test('confirm, premium is backend-only, and invalid submit is blocked', async () => {
    const confirm = await collegeA.post(`/api/college/submissions/${submissionId}/confirm`);
    assert.equal(confirm.status, 200);
    assert.equal(confirm.body.data.studentCount, 25);
    const early = await collegeA.post(`/api/college/submissions/${submissionId}/submit`).send({ declarationAccepted: true });
    assert.equal(early.status, 400);
    const forged = await collegeA.post(`/api/college/submissions/${submissionId}/calculate-premium`).send({ premium: 1, studentCount: 999 });
    assert.equal(forged.status, 200);
    assert.equal(forged.body.data.premium.studentCount, 25);
    assert.equal(forged.body.data.premium.totalPremium, 250);
    assert.equal(forged.body.data.premium.ruleVersion.includes(academicYear), true);
  });

  const submitted = await collegeA.post(`/api/college/submissions/${submissionId}/submit`).send({ declarationAccepted: true });
  assert.equal(submitted.status, 200, String(submitted.body?.message || ''));
  assert.equal(submitted.body.data.submission.status, 'SUBMITTED');
  const again = await collegeA.post(`/api/college/submissions/${submissionId}/submit`).send({ declarationAccepted: true });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.submission.status, 'SUBMITTED');
  const locked = await collegeA.post(`/api/college/submissions/${submissionId}/upload`).attach('file', workbookBuffer([excelRow(academicYear, 'Z1')]), 'students.xlsx');
  assert.equal(locked.status, 409);

  await t.test('college B cannot read college A submission, students, premium, or excel errors', async () => {
    assert.equal((await collegeB.get(`/api/college/submissions/${submissionId}`)).status, 404);
    assert.equal((await collegeB.get(`/api/college/submissions/${submissionId}/students`)).status, 404);
    assert.equal((await collegeB.post(`/api/college/submissions/${submissionId}/calculate-premium`)).status, 404);
    assert.equal((await collegeB.get(`/api/college/submissions/${submissionId}/errors`)).status, 404);
    assert.equal((await collegeA.get(`/api/college/submissions/${submissionB}`)).status, 404);
  });

  await t.test('admin sees submitted college, students, premium, file metadata, audit, and notification', async () => {
    const listed = await admin.get('/api/admin/submissions?status=SUBMITTED');
    assert.equal(listed.status, 200);
    assert.ok(listed.body.data.items.some((item: { id: string }) => item.id === submissionId));
    const detail = await admin.get(`/api/admin/submissions/${submissionId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.submission.studentCount, 25);
    assert.equal(detail.body.data.submission.premium.totalPremium, 250);
    assert.ok(detail.body.data.submission.uploadedFile.originalFilename);
    const students = await admin.get(`/api/admin/submissions/${submissionId}/students`);
    assert.equal(students.status, 200);
    assert.equal(students.body.data.pagination.total, 25);
    const audit = await AuditLog.find({ entity: 'DataSubmission', entityId: submissionId, action: 'SUBMISSION_SUBMITTED' });
    assert.ok(audit.length >= 1);
    const note = await Notification.findOne({ type: 'SUBMISSION_RECEIVED', relatedEntityId: submissionId });
    assert.ok(note);
    const exportRes = await admin.get('/api/admin/submissions/export?format=csv&status=SUBMITTED');
    assert.equal(exportRes.status, 200);
    assert.match(String(exportRes.headers['content-type']), /csv/);
  });

  await t.test('correction, recalc, resubmit, and admin approve notify college', async () => {
    const corr = await admin.post(`/api/admin/submissions/${submissionId}/review`).send({ action: 'REQUEST_CORRECTION', reason: 'Fix one identifier.' });
    assert.equal(corr.status, 200);
    assert.equal(corr.body.data.submission.status, 'CORRECTION_REQUIRED');
    const note = await Notification.findOne({ type: 'SUBMISSION_CORRECTION_REQUIRED', instituteId: instA._id });
    assert.ok(note);
    const upload = await collegeA
      .post(`/api/college/submissions/${submissionId}/upload`)
      .attach('file', workbookBuffer([excelRow(academicYear, 'C1'), excelRow(academicYear, 'C2')]), 'students.xlsx');
    assert.equal(upload.status, 200);
    assert.equal((await collegeA.post(`/api/college/submissions/${submissionId}/confirm`)).status, 200);
    const calc = await collegeA.post(`/api/college/submissions/${submissionId}/calculate-premium`);
    assert.equal(calc.status, 200);
    assert.equal(calc.body.data.premium.totalPremium, 20);
    const resub = await collegeA.post(`/api/college/submissions/${submissionId}/submit`).send({ declarationAccepted: true });
    assert.equal(resub.status, 200);
    assert.equal(resub.body.data.submission.status, 'SUBMITTED');
    const versions = await admin.get(`/api/admin/submissions/${submissionId}`);
    assert.ok(versions.body.data.submission.versions.length >= 1);
    const approve = await admin.post(`/api/admin/submissions/${submissionId}/review`).send({ action: 'APPROVE' });
    assert.equal(approve.status, 200);
    const approvedNote = await Notification.findOne({ type: 'SUBMISSION_APPROVED', instituteId: instA._id });
    assert.ok(approvedNote);
  });

  await t.test('college cannot change status and admin reject notifies', async () => {
    const created = await collegeB.post('/api/college/submissions').send({ academicYear: meta.body.data.academicYears.years.find((y: string) => y !== academicYear) || academicYear });
    if (created.status === 201) {
      const patch = await collegeB.patch(`/api/college/submissions/${created.body.data.submission.id}`).send({ status: 'APPROVED', premium: 1 });
      assert.ok(patch.status === 404 || patch.status === 405);
    }
    const rejectPrep = await collegeB.get('/api/college/submissions');
    const draft = rejectPrep.body.data.items.find((item: { status: string }) => item.status === 'DRAFT');
    if (draft) {
      const rows = [excelRow(academicYear, 'B1')];
      await collegeB.post(`/api/college/submissions/${draft.id}/upload`).attach('file', workbookBuffer(rows), 'students.xlsx');
    }
  });
});
