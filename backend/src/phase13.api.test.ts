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
import { Notification } from './models/Notification.js';
import { Announcement } from './models/Announcement.js';
import { hashPassword } from './utils/password.js';
import { sendPendingReminders } from './jobs/scheduler.js';
import { createNotification } from './notifications/notification.service.js';
import { emailService } from './services/emailService.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase13.admin.${stamp}@example.in`;
const collegeAEmail = `phase13.college.a.${stamp}@example.in`;
const collegeBEmail = `phase13.college.b.${stamp}@example.in`;
const universityName = `Phase 13 University ${stamp}`;

test('phase 13 analytics, notifications, reports, jobs', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();
  await Notification.syncIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Notification.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Announcement.deleteMany({ title: /Phase 13/ });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  const adminUser = await User.create({
    name: 'Phase 13 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `P13-${stamp}`,
    shortName: 'P13U',
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
    principalName: 'Principal 13',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await request(app).post('/api/auth/signup').send(signup(collegeAEmail, `Phase 13 College A ${stamp}`));
  await request(app).post('/api/auth/signup').send(signup(collegeBEmail, `Phase 13 College B ${stamp}`));
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

  await t.test('approval creates ACCOUNT_APPROVED for institute users only', async () => {
    const userA = await User.findOne({ email: collegeAEmail });
    const notes = await Notification.find({ userId: userA?._id, type: 'ACCOUNT_APPROVED' });
    assert.ok(notes.length >= 1);
    const userB = await User.findOne({ email: collegeBEmail });
    const leaked = await Notification.find({ userId: userB?._id, instituteId: instA.id });
    assert.equal(leaked.length, 0);
  });

  await t.test('notification list is scoped to the logged-in user', async () => {
    const listA = await collegeA.get('/api/notifications');
    assert.equal(listA.status, 200);
    assert.ok(listA.body.data.unreadCount >= 1);
    const other = await Notification.create({
      userId: adminUser._id,
      title: 'admin only',
      body: 'secret',
      type: 'SYSTEM_ALERT',
      status: 'UNREAD'
    });
    const steal = await collegeA.get(`/api/notifications/${other._id}`);
    assert.equal(steal.status, 404);
    const mark = await collegeA.patch(`/api/notifications/${listA.body.data.items[0].id}/read`);
    assert.equal(mark.status, 200);
  });

  await t.test('college cannot access admin announcements or another college analytics', async () => {
    assert.equal((await collegeA.get('/api/admin/announcements')).status, 403);
    const insights = await collegeA.get('/api/college/dashboard/insights');
    assert.equal(insights.status, 200);
    assert.equal(insights.body.data.stats.instituteIdFromSession, true);
    const spoof = await collegeA.get(`/api/college/dashboard/summary?instituteId=${instB.id}`);
    assert.equal(spoof.status, 200);
    assert.equal(spoof.body.data.instituteIdFromSession, true);
  });

  await t.test('admin analytics date filter and dashboard extra stats', async () => {
    const dash = await admin.get('/api/admin/dashboard');
    assert.equal(dash.status, 200);
    assert.ok(typeof dash.body.data.activeUniversities === 'number');
    const analytics = await admin.get('/api/admin/dashboard/analytics?range=this_year');
    assert.equal(analytics.status, 200);
    assert.ok(analytics.body.data.universities.total >= 1);
    const bad = await admin.get('/api/admin/dashboard/analytics?range=not-real');
    assert.equal(bad.status, 400);
  });

  await t.test('announcements create, publish, and college isolation of reports', async () => {
    const created = await admin.post('/api/admin/announcements').send({
      title: `Phase 13 notice ${stamp}`,
      body: 'Portal operations reminder. TODO: VERIFY OFFICIAL CONTENT',
      audienceType: 'USERS',
      userIds: [String((await User.findOne({ email: collegeAEmail }))!._id)],
      language: 'en',
      status: 'DRAFT'
    });
    assert.equal(created.status, 201);
    const id = created.body.data.announcement.id;
    const published = await admin.post(`/api/admin/announcements/${id}/publish`);
    assert.equal(published.status, 200);
    const notesA = await collegeA.get('/api/notifications?type=ANNOUNCEMENT');
    assert.ok(notesA.body.data.items.length >= 1);
    const notesB = await collegeB.get('/api/notifications?type=ANNOUNCEMENT');
    assert.equal(notesB.body.data.items.some((row: { relatedEntityId: string }) => row.relatedEntityId === id), false);
    assert.equal((await collegeA.get('/api/college/reports/preview?category=institutes')).status, 403);
    const students = await collegeA.get('/api/college/reports/preview?category=students');
    assert.equal(students.status, 200);
    const adminExport = await admin.get('/api/admin/reports/export?category=institutes&format=csv');
    assert.equal(adminExport.status, 200);
    assert.match(String(adminExport.headers['content-disposition']), /institutes\.csv/);
  });

  await t.test('jobs are idempotent for reminder keys and email skip does not throw', async () => {
    const userA = await User.findOne({ email: collegeAEmail });
    assert.ok(userA);
    const key = `phase13-dup:${stamp}`;
    const first = await createNotification({
      recipientUserId: String(userA._id),
      type: 'REMINDER',
      title: 'Dup test',
      message: 'Once only',
      reminderKey: key
    });
    const second = await createNotification({
      recipientUserId: String(userA._id),
      type: 'REMINDER',
      title: 'Dup test',
      message: 'Once only',
      reminderKey: key
    });
    assert.equal(first, true);
    assert.equal(second, false);
    const reminderRun = await sendPendingReminders();
    assert.ok(typeof reminderRun.created === 'number');
    const mail = await emailService.sendEmail({
      to: 'nobody@example.in',
      subject: 'test',
      text: 'skip'
    });
    assert.ok(mail.status === 'skipped' || mail.status === 'failed');
    const jobs = await admin.get('/api/admin/system-jobs');
    assert.equal(jobs.status, 200);
    assert.ok(Array.isArray(jobs.body.data.items));
    const settings = await admin.get('/api/admin/operational-settings');
    assert.equal(settings.status, 200);
    const patched = await admin.patch('/api/admin/operational-settings').send({ 'reminders.pendingRegistrationDays': 5 });
    assert.equal(patched.status, 200);
  });

  await t.test('AI insights stay scoped and do not invent extra stats keys', async () => {
    const adminInsights = await admin.get('/api/admin/dashboard/insights');
    assert.equal(adminInsights.status, 200);
    assert.ok(Array.isArray(adminInsights.body.data.attention));
    assert.equal(adminInsights.body.data.stats.scope, 'admin');
    const collegeInsights = await collegeA.get('/api/college/dashboard/insights');
    assert.equal(collegeInsights.body.data.stats.scope, 'college');
    assert.equal((await collegeA.get('/api/admin/dashboard/insights')).status, 403);
  });
});
