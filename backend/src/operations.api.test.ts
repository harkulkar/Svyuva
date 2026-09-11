import assert from 'node:assert/strict';
import test from 'node:test';
import './config/dns.js';
import mongoose from 'mongoose';
import request from 'supertest';
import { env } from './config/env.js';
import { repairLegacyIndexes } from './config/db.js';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { Institute } from './models/Institute.js';
import { University } from './models/University.js';
import { Student } from './models/Student.js';
import { RefreshToken } from './models/RefreshToken.js';
import { hashPassword } from './utils/password.js';
import { getAppVersion } from './config/version.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase11.ops.admin.${stamp}@example.in`;
const collegeEmail = `phase11.ops.college.${stamp}@example.in`;
const universityName = `Phase 11 Ops University ${stamp}`;

test('Phase 11 operations APIs, RBAC, and safe health payloads', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Student.deleteMany({ enrollmentNumber: `P11-${stamp}` });
    await User.deleteMany({ email: { $in: [adminEmail, collegeEmail] } });
    await Institute.deleteMany({ email: collegeEmail });
    await University.deleteMany({ nameNormalized: universityName.trim().toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 11 Ops Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.trim().toLowerCase(),
    code: `P11-${stamp}`,
    status: 'ACTIVE'
  });

  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.ok(health.headers['x-request-id']);
  const healthText = JSON.stringify(health.body);
  assert.equal(health.body.data.status === 'ok' || health.body.data.status === 'degraded', true);
  assert.equal(healthText.includes('mongodb+srv'), false);
  assert.equal(healthText.includes('JWT_'), false);
  assert.equal(healthText.includes(env.JWT_ACCESS_SECRET.slice(0, 12)), false);

  const reused = await request(app).get('/api/health').set('X-Request-ID', 'phase11-req-12345');
  assert.equal(reused.headers['x-request-id'], 'phase11-req-12345');

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await request(app).post('/api/auth/signup').send({
    universityId: String(university._id),
    instituteName: `Phase 11 Ops Institute ${stamp}`,
    exclusiveType: 'Non Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'Ops test address, Pune',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email: collegeEmail,
    mobile: '9876543210',
    contactNumber1: '',
    contactNumber2: '',
    principalName: 'Ops Principal',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  });

  const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeEmail)}`);
  const instituteId = listed.body.data.items[0].id as string;
  assert.equal((await admin.patch(`/api/admin/institutes/${instituteId}/approve`)).status, 200);

  const college = request.agent(app);
  assert.equal((await college.post('/api/auth/login').send({ email: collegeEmail, password })).status, 200);

  await t.test('system health is admin-only and omits secrets', async () => {
    assert.equal((await request(app).get('/api/admin/system-health')).status, 401);
    assert.equal((await college.get('/api/admin/system-health')).status, 403);
    const res = await admin.get('/api/admin/system-health');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.application.version, getAppVersion());
    assert.equal(typeof res.body.data.database.connected, 'boolean');
    assert.equal(typeof res.body.data.database.responseTimeMs, 'number');
    const text = JSON.stringify(res.body);
    assert.equal(text.includes('mongodb+srv'), false);
    assert.equal(text.includes('STORAGE_SECRET'), false);
    assert.equal(text.includes('JWT_'), false);
    assert.equal(res.body.data.database.name, undefined);
    assert.ok(res.body.data.storage);
  });

  await t.test('storage health, feature flags, and support stay admin-only', async () => {
    assert.equal((await college.get('/api/admin/storage-health')).status, 403);
    assert.equal((await college.get('/api/admin/feature-flags')).status, 403);
    assert.equal((await college.get('/api/admin/support?q=Phase')).status, 403);
    assert.equal((await college.get('/api/admin/login-activity')).status, 403);
    assert.equal((await college.get('/api/admin/accounts/inactive')).status, 403);
    const flags = await admin.get('/api/admin/feature-flags');
    assert.equal(flags.status, 200);
    assert.equal(flags.body.data.flags.find((item: { name: string }) => item.name === 'insuranceHttpApi').enabled, false);
    const support = await admin.get('/api/admin/support?q=Phase');
    assert.equal(support.status, 200);
    assert.ok(Array.isArray(support.body.data.users));
    assert.ok(Array.isArray(support.body.data.institutes));
    const login = await admin.get('/api/admin/login-activity?page=1&limit=10');
    assert.equal(login.status, 200);
    const inactive = await admin.get('/api/admin/accounts/inactive?inactiveDays=90');
    assert.equal(inactive.status, 200);
    assert.equal(inactive.body.data.autoDisable, false);
  });

  await t.test('data correction is audited and rejects disallowed fields', async () => {
    const student = await Student.create({
      instituteId,
      universityId: university._id,
      studentId: `S${stamp}`,
      enrollmentNumber: `P11-${stamp}`,
      rollNumber: '1',
      firstName: 'Before',
      lastName: 'Student',
      gender: 'Male',
      dateOfBirth: new Date('2004-01-15'),
      mobile: '9876543211',
      email: `p11.student.${stamp}@example.in`,
      course: 'B.A.',
      year: 'First Year',
      academicYear: '2025-26',
      status: 'ACTIVE'
    });
    const blocked = await admin.post('/api/admin/corrections').send({
      entity: 'Student',
      entityId: String(student._id),
      field: 'instituteId',
      value: String(university._id),
      reason: 'Attempt to reassign institute'
    });
    assert.equal(blocked.status, 400);
    const ok = await admin.post('/api/admin/corrections').send({
      entity: 'Student',
      entityId: String(student._id),
      field: 'firstName',
      value: 'After',
      reason: 'Spelling correction from institute letter'
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.oldValue, 'Before');
    assert.equal(ok.body.data.newValue, 'After');
    const logs = await admin.get('/api/admin/audit-logs?action=DATA_CORRECTION&entityId=' + String(student._id));
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data.pagination.total >= 1);
    const passwordAttempt = await admin.post('/api/admin/corrections').send({
      entity: 'User',
      entityId: String((await User.findOne({ email: collegeEmail }))?._id),
      field: 'passwordHash',
      value: 'nope',
      reason: 'Should not be allowed'
    });
    assert.equal(passwordAttempt.status, 400);
  });

  await t.test('dashboard operations widgets do not expose secrets', async () => {
    const dash = await admin.get('/api/admin/dashboard');
    assert.equal(dash.status, 200);
    assert.ok(dash.body.data.operations);
    assert.equal(JSON.stringify(dash.body).includes('mongodb+srv'), false);
    const reports = await admin.get('/api/admin/reports');
    assert.equal(reports.status, 200);
    assert.equal(reports.body.data.schemeModules.insurance.httpApi, false);
  });
});
