import assert from 'node:assert/strict';
import test from 'node:test';
import './config/dns.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { env } from './config/env.js';
import { repairLegacyIndexes } from './config/db.js';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { Institute } from './models/Institute.js';
import { University } from './models/University.js';
import { RefreshToken } from './models/RefreshToken.js';
import { hashPassword } from './utils/password.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase9.sec.admin.${stamp}@example.in`;
const collegeEmail = `phase9.sec.college.${stamp}@example.in`;
const universityName = `Phase 9 Security University ${stamp}`;

test('Phase 9 authentication, RBAC, and health hardening', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeEmail] } });
    await Institute.deleteMany({ email: collegeEmail });
    await University.deleteMany({ nameNormalized: universityName.trim().toLowerCase() });
    await mongoose.disconnect();
  });

  const adminUser = await User.create({
    name: 'Phase 9 Security Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.trim().toLowerCase(),
    code: `P9S-${stamp}`,
    status: 'ACTIVE'
  });

  await t.test('unauthenticated and malformed tokens are rejected', async () => {
    const missing = await request(app).get('/api/admin/dashboard');
    assert.equal(missing.status, 401);
    const malformed = await request(app).get('/api/admin/dashboard').set('Authorization', 'Bearer not-a-jwt');
    assert.equal(malformed.status, 401);
    const expired = jwt.sign({ userId: String(adminUser._id), role: 'ADMIN' }, env.JWT_ACCESS_SECRET, { expiresIn: -10 });
    const expiredRes = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${expired}`);
    assert.equal(expiredRes.status, 401);
  });

  await t.test('health endpoints do not expose secrets or collection inventories', async () => {
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
    const text = JSON.stringify(health.body);
    assert.equal(health.body.data.status === 'ok' || health.body.data.status === 'degraded', true);
    assert.equal(Object.prototype.hasOwnProperty.call(health.body.data.database, 'connected'), true);
    assert.equal(text.includes('mongodb+srv'), false);
    assert.equal(text.includes('JWT_'), false);
    assert.equal(Array.isArray(health.body.data.database?.collections), false);

    const db = await request(app).get('/api/health/db');
    assert.ok(db.status === 200 || db.status === 503);
    assert.equal(JSON.stringify(db.body).includes('mongodb+srv'), false);
    assert.equal(db.body.data.database.name, undefined);
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await request(app).post('/api/auth/signup').send({
    universityId: String(university._id),
    instituteName: `Phase 9 Security Institute ${stamp}`,
    exclusiveType: 'Non Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'Security test address, Pune',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email: collegeEmail,
    mobile: '9876543210',
    contactNumber1: '',
    contactNumber2: '',
    principalName: 'Security Principal',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  });

  const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeEmail)}`);
  const instituteId = listed.body.data.items[0].id as string;
  assert.equal((await admin.patch(`/api/admin/institutes/${instituteId}/approve`)).status, 200);

  const college = request.agent(app);
  assert.equal((await college.post('/api/auth/login').send({ email: collegeEmail, password })).status, 200);

  await t.test('college cannot call admin APIs and admin cannot call college APIs', async () => {
    const collegeToAdmin = await college.get('/api/admin/dashboard');
    assert.equal(collegeToAdmin.status, 403);
    const adminToCollege = await admin.get('/api/college/dashboard');
    assert.equal(adminToCollege.status, 403);
    const anon = await request(app).get('/api/college/students');
    assert.equal(anon.status, 401);
  });

  await t.test('password change issues a new session and rejects the previous access token', async () => {
    const before = await User.findOne({ email: adminEmail });
    const stale = jwt.sign(
      { userId: String(before?._id), role: 'ADMIN' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', subject: String(before?._id) }
    );
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const changed = await admin.post('/api/auth/change-password').send({
      currentPassword: password,
      newPassword: 'NewerPass1',
      confirmPassword: 'NewerPass1'
    });
    assert.equal(changed.status, 200);
    const staleRes = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${stale}`);
    assert.equal(staleRes.status, 401);
    const current = await admin.get('/api/admin/dashboard');
    assert.equal(current.status, 200);
    await admin.post('/api/auth/login').send({ email: adminEmail, password: 'NewerPass1' });
  });
});
