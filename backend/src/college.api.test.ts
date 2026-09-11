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
import { hashPassword } from './utils/password.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase4.admin.${stamp}@example.in`;
const collegeAEmail = `phase4.college.a.${stamp}@example.in`;
const collegeBEmail = `phase4.college.b.${stamp}@example.in`;
const universityName = `Phase 4 University ${stamp}`;

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
    principalName: 'Principal Phase4',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

test('college registration and isolation', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 4 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P4-${stamp}`,
    shortName: 'P4U',
    status: 'ACTIVE'
  });
  const universityId = String(university._id);

  const admin = request.agent(app);
  const adminLogin = await admin.post('/api/auth/login').send({ email: adminEmail, password });
  assert.equal(adminLogin.status, 200);

  await t.test('signup creates pending institute and user', async () => {
    const res = await request(app).post('/api/auth/signup').send(signupPayload(collegeAEmail, `Phase 4 Institute A ${stamp}`, universityId));
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.status, 'PENDING');
    assert.equal(res.body.data.user.role, 'COLLEGE');
  });

  await t.test('duplicate email and duplicate institute name are rejected', async () => {
    const emailDup = await request(app).post('/api/auth/signup').send(signupPayload(collegeAEmail, `Other Name ${stamp}`, universityId));
    assert.equal(emailDup.status, 409);
    const nameDup = await request(app)
      .post('/api/auth/signup')
      .send(signupPayload(collegeBEmail, `Phase 4 Institute A ${stamp}`, universityId));
    assert.equal(nameDup.status, 409);
  });

  await t.test('pending college cannot log in', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: collegeAEmail, password });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /pending/i);
  });

  await t.test('college cannot call admin institute APIs', async () => {
    await User.updateOne({ email: collegeAEmail }, { $set: { status: 'ACTIVE' } });
    const college = request.agent(app);
    await college.post('/api/auth/login').send({ email: collegeAEmail, password });
    const res = await college.get('/api/admin/institutes');
    assert.equal(res.status, 403);
    await User.updateOne({ email: collegeAEmail }, { $set: { status: 'PENDING' } });
  });

  await t.test('admin lists pending institutes, pagination, search and filters', async () => {
    const pending = await admin.get('/api/admin/institutes/pending?page=1&limit=20');
    assert.equal(pending.status, 200);
    assert.ok(pending.body.data.total >= 1);

    const search = await admin.get(`/api/admin/institutes?q=Institute%20A%20${stamp}&page=1&limit=20`);
    assert.equal(search.status, 200);
    assert.ok(search.body.data.items.some((item: { email: string }) => item.email === collegeAEmail));

    const filtered = await admin.get('/api/admin/institutes?status=PENDING&district=Pune&page=1&limit=20');
    assert.equal(filtered.status, 200);
  });

  let instituteId = '';

  await t.test('admin views details and approves', async () => {
    const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeAEmail)}`);
    instituteId = listed.body.data.items[0].id;
    const detail = await admin.get(`/api/admin/institutes/${instituteId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.institute.principalName, 'Principal Phase4');

    const approved = await admin.patch(`/api/admin/institutes/${instituteId}/approve`);
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.institute.status, 'ACTIVE');
  });

  await t.test('college can login after approval and view own profile', async () => {
    const college = request.agent(app);
    const login = await college.post('/api/auth/login').send({ email: collegeAEmail, password });
    assert.equal(login.status, 200);

    const profile = await college.get('/api/college/profile');
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.profile.email, collegeAEmail);
    assert.equal(profile.body.data.profile.university.name, universityName);

    const dashboard = await college.get('/api/college/dashboard');
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.data.dashboard.students.available, true);
    assert.equal(typeof dashboard.body.data.dashboard.students.total, 'number');
  });

  await t.test('college cannot change role, status, or instituteId', async () => {
    const college = request.agent(app);
    await college.post('/api/auth/login').send({ email: collegeAEmail, password });
    const role = await college.patch('/api/college/profile').send({ role: 'ADMIN' });
    assert.equal(role.status, 400);
    const status = await college.patch('/api/college/profile').send({ status: 'ACTIVE', address: 'New address, Pune city' });
    assert.equal(status.status, 400);
    const institute = await college.patch('/api/college/profile').send({ instituteId: 'bbbbbbbbbbbbbbbbbbbbbbbb' });
    assert.equal(institute.status, 400);
  });

  await t.test('admin dashboard stats come from the database', async () => {
    const res = await admin.get('/api/admin/dashboard');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.universities >= 1);
    assert.ok(res.body.data.institutes >= 1);
    assert.ok(res.body.data.activeInstitutes >= 1);
  });

  await t.test('rejected college cannot access the portal', async () => {
    const signupB = await request(app)
      .post('/api/auth/signup')
      .send(signupPayload(collegeBEmail, `Phase 4 Institute B ${stamp}`, universityId));
    assert.equal(signupB.status, 201);
    const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeBEmail)}`);
    const id = listed.body.data.items[0].id;
    const rejected = await admin.patch(`/api/admin/institutes/${id}/reject`).send({
      reason: 'Required registration information is incomplete.'
    });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.body.data.institute.status, 'REJECTED');
    assert.ok(rejected.body.data.institute.rejectionReason);

    const login = await request(app).post('/api/auth/login').send({ email: collegeBEmail, password });
    assert.equal(login.status, 403);
  });

  await t.test('college A cannot read another institute by query', async () => {
    const college = request.agent(app);
    await college.post('/api/auth/login').send({ email: collegeAEmail, password });
    const own = await college.get('/api/college/profile?instituteId=ffffffffffffffffffffffff');
    assert.equal(own.status, 200);
    assert.equal(own.body.data.profile.email, collegeAEmail);
  });
});
