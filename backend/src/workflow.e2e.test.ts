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

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase9.wf.admin.${stamp}@example.in`;
const collegeEmail = `phase9.wf.college.${stamp}@example.in`;
const universityName = `Phase 9 Workflow University ${stamp}`;

function signupBody(universityId: string) {
  return {
    universityId,
    instituteName: `Phase 9 Workflow Institute ${stamp}`,
    exclusiveType: 'Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'Workflow road, Pune 411001',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email: collegeEmail,
    mobile: '9876543210',
    contactNumber1: '',
    contactNumber2: '',
    principalName: 'Workflow Principal',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

function studentBody(overrides: Record<string, unknown> = {}) {
  return {
    studentId: `WF-${stamp}-1`,
    enrollmentNumber: `WENR-${stamp}-1`,
    rollNumber: `WR-${stamp}-1`,
    firstName: 'Meera',
    middleName: '',
    lastName: 'Joshi',
    gender: 'Female',
    dateOfBirth: '2004-03-12',
    mobile: '9876503333',
    email: `phase9.student.${stamp}@example.in`,
    course: 'B.Sc',
    stream: 'Science',
    year: 'First Year',
    semester: '1',
    academicYear: '2025-26',
    address: 'Pune',
    parentName: 'Parent Joshi',
    parentMobile: '9876503334',
    category: 'Open',
    status: 'ACTIVE',
    ...overrides
  };
}

test('Phase 9 workflows 1–3: signup, approval, students, excel', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeEmail] } });
    const institutes = await Institute.find({ email: collegeEmail });
    const instituteIds = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Student.deleteMany({ instituteId: { $in: instituteIds } });
    await UploadJob.deleteMany({ instituteId: { $in: instituteIds } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeEmail] } });
    await Institute.deleteMany({ email: collegeEmail });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 9 Workflow Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P9W-${stamp}`,
    shortName: 'P9W',
    status: 'ACTIVE'
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await t.test('workflow 1: college signup, admin approval, college login and dashboard', async () => {
    const signup = await request(app).post('/api/auth/signup').send(signupBody(String(university._id)));
    assert.equal(signup.status, 201);
    const pendingLogin = await request(app).post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(pendingLogin.status, 403);

    const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeEmail)}`);
    const instituteId = listed.body.data.items[0].id as string;
    assert.equal((await admin.patch(`/api/admin/institutes/${instituteId}/approve`)).status, 200);

    const collegeSession = request.agent(app);
    assert.equal((await collegeSession.post('/api/auth/login').send({ email: collegeEmail, password })).status, 200);
    const dashboard = await collegeSession.get('/api/college/dashboard');
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.data.dashboard.instituteStatus, 'ACTIVE');
  });

  const college = request.agent(app);
  assert.equal((await college.post('/api/auth/login').send({ email: collegeEmail, password })).status, 200);

  let studentId = '';

  await t.test('workflow 2: add, view, and edit a student', async () => {
    const created = await college.post('/api/college/students').send(studentBody());
    assert.equal(created.status, 201);
    studentId = created.body.data.student.id as string;
    const viewed = await college.get(`/api/college/students/${studentId}`);
    assert.equal(viewed.status, 200);
    const edited = await college.patch(`/api/college/students/${studentId}`).send({ firstName: 'Meera R' });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.data.student.firstName, 'Meera R');
  });

  await t.test('workflow 3: excel upload, preview, import, and verify', async () => {
    const row: Record<string, string> = {
      'Sr No': `WFXR-${stamp}`,
      'Student ID No': `WFXL-${stamp}`,
      'Student Name': 'Kiran More',
      'Parent Name': 'Parent More',
      "Student's DOB": '2003-08-01',
      "Parent's DOB (Optional)": '',
      Age: '',
      'Parent -Age': '',
      'Student Gender': 'Male',
      'Father/Mother': 'Father',
      "Student's Mail Id": `kiran.${stamp}@example.com`,
      "Student's Mobile No": '9876504444'
    };
    const sheet = XLSX.utils.aoa_to_sheet([[...EXCEL_COLUMNS], EXCEL_COLUMNS.map((column) => row[column] ?? '')]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const preview = await college.post('/api/college/students/upload').attach('file', buffer, 'students.xlsx');
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data.totalRows, 1);
    assert.equal(preview.body.data.valid, 1);
    const jobId = preview.body.data.jobId as string;
    const imported = await college.post('/api/college/students/import').send({ jobId });
    assert.equal(imported.status, 200);
    assert.equal(imported.body.data.imported, 1);
    const listed = await college.get('/api/college/students?q=WFXL');
    assert.equal(listed.status, 200);
    assert.ok(listed.body.data.items.some((item: { studentId: string }) => item.studentId === `WFXL-${stamp}`));
  });

  await t.test('insurance metadata list is available; enrollment HTTP mutations stay disabled', async () => {
    const insurance = await college.get('/api/college/insurance');
    assert.equal(insurance.status, 200);
    assert.equal(insurance.body.data.httpApi, false);
    const upload = await college.post('/api/college/documents');
    assert.equal(upload.status, 501);
  });
});
