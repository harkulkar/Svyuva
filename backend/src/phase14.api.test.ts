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
import { RefreshToken } from './models/RefreshToken.js';
import { InsuranceEnrollment } from './models/InsuranceEnrollment.js';
import { hashPassword } from './utils/password.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase14.admin.${stamp}@example.in`;
const collegeAEmail = `phase14.college.a.${stamp}@example.in`;
const collegeBEmail = `phase14.college.b.${stamp}@example.in`;
const universityName = `Phase 14 University ${stamp}`;

test('phase 14 mobile list APIs, isolation, and feature flags', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await InsuranceEnrollment.deleteMany({ academicYear: `P14-${stamp}` });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 14 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P14-${stamp}`,
    shortName: 'P14U',
    status: 'ACTIVE'
  });

  const signup = (email: string, name: string) => ({
    universityId: String(university._id),
    instituteName: name,
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
    principalName: 'Principal 14',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await request(app).post('/api/auth/signup').send(signup(collegeAEmail, `Phase 14 College A ${stamp}`));
  await request(app).post('/api/auth/signup').send(signup(collegeBEmail, `Phase 14 College B ${stamp}`));
  const pending = await admin.get('/api/admin/registrations');
  const instA = pending.body.data.items.find((row: { email: string }) => row.email === collegeAEmail);
  const instB = pending.body.data.items.find((row: { email: string }) => row.email === collegeBEmail);
  assert.ok(instA && instB);
  assert.equal((await admin.patch(`/api/admin/institutes/${instA.id}/approve`)).status, 200);
  assert.equal((await admin.patch(`/api/admin/institutes/${instB.id}/approve`)).status, 200);

  const collegeA = request.agent(app);
  const collegeB = request.agent(app);
  assert.equal((await collegeA.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
  assert.equal((await collegeB.post('/api/auth/login').send({ email: collegeBEmail, password })).status, 200);

  const meA = await collegeA.get('/api/auth/me');
  const meB = await collegeB.get('/api/auth/me');
  const instituteAId = meA.body.data.user.instituteId as string;
  const instituteBId = meB.body.data.user.instituteId as string;
  assert.ok(instituteAId && instituteBId);

  await InsuranceEnrollment.create([
    { instituteId: instituteAId, status: 'ACTIVE', academicYear: `P14-${stamp}`, policyNumber: 'SECRET-A' },
    { instituteId: instituteBId, status: 'ACTIVE', academicYear: `P14-${stamp}`, policyNumber: 'SECRET-B' }
  ]);

  await t.test('college insurance list is scoped to the session institute and omits sensitive fields', async () => {
    const res = await collegeA.get('/api/college/insurance');
    assert.equal(res.status, 200);
    const items = res.body.data.items as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.instituteId, instituteAId);
    assert.equal('policyNumber' in (items[0] || {}), false);
    assert.equal('storageKey' in (items[0] || {}), false);
    assert.equal('sha256' in (items[0] || {}), false);
    assert.equal('gatewayReference' in (items[0] || {}), false);
    assert.ok(res.body.data.pagination);
  });

  await t.test('college B cannot read college A insurance by query instituteId', async () => {
    const res = await collegeB.get(`/api/college/insurance?instituteId=${instituteAId}`);
    assert.equal(res.status, 200);
    const items = res.body.data.items as Array<{ instituteId: string }>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.instituteId, instituteBId);
  });

  await t.test('document upload HTTP remains feature-disabled', async () => {
    const res = await collegeA.post('/api/college/documents').attach('file', Buffer.from('%PDF-1.4'), 'scan.pdf');
    assert.equal(res.status, 501);
    assert.equal(res.body.code, 'FEATURE_DISABLED');
    assert.equal(typeof res.body.message, 'string');
    assert.equal(res.body.message.includes('stack'), false);
  });

  await t.test('e-card file HTTP remains feature-disabled', async () => {
    const res = await collegeA.get('/api/college/ecards/000000000000000000000000/file');
    assert.equal(res.status, 501);
  });

  await t.test('browser push is optional and not forced', async () => {
    const res = await collegeA.get('/api/notifications/push/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.permissionRequired, true);
    const subscribe = await collegeA.post('/api/notifications/push/subscribe').send({});
    assert.equal(subscribe.status, 501);
  });
});
