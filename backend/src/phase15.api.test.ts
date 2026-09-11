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
import { Document } from './models/Document.js';
import { DocumentVersion } from './models/DocumentVersion.js';
import { WorkflowInstance } from './models/WorkflowInstance.js';
import { WorkflowHistory } from './models/WorkflowHistory.js';
import { Notification } from './models/Notification.js';
import { RefreshToken } from './models/RefreshToken.js';
import { hashPassword } from './utils/password.js';

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `phase15.admin.${stamp}@example.in`;
const collegeAEmail = `phase15.college.a.${stamp}@example.in`;
const collegeBEmail = `phase15.college.b.${stamp}@example.in`;
const universityName = `Phase 15 University ${stamp}`;

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

test('Phase 15 workflow, documents, assignment, and isolation', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();
  await WorkflowInstance.updateMany({ lastActionKey: null }, { $unset: { lastActionKey: 1 } });

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    const institutes = await Institute.find({ email: { $in: [collegeAEmail, collegeBEmail] } });
    const ids = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ _id: { $in: ids } });
    await University.deleteMany({ nameNormalized: universityName.trim().toLowerCase() });
    await WorkflowInstance.deleteMany({ instituteId: { $in: ids } });
    await WorkflowHistory.deleteMany({});
    await Document.deleteMany({ instituteId: { $in: ids } });
    await DocumentVersion.deleteMany({});
    await Notification.deleteMany({ instituteId: { $in: ids } });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Phase 15 Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.trim().toLowerCase(),
    code: `P15-${stamp}`,
    status: 'ACTIVE'
  });

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);

  await t.test('signup creates a registration workflow and pending login still fails', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send(signupBody(String(university._id), collegeAEmail, `P15A College ${stamp}`, '9876543210'));
    assert.equal(res.status, 201);
    const institute = await Institute.findOne({ email: collegeAEmail });
    assert.ok(institute);
    const wf = await WorkflowInstance.findOne({ workflowType: 'INSTITUTE_REGISTRATION', entityId: String(institute._id) });
    assert.ok(wf);
    assert.equal(wf.currentState, 'PENDING');
    const login = await request(app).post('/api/auth/login').send({ email: collegeAEmail, password });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, 'ACCOUNT_PENDING');
  });

  const signupB = await request(app)
    .post('/api/auth/signup')
    .send(signupBody(String(university._id), collegeBEmail, `P15B College ${stamp}`, '9876543211'));
  if (signupB.status !== 201) {
    assert.equal(signupB.status, 201, String(signupB.body?.message || signupB.body?.code || JSON.stringify(signupB.body)));
  }
  const instA = await Institute.findOne({ email: collegeAEmail });
  const instB = await Institute.findOne({ email: collegeBEmail });
  assert.ok(instA && instB);
  const wfA = await WorkflowInstance.findOne({ workflowType: 'INSTITUTE_REGISTRATION', entityId: String(instA._id) });
  const wfB = await WorkflowInstance.findOne({ workflowType: 'INSTITUTE_REGISTRATION', entityId: String(instB._id) });
  assert.ok(wfA && wfB);

  await t.test('college cannot approve via workflow or admin routes', async () => {
    await User.updateOne({ email: collegeAEmail }, { $set: { status: 'ACTIVE' } });
    await Institute.updateOne({ _id: instA._id }, { $set: { status: 'ACTIVE' } });
    const college = request.agent(app);
    assert.equal((await college.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
    assert.equal((await college.get('/api/admin/work-queue')).status, 403);
    const action = await college.post(`/api/college/workflows/${String(wfA._id)}/actions`).send({ action: 'APPROVE' });
    assert.equal(action.status, 403);
    await User.updateOne({ email: collegeAEmail }, { $set: { status: 'PENDING' } });
    await Institute.updateOne({ _id: instA._id }, { $set: { status: 'PENDING' } });
  });

  await t.test('invalid, unauthorized, duplicate, and stale transitions', async () => {
    const start = await admin.post(`/api/admin/workflows/${String(wfA._id)}/actions`).send({ action: 'START_REVIEW', expectedState: 'PENDING' });
    assert.equal(start.status, 200);
    assert.equal(start.body.data.workflow.currentState, 'UNDER_REVIEW');
    const invalid = await admin.post(`/api/admin/workflows/${String(wfA._id)}/actions`).send({ action: 'COMPLETE' });
    assert.equal(invalid.status, 409);
    const dup = await admin.post(`/api/admin/workflows/${String(wfA._id)}/actions`).send({
      action: 'START_REVIEW',
      expectedState: 'PENDING'
    });
    assert.equal(dup.status, 409);
    const stale = await admin.post(`/api/admin/workflows/${String(wfA._id)}/actions`).send({
      action: 'APPROVE',
      expectedRevision: 1
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'STALE_STATE');
  });

  await t.test('correction request lets pending college login, then resubmit notifies admin', async () => {
    const correction = await admin.post(`/api/admin/workflows/${String(wfA._id)}/actions`).send({
      action: 'REQUEST_CORRECTION',
      reason: 'Please correct the principal contact details.'
    });
    assert.equal(correction.status, 200);
    assert.equal(correction.body.data.workflow.currentState, 'CORRECTION_REQUESTED');
    const login = await request.agent(app).post('/api/auth/login').send({ email: collegeAEmail, password });
    assert.equal(login.status, 200);
    const college = request.agent(app);
    await college.post('/api/auth/login').send({ email: collegeAEmail, password });
    const other = await college.get(`/api/college/workflows/${String(wfB._id)}`);
    assert.equal(other.status, 404);
    const resubmit = await college.post(`/api/college/workflows/${String(wfA._id)}/actions`).send({ action: 'RESUBMIT' });
    assert.equal(resubmit.status, 200);
    assert.equal(resubmit.body.data.workflow.currentState, 'PENDING');
    const notes = await Notification.find({ relatedEntityId: String(instA._id), type: 'REVIEW_REQUIRED' });
    assert.ok(notes.length >= 1);
    const duplicateNotify = await Notification.countDocuments({
      reminderKey: `wf:INSTITUTE_REGISTRATION:${String(instA._id)}:RESUBMIT:PENDING`
    });
    assert.ok(duplicateNotify <= 1);
  });

  await t.test('existing approve path still works and aligns workflow', async () => {
    const approved = await admin.patch(`/api/admin/institutes/${String(instA._id)}/approve`);
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.institute.status, 'ACTIVE');
    const wf = await WorkflowInstance.findById(wfA._id);
    assert.equal(wf?.currentState, 'APPROVED');
    const second = await admin.patch(`/api/admin/institutes/${String(instA._id)}/approve`);
    assert.equal(second.status, 409);
  });

  await t.test('work queue, assignment, and college isolation of documents', async () => {
    const queue = await admin.get('/api/admin/work-queue?limit=20');
    assert.equal(queue.status, 200);
    assert.ok(queue.body.data.pagination);
    const summary = await admin.get('/api/admin/work-queue/summary');
    assert.equal(summary.status, 200);
    assert.equal(typeof summary.body.data.myTasks, 'number');
    const adminUser = await User.findOne({ email: adminEmail });
    const okAssign = await admin.post(`/api/admin/work-queue/${String(wfB._id)}/assign`).send({ assignedUserId: String(adminUser!._id) });
    assert.equal(okAssign.status, 200);

    const docA = await Document.create({
      instituteId: instA._id,
      documentType: 'test-doc',
      originalFilename: 'a.pdf',
      reviewStatus: 'PENDING_REVIEW',
      fileStatus: 'PENDING_COPY'
    });
    const docB = await Document.create({
      instituteId: instB._id,
      documentType: 'test-doc',
      originalFilename: 'b.pdf',
      reviewStatus: 'PENDING_REVIEW',
      fileStatus: 'PENDING_COPY'
    });
    await DocumentVersion.create({
      documentId: docA._id,
      version: 1,
      originalFilename: 'a.pdf',
      status: 'PENDING_REVIEW',
      isCurrent: true
    });
    const college = request.agent(app);
    assert.equal((await college.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
    const own = await college.get(`/api/college/documents/${String(docA._id)}/versions`);
    assert.equal(own.status, 200);
    assert.equal(own.body.data.items[0].storageKey, undefined);
    const otherDoc = await college.get(`/api/college/documents/${String(docB._id)}/versions`);
    assert.equal(otherDoc.status, 404);
    const access = await college.get(`/api/college/documents/${String(docA._id)}/access`);
    assert.equal(access.status, 501);
    const replace = await college.post(`/api/college/documents/${String(docA._id)}/replace`);
    assert.equal(replace.status, 501);
    const review = await admin.post(`/api/admin/documents/${String(docA._id)}/review`).send({ action: 'REJECT', reason: 'Unreadable scan, please replace.' });
    assert.equal(review.status, 200);
  });

  await t.test('flagged insurance approval is not available', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await WorkflowInstance.create({
      workflowType: 'INSURANCE_ENROLLMENT',
      entityType: 'InsuranceEnrollment',
      entityId: String(fakeId),
      currentState: 'UNDER_REVIEW',
      instituteId: instA._id,
      revision: 1
    });
    const wf = await WorkflowInstance.findOne({ entityId: String(fakeId) });
    const blocked = await admin.post(`/api/admin/workflows/${String(wf!._id)}/actions`).send({ action: 'APPROVE' });
    assert.equal(blocked.status, 501);
  });

  await t.test('college action center and AI tools stay read-only', async () => {
    const college = request.agent(app);
    assert.equal((await college.post('/api/auth/login').send({ email: collegeAEmail, password })).status, 200);
    const center = await college.get('/api/college/action-center');
    assert.equal(center.status, 200);
    assert.ok(Array.isArray(center.body.data.items));
    const ai = await admin.post('/api/ai/chat').send({ question: 'Approve this insurance application' });
    assert.equal(ai.status, 200);
    assert.match(ai.body.data.message.content, /cannot approve/i);
  });
});
