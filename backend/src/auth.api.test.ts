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
const collegeEmail = `phase3.college.${stamp}@example.in`;
const adminEmail = `phase3.admin.${stamp}@example.in`;
const password = 'ValidPass1';

const universityName = `Phase 3 Test University ${stamp}`;
const signupBody = {
  universityId: '',
  instituteName: `Phase 3 Test Institute ${stamp}`,
  exclusiveType: 'Non Exclusive',
  locationType: 'Urban',
  minorityType: 'Non Minority',
  linguisticType: 'Non Linguistic',
  address: 'Test address, Pune',
  district: 'Pune',
  taluka: 'Haveli',
  jdRegion: 'Pune',
  email: collegeEmail,
  mobile: '9876543210',
  contactNumber1: '0201234567',
  contactNumber2: '',
  principalName: 'Test Principal',
  collegeType: 'Aided',
  password,
  confirmPassword: password
};

test('auth API flows', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [collegeEmail, adminEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [collegeEmail, adminEmail] } });
    await Institute.deleteMany({ email: collegeEmail });
    await University.deleteMany({ nameNormalized: universityName.trim().toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 3 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.trim().toLowerCase(),
    code: `P3-${stamp}`,
    status: 'ACTIVE'
  });
  signupBody.universityId = String(university._id);

  await t.test('signup creates a PENDING college account', async () => {
    const res = await request(app).post('/api/auth/signup').send(signupBody);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'COLLEGE');
    assert.equal(res.body.data.user.status, 'PENDING');
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  await t.test('duplicate email is rejected', async () => {
    const res = await request(app).post('/api/auth/signup').send(signupBody);
    assert.equal(res.status, 409);
  });

  await t.test('pending college cannot log in', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /pending/i);
  });

  await t.test('wrong password does not reveal the account', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: collegeEmail, password: 'WrongPass1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  await t.test('missing login fields fail validation', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
  });

  await t.test('unknown email does not reveal whether the account exists', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: `missing.${stamp}@example.in`,
      password
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  await t.test('weak signup passwords and ADMIN role are rejected', async () => {
    const weak = await request(app).post('/api/auth/signup').send({
      ...signupBody,
      email: `phase3.weak.${stamp}@example.in`,
      password: 'weakpass',
      confirmPassword: 'weakpass'
    });
    assert.equal(weak.status, 400);

    const adminRole = await request(app).post('/api/auth/signup').send({
      ...signupBody,
      email: `phase3.adminrole.${stamp}@example.in`,
      role: 'ADMIN'
    });
    assert.equal(adminRole.status, 400);
  });

  await t.test('admin login, me, admin ping, college ping forbidden, logout', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({ email: adminEmail, password });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.data.user.role, 'ADMIN');

    const meRes = await agent.get('/api/auth/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.user.email, adminEmail);

    const ping = await agent.get('/api/admin/ping');
    assert.equal(ping.status, 200);

    const forbidden = await agent.get('/api/college/ping');
    assert.equal(forbidden.status, 403);

    const logoutRes = await agent.post('/api/auth/logout');
    assert.equal(logoutRes.status, 200);

    const meAfter = await agent.get('/api/auth/me');
    assert.equal(meAfter.status, 401);
  });

  await t.test('college can access college ping after activation, not admin ping', async () => {
    await User.updateOne({ email: collegeEmail }, { $set: { status: 'ACTIVE' } });
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.data.user.role, 'COLLEGE');

    const collegePing = await agent.get('/api/college/ping');
    assert.equal(collegePing.status, 200);

    const adminPing = await agent.get('/api/admin/ping');
    assert.equal(adminPing.status, 403);
  });

  await t.test('unauthenticated protected routes return 401', async () => {
    const res = await request(app).get('/api/admin/ping');
    assert.equal(res.status, 401);
  });

  await t.test('invalid JWT is rejected', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    assert.equal(res.status, 401);
  });

  await t.test('expired JWT is rejected', async () => {
    const admin = await User.findOne({ email: adminEmail });
    assert.ok(admin);
    const token = jwt.sign(
      { userId: String(admin._id), role: 'ADMIN' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1ms' }
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  });

  await t.test('expired reset token is rejected', async () => {
    const { createPasswordResetToken } = await import('./utils/jwt.js');
    const reset = createPasswordResetToken();
    await User.updateOne(
      { email: collegeEmail },
      { $set: { passwordResetTokenHash: reset.tokenHash, passwordResetExpires: new Date(Date.now() - 1000) } }
    );
    const res = await request(app).post('/api/auth/reset-password').send({
      token: reset.token,
      password: 'ExpiredPass1',
      confirmPassword: 'ExpiredPass1'
    });
    assert.equal(res.status, 400);
  });

  await t.test('inactive user cannot log in', async () => {
    await User.updateOne({ email: adminEmail }, { $set: { status: 'INACTIVE' } });
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    assert.equal(res.status, 403);
    await User.updateOne({ email: adminEmail }, { $set: { status: 'ACTIVE' } });
  });

  await t.test('forgot password always returns a generic success message', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: collegeEmail });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /If an account exists/);
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `missing.${stamp}@example.in` });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.message, res.body.message);
  });

  await t.test('reset password rejects an invalid token', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'a'.repeat(32),
      password: 'NewValid1',
      confirmPassword: 'NewValid1'
    });
    assert.equal(res.status, 400);
  });

  await t.test('reset password succeeds with a valid token', async () => {
    const { createPasswordResetToken, hashToken } = await import('./utils/jwt.js');
    const reset = createPasswordResetToken();
    await User.updateOne(
      { email: collegeEmail },
      { $set: { passwordResetTokenHash: reset.tokenHash, passwordResetExpires: reset.expiresAt } }
    );
    const res = await request(app).post('/api/auth/reset-password').send({
      token: reset.token,
      password: 'NewerPass1',
      confirmPassword: 'NewerPass1'
    });
    assert.equal(res.status, 200);

    const loginOld = await request(app).post('/api/auth/login').send({ email: collegeEmail, password });
    assert.equal(loginOld.status, 401);
    const loginNew = await request(app).post('/api/auth/login').send({ email: collegeEmail, password: 'NewerPass1' });
    assert.equal(loginNew.status, 200);
    assert.equal(hashToken(reset.token).length, 64);

    const reuse = await request(app).post('/api/auth/reset-password').send({
      token: reset.token,
      password: 'ReusePass1',
      confirmPassword: 'ReusePass1'
    });
    assert.equal(reuse.status, 400);
  });
});
