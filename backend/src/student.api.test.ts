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
import { RefreshToken } from './models/RefreshToken.js';
import { Student } from './models/Student.js';
import { UploadJob } from './models/UploadJob.js';
import { hashPassword } from './utils/password.js';
import { EXCEL_COLUMNS } from './data/studentMaster.js';
import { assertExcelFileSize } from './config/excelLimits.js';
import { AppError } from './middleware/errorHandler.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase5.admin.${stamp}@example.in`;
const collegeAEmail = `phase5.college.a.${stamp}@example.in`;
const collegeBEmail = `phase5.college.b.${stamp}@example.in`;
const universityName = `Phase 5 University ${stamp}`;

function signupPayload(email: string, instituteName: string, universityId: string) {
  return {
    universityId,
    instituteName,
    exclusiveType: 'Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'College road, Pune 411001',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email,
    mobile: '9876543210',
    contactNumber1: '',
    contactNumber2: '',
    principalName: 'Principal Phase5',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

function studentPayload(overrides: Record<string, unknown> = {}) {
  return {
    studentId: `SID-${stamp}-1`,
    enrollmentNumber: `ENR-${stamp}-1`,
    rollNumber: `R-${stamp}-1`,
    firstName: 'Asha',
    middleName: '',
    lastName: 'Patil',
    gender: 'Female',
    dateOfBirth: '2004-06-15',
    mobile: '9876501234',
    email: `phase5.student.${stamp}@example.in`,
    course: 'B.A.',
    stream: 'Arts',
    year: 'First Year',
    semester: '1',
    academicYear: '2025-26',
    address: 'Pune',
    parentName: 'Parent Patil',
    parentMobile: '9876501235',
    category: 'Open',
    status: 'ACTIVE',
    ...overrides
  };
}

function workbookBuffer(rows: unknown[][], headers: unknown[] = [...EXCEL_COLUMNS]) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function validExcelRow(overrides: Partial<Record<string, string>> = {}) {
  const base: Record<string, string> = {
    'Sr No': `XR-${stamp}-1`,
    'Student ID No': `XL-${stamp}-1`,
    'Student Name': 'Ravi Deshmukh',
    'Parent Name': 'Parent Patil',
    "Student's DOB": '2003-01-20',
    "Parent's DOB (Optional)": '',
    Age: '',
    'Parent -Age': '',
    'Student Gender': 'Male',
    'Father/Mother': 'Father',
    "Student's Mail Id": `ravi.${stamp}@example.com`,
    "Student's Mobile No": '9876502222',
    ...overrides
  };
  return EXCEL_COLUMNS.map((column) => base[column] ?? '');
}

test('excel size helper rejects oversized buffers', () => {
  assert.throws(
    () => assertExcelFileSize(env.MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024 + 1),
    (error: unknown) => error instanceof AppError && error.code === 'FILE_TOO_LARGE'
  );
});

test('college student isolation and excel import', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    const institutes = await Institute.find({ email: { $in: [collegeAEmail, collegeBEmail] } });
    const instituteIds = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Student.deleteMany({ instituteId: { $in: instituteIds } });
    await UploadJob.deleteMany({ instituteId: { $in: instituteIds } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 5 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P5-${stamp}`,
    shortName: 'P5U',
    status: 'ACTIVE'
  });
  const universityId = String(university._id);

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await request(app).post('/api/auth/signup').send(signupPayload(collegeAEmail, `Phase 5 Institute A ${stamp}`, universityId));
  await request(app).post('/api/auth/signup').send(signupPayload(collegeBEmail, `Phase 5 Institute B ${stamp}`, universityId));

  const listedA = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeAEmail)}`);
  const listedB = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeBEmail)}`);
  const instituteAId = listedA.body.data.items[0].id as string;
  const instituteBId = listedB.body.data.items[0].id as string;
  assert.equal((await admin.patch(`/api/admin/institutes/${instituteAId}/approve`)).status, 200);
  assert.equal((await admin.patch(`/api/admin/institutes/${instituteBId}/approve`)).status, 200);

  const collegeA = request.agent(app);
  const collegeB = request.agent(app);
  assert.equal((await collegeA.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
  assert.equal((await collegeB.post('/api/auth/login').send({ email: collegeBEmail, password })).status, 200);

  let studentAId = '';
  let studentBId = '';

  await t.test('unauthenticated user cannot access student API', async () => {
    const res = await request(app).get('/api/college/students');
    assert.equal(res.status, 401);
  });

  await t.test('college A adds a student and dashboard counts update', async () => {
    const created = await collegeA.post('/api/college/students').send(studentPayload());
    assert.equal(created.status, 201);
    studentAId = created.body.data.student.id;
    const dashboard = await collegeA.get('/api/college/dashboard');
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.data.dashboard.students.available, true);
    assert.equal(dashboard.body.data.dashboard.students.total, 1);
    assert.equal(dashboard.body.data.dashboard.students.active, 1);
  });

  await t.test('college A cannot set another instituteId', async () => {
    const res = await collegeA.post('/api/college/students').send(studentPayload({ studentId: 'X', enrollmentNumber: 'Y', rollNumber: 'Z', instituteId: instituteBId }));
    assert.equal(res.status, 400);
  });

  await t.test('duplicate identifiers are rejected', async () => {
    const res = await collegeA.post('/api/college/students').send(studentPayload({ rollNumber: 'OTHER' }));
    assert.equal(res.status, 409);
  });

  await t.test('college B has a separate student that A cannot see or edit', async () => {
    const created = await collegeB.post('/api/college/students').send(
      studentPayload({
        studentId: `SID-${stamp}-B`,
        enrollmentNumber: `ENR-${stamp}-B`,
        rollNumber: `R-${stamp}-B`,
        email: `phase5.student.b.${stamp}@example.in`
      })
    );
    assert.equal(created.status, 201);
    studentBId = created.body.data.student.id;

    const list = await collegeA.get('/api/college/students?page=1&limit=20');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.pagination.total, 1);
    assert.ok(list.body.data.items.every((item: { id: string }) => item.id !== studentBId));

    const view = await collegeA.get(`/api/college/students/${studentBId}`);
    assert.equal(view.status, 404);
    const edit = await collegeA.patch(`/api/college/students/${studentBId}`).send({ firstName: 'Hacked' });
    assert.equal(edit.status, 404);
    const status = await collegeA.patch(`/api/college/students/${studentBId}/status`).send({ status: 'INACTIVE' });
    assert.equal(status.status, 404);
  });

  await t.test('search filter and pagination stay on the college institute', async () => {
    const search = await collegeA.get('/api/college/students?q=Asha&page=1&limit=20');
    assert.equal(search.status, 200);
    assert.equal(search.body.data.pagination.total, 1);
    const filtered = await collegeA.get('/api/college/students?status=ACTIVE&year=First%20Year&academicYear=2025-26');
    assert.equal(filtered.status, 200);
    const overLimit = await collegeA.get('/api/college/students?limit=1000000');
    assert.equal(overLimit.status, 400);
  });

  await t.test('college cannot call admin student API', async () => {
    const res = await collegeA.get('/api/admin/students');
    assert.equal(res.status, 403);
  });

  await t.test('admin can view students and filter by institute', async () => {
    const all = await admin.get('/api/admin/students?page=1&limit=20');
    assert.equal(all.status, 200);
    assert.ok(all.body.data.pagination.total >= 2);
    const filtered = await admin.get(`/api/admin/students?instituteId=${instituteAId}`);
    assert.equal(filtered.status, 200);
    assert.ok(filtered.body.data.items.every((item: { institute: { id: string } }) => item.institute.id === instituteAId));
    const detail = await admin.get(`/api/admin/students/${studentAId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.student.enrollmentNumber, `ENR-${stamp}-1`);
    const stats = await admin.get('/api/admin/dashboard');
    assert.ok(stats.body.data.students >= 2);
  });

  await t.test('invalid excel is rejected', async () => {
    const missing = workbookBuffer([validExcelRow()], ['Student ID', 'First Name']);
    const res = await collegeA.post('/api/college/students/upload').attach('file', missing, 'students.xlsx');
    assert.equal(res.status, 400);
    assert.match(res.body.message, /required/i);
  });

  await t.test('wrong file type is rejected', async () => {
    const res = await collegeA.post('/api/college/students/upload').attach('file', Buffer.from('not excel'), 'students.txt');
    assert.equal(res.status, 400);
  });

  await t.test('excel preview reports invalid and duplicate rows then imports valid rows', async () => {
    const rows = [
      validExcelRow(),
      validExcelRow({
        'Student ID No': `XL-${stamp}-2`,
        'Sr No': `XR-${stamp}-2`,
        "Student's Mail Id": `ravi2.${stamp}@example.com`,
        "Student's Mobile No": '12345'
      }),
      validExcelRow({
        'Student ID No': `XL-${stamp}-1`,
        'Sr No': `XR-${stamp}-3`,
        "Student's Mail Id": `ravi3.${stamp}@example.com`
      })
    ];
    const buffer = workbookBuffer(rows);
    const preview = await collegeA.post('/api/college/students/upload').attach('file', buffer, 'students.xlsx');
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data.totalRows, 3);
    assert.equal(preview.body.data.valid, 1);
    assert.ok(preview.body.data.invalid >= 1);
    assert.ok(preview.body.data.duplicates >= 1);
    const jobId = preview.body.data.jobId as string;

    const imported = await collegeA.post('/api/college/students/import').send({ jobId });
    assert.equal(imported.status, 200);
    assert.equal(imported.body.data.imported, 1);

    const list = await collegeA.get('/api/college/students?q=Deshmukh');
    assert.equal(list.body.data.pagination.total, 1);

    const errors = await collegeA.get(`/api/college/students/import/${jobId}/errors`);
    assert.equal(errors.status, 200);
    assert.match(String(errors.headers['content-type']), /spreadsheetml/);
  });

  await t.test('college A cannot import using college B job id', async () => {
    const buffer = workbookBuffer([
      validExcelRow({
        'Student ID No': `XL-${stamp}-B2`,
        'Sr No': `XR-${stamp}-B2`,
        "Student's Mail Id": `ravib.${stamp}@example.com`
      })
    ]);
    const preview = await collegeB.post('/api/college/students/upload').attach('file', buffer, 'students.xlsx');
    const jobId = preview.body.data.jobId as string;
    const stolen = await collegeA.post('/api/college/students/import').send({ jobId });
    assert.equal(stolen.status, 404);
  });

  await t.test('student can be viewed edited and deactivated', async () => {
    const viewed = await collegeA.get(`/api/college/students/${studentAId}`);
    assert.equal(viewed.status, 200);
    const edited = await collegeA.patch(`/api/college/students/${studentAId}`).send({ firstName: 'Ashwini' });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.data.student.firstName, 'Ashwini');
    const deactivated = await collegeA.patch(`/api/college/students/${studentAId}/status`).send({ status: 'INACTIVE' });
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.student.status, 'INACTIVE');
    const dashboard = await collegeA.get('/api/college/dashboard');
    assert.equal(dashboard.body.data.dashboard.students.inactive, 1);
  });
});
