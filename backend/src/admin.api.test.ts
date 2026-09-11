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
import { Student } from './models/Student.js';
import { hashPassword } from './utils/password.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase6.admin.${stamp}@example.in`;
const admin2Email = `phase6.admin2.${stamp}@example.in`;
const collegeEmail = `phase6.college.${stamp}@example.in`;
const universityName = `Phase 6 University ${stamp}`;

function signupPayload(universityId: string) {
  return {
    universityId,
    instituteName: `Phase 6 Institute ${stamp}`,
    exclusiveType: 'Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: 'College road, Pune 411001',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email: collegeEmail,
    mobile: '9876543210',
    contactNumber1: '',
    contactNumber2: '',
    principalName: 'Principal Phase6',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

test('admin portal administration', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, admin2Email, collegeEmail] } });
    const institutes = await Institute.find({ email: collegeEmail });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Student.deleteMany({ instituteId: { $in: institutes.map((row) => row._id) } });
    await User.deleteMany({ email: { $in: [adminEmail, admin2Email, collegeEmail] } });
    await Institute.deleteMany({ email: collegeEmail });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 6 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  await User.create({
    name: 'Phase 6 Admin Two',
    email: admin2Email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P6-${stamp}`,
    shortName: 'P6U',
    status: 'ACTIVE'
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await t.test('unauthenticated user cannot call admin APIs', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    assert.equal(res.status, 401);
  });

  await t.test('college cannot call admin APIs or approve itself', async () => {
    await request(app).post('/api/auth/signup').send(signupPayload(String(university._id)));
    const listed = await admin.get(`/api/admin/institutes?q=${encodeURIComponent(collegeEmail)}`);
    const instituteId = listed.body.data.items[0].id as string;
    await User.updateOne({ email: collegeEmail }, { $set: { status: 'ACTIVE' } });
    const college = request.agent(app);
    await college.post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal((await college.get('/api/admin/dashboard')).status, 403);
    assert.equal((await college.get('/api/admin/students')).status, 403);
    assert.equal((await college.patch(`/api/admin/institutes/${instituteId}/approve`)).status, 403);
    await User.updateOne({ email: collegeEmail }, { $set: { status: 'PENDING' } });
  });

  let instituteId = '';

  await t.test('admin lists pending registrations, approves, and dashboard matches database', async () => {
    const pending = await admin.get('/api/admin/registrations?page=1&limit=20');
    assert.equal(pending.status, 200);
    assert.ok(pending.body.data.items.some((item: { email: string }) => item.email === collegeEmail));
    instituteId = pending.body.data.items.find((item: { email: string }) => item.email === collegeEmail).id;
    const approved = await admin.patch(`/api/admin/institutes/${instituteId}/approve`);
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.institute.status, 'ACTIVE');
    assert.equal(typeof approved.body.data.institute.studentCount.total, 'number');

    const dashboard = await admin.get('/api/admin/dashboard');
    assert.equal(dashboard.status, 200);
    const unis = await University.countDocuments();
    const institutes = await Institute.countDocuments();
    assert.equal(dashboard.body.data.universities, unis);
    assert.equal(dashboard.body.data.institutes, institutes);
    assert.ok(Array.isArray(dashboard.body.data.recentActivity));
    assert.ok(dashboard.body.data.notifications.pendingRegistrations >= 0);
  });

  await t.test('college can login after approval and cannot change instituteId', async () => {
    const college = request.agent(app);
    const login = await college.post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(login.status, 200);
    const spoof = await college.patch('/api/college/profile').send({ instituteId: String(university._id) });
    assert.equal(spoof.status, 400);
  });

  await t.test('university search pagination and status', async () => {
    const listed = await admin.get(`/api/admin/universities?q=${encodeURIComponent('Phase 6')}&page=1&limit=20`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.data.pagination.total >= 1);
    const id = listed.body.data.items[0].id as string;
    const patched = await admin.patch(`/api/admin/universities/${id}`).send({ shortName: 'P6-EDIT' });
    assert.equal(patched.status, 200);
    const inactive = await admin.patch(`/api/admin/universities/${id}/status`).send({ status: 'INACTIVE' });
    assert.equal(inactive.body.data.university.status, 'INACTIVE');
    await admin.patch(`/api/admin/universities/${id}/status`).send({ status: 'ACTIVE' });
  });

  await t.test('institute filters pagination and deactivate/activate', async () => {
    const filtered = await admin.get('/api/admin/institutes?status=ACTIVE&district=Pune&page=1&limit=20');
    assert.equal(filtered.status, 200);
    const deactivated = await admin.patch(`/api/admin/institutes/${instituteId}/status`).send({ status: 'INACTIVE' });
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.institute.status, 'INACTIVE');
    const collegeLogin = await request(app).post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(collegeLogin.status, 403);
    const activated = await admin.patch(`/api/admin/institutes/${instituteId}/status`).send({ status: 'ACTIVE' });
    assert.equal(activated.body.data.institute.status, 'ACTIVE');
  });

  await t.test('search, reports, audit logs and export require admin', async () => {
    const search = await admin.get('/api/admin/search?q=Phase');
    assert.equal(search.status, 200);
    assert.ok(Array.isArray(search.body.data.institutes));
    const reports = await admin.get('/api/admin/reports');
    assert.equal(reports.status, 200);
    assert.ok(Array.isArray(reports.body.data.institutesByDistrict));
    const logs = await admin.get('/api/admin/audit-logs?page=1&limit=20&action=INSTITUTE_APPROVED');
    assert.equal(logs.status, 200);
    assert.ok(logs.body.data.pagination.total >= 1);
    const exported = await admin.get('/api/admin/institutes/export?format=csv');
    assert.equal(exported.status, 200);
    assert.match(String(exported.headers['content-type']), /csv/);
  });

  await t.test('password change and last admin protection', async () => {
    const wrong = await admin.post('/api/auth/change-password').send({
      currentPassword: 'WrongPass1',
      newPassword: 'NewerPass1',
      confirmPassword: 'NewerPass1'
    });
    assert.equal(wrong.status, 400);
    const changed = await admin.post('/api/auth/change-password').send({
      currentPassword: password,
      newPassword: 'NewerPass1',
      confirmPassword: 'NewerPass1'
    });
    assert.equal(changed.status, 200);
    await admin.post('/api/auth/login').send({ email: adminEmail, password: 'NewerPass1' });

    const listed = await admin.get('/api/admin/users?role=ADMIN&limit=100');
    assert.equal(listed.status, 200);
    const second = listed.body.data.items.find((item: { email: string }) => item.email === admin2Email);
    assert.ok(second, 'second admin should be listed');
    await admin.patch(`/api/admin/users/${second.id}/status`).send({ status: 'INACTIVE' });
    const first = listed.body.data.items.find((item: { email: string }) => item.email === adminEmail);
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
    const last = await admin.patch(`/api/admin/users/${first.id}/status`).send({ status: 'INACTIVE' });
    if (activeAdmins <= 1) {
      assert.equal(last.status, 409);
    } else {
      assert.equal(last.status, 200);
      await User.updateOne({ email: adminEmail }, { $set: { status: 'ACTIVE' } });
      const relogin = await admin.post('/api/auth/login').send({ email: adminEmail, password: 'NewerPass1' });
      assert.equal(relogin.status, 200);
    }
  });

  await t.test('admin profile cannot change role', async () => {
    const res = await admin.patch('/api/admin/profile').send({ role: 'COLLEGE', name: 'Phase 6 Admin' });
    assert.equal(res.status, 400);
    const ok = await admin.patch('/api/admin/profile').send({ name: 'Phase 6 Administrator' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.user.role, 'ADMIN');
  });
});
