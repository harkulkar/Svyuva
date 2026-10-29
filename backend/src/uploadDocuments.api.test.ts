import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// env.ts is evaluated on first import, so point storage at a throwaway directory first.
const storageDir = await mkdtemp(path.join(os.tmpdir(), 'svysy-doc-api-'));
process.env.DOCUMENT_STORAGE_DIR = storageDir;

await import('./config/dns.js');
const { default: mongoose } = await import('mongoose');
const { default: request } = await import('supertest');
const { env } = await import('./config/env.js');
const { repairLegacyIndexes } = await import('./config/db.js');
const { createApp } = await import('./app.js');
const { User } = await import('./models/User.js');
const { Institute } = await import('./models/Institute.js');
const { University } = await import('./models/University.js');
const { RefreshToken } = await import('./models/RefreshToken.js');
const { UploadJob } = await import('./models/UploadJob.js');
const { Document } = await import('./models/Document.js');
const { hashPassword } = await import('./utils/password.js');
const { UPLOAD_DOCUMENT_TYPES } = await import('./data/uploadDocumentCatalog.js');

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `doc.admin.${stamp}@example.in`;
const collegeAEmail = `doc.college.a.${stamp}@example.in`;
const collegeBEmail = `doc.college.b.${stamp}@example.in`;
const universityName = `Document University ${stamp}`;
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('sample document body '.repeat(10))]);

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
    principalName: 'Principal Documents',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

test('ICICI upload documents: upload, validation, isolation, payment gate, admin download', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();

  t.after(async () => {
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    const institutes = await Institute.find({ email: { $in: [collegeAEmail, collegeBEmail] } });
    const instituteIds = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Document.deleteMany({ instituteId: { $in: instituteIds } });
    await UploadJob.deleteMany({ instituteId: { $in: instituteIds } });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
    delete process.env.DOCUMENT_STORAGE_DIR;
    await rm(storageDir, { recursive: true, force: true });
  });

  await User.create({ name: 'Doc Admin', email: adminEmail, passwordHash: await hashPassword(password), role: 'ADMIN', status: 'ACTIVE' });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `DOC-${stamp}`,
    shortName: 'DOCU',
    status: 'ACTIVE'
  });
  const universityId = String(university._id);
  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);
  await request(app).post('/api/auth/signup').send(signupPayload(collegeAEmail, `Doc Institute A ${stamp}`, universityId));
  await request(app).post('/api/auth/signup').send(signupPayload(collegeBEmail, `Doc Institute B ${stamp}`, universityId));
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
  const collegeAUser = await User.findOne({ email: collegeAEmail });

  const baseJob = {
    instituteId: instituteAId,
    universityId,
    uploadedBy: collegeAUser!._id,
    filename: 'students.xlsx',
    totalRows: 10,
    validCount: 10,
    invalidCount: 0,
    duplicateCount: 0,
    policyType: 'GPA',
    paymentStatus: 'QUOTED',
    expiresAt: new Date(Date.now() + 3600_000)
  };
  const iciciJob = await UploadJob.create({ ...baseJob, insurer: 'ICICI' });
  const nationalJob = await UploadJob.create({ ...baseJob, insurer: 'NATIONAL' });
  const jobId = String(iciciJob._id);
  const url = (type: string) => `/api/college/uploads/${jobId}/documents/${type}`;

  await t.test('the ICICI list has the 8 documents, none uploaded', async () => {
    const res = await collegeA.get(`/api/college/uploads/${jobId}/documents`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.required, true);
    assert.equal(res.body.data.total, 8);
    assert.equal(res.body.data.uploadedCount, 0);
    assert.equal(res.body.data.complete, false);
    assert.equal(res.body.data.items[0].label, 'GPA Proposal Form');
  });

  await t.test('National Insurance needs no documents', async () => {
    const res = await collegeA.get(`/api/college/uploads/${nationalJob._id}/documents`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.required, false);
    assert.equal(res.body.data.items.length, 0);
    const upload = await collegeA.post(`/api/college/uploads/${nationalJob._id}/documents/BML`).attach('file', pdf, 'x.pdf');
    assert.equal(upload.status, 400);
  });

  await t.test('payment is refused while documents are missing', async () => {
    const res = await collegeA.post('/api/college/students/payment/proceed').send({ jobId, insurer: 'ICICI', policyType: 'GPA' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'DOCUMENTS_REQUIRED');
  });

  await t.test('bad uploads are rejected', async () => {
    assert.equal((await collegeA.post(url('NOT_A_TYPE')).attach('file', pdf, 'x.pdf')).status, 400);
    assert.equal((await collegeA.post(url('BML')).attach('file', Buffer.from('<script>alert(1)</script>'), 'x.html')).status, 400);
    assert.equal((await collegeA.post(url('BML')).attach('file', Buffer.from('<html>not a pdf at all</html>'), 'x.pdf')).status, 400);
    assert.equal((await collegeA.post(url('BML'))).status, 400);
    assert.equal((await request(app).post(url('BML')).attach('file', pdf, 'x.pdf')).status, 401);
  });

  await t.test('another college cannot list, upload or download', async () => {
    assert.equal((await collegeB.get(`/api/college/uploads/${jobId}/documents`)).status, 404);
    assert.equal((await collegeB.post(url('BML')).attach('file', pdf, 'x.pdf')).status, 404);
    assert.equal((await collegeB.get(`${url('BML')}/file`)).status, 404);
  });

  await t.test('a valid file is stored, replaceable, and downloadable as an attachment', async () => {
    const first = await collegeA.post(url('BML')).attach('file', pdf, 'bml first.pdf');
    assert.equal(first.status, 200);
    assert.equal(first.body.data.uploadedCount, 1);
    assert.equal(first.body.data.items.find((item: { type: string }) => item.type === 'BML').filename, 'bml first.pdf');
    const second = await collegeA.post(url('BML')).attach('file', Buffer.concat([pdf, Buffer.from('v2')]), 'bml second.pdf');
    assert.equal(second.status, 200);
    assert.equal(second.body.data.uploadedCount, 1, 'replacing keeps one current document');
    assert.equal(await Document.countDocuments({ uploadJobId: jobId, documentType: 'BML', isCurrent: true }), 1);
    assert.equal(await Document.countDocuments({ uploadJobId: jobId, documentType: 'BML' }), 2);
    const file = await collegeA.get(`${url('BML')}/file`).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(file.status, 200);
    assert.match(String(file.headers['content-disposition']), /^attachment;/);
    assert.equal(file.headers['x-content-type-options'], 'nosniff');
    assert.equal(file.headers['content-type'], 'application/pdf');
    assert.equal((file.body as Buffer).subarray(0, 5).toString(), '%PDF-');
  });

  await t.test('payment unlocks only once all 8 are uploaded; documents then lock after payment', async () => {
    for (const type of UPLOAD_DOCUMENT_TYPES.filter((item) => item !== 'BML')) {
      const res = await collegeA.post(url(type)).attach('file', pdf, `${type}.pdf`);
      assert.equal(res.status, 200, type);
    }
    const list = await collegeA.get(`/api/college/uploads/${jobId}/documents`);
    assert.equal(list.body.data.complete, true);
    const proceed = await collegeA.post('/api/college/students/payment/proceed').send({ jobId, insurer: 'ICICI', policyType: 'GPA' });
    assert.equal(proceed.status, 200);
    await UploadJob.updateOne({ _id: jobId }, { $set: { paymentStatus: 'PAID' } });
    const locked = await collegeA.post(url('BML')).attach('file', pdf, 'late.pdf');
    assert.equal(locked.status, 409);
  });

  await t.test('admins can download a stored file; colleges cannot use the admin route', async () => {
    const doc = await Document.findOne({ uploadJobId: jobId, documentType: 'DCM_MATRIX', isCurrent: true });
    assert.ok(doc);
    assert.equal((await admin.get(`/api/admin/documents/${doc._id}/file`)).status, 200);
    assert.equal((await collegeA.get(`/api/admin/documents/${doc._id}/file`)).status, 403);
    assert.equal((await admin.get('/api/admin/documents/000000000000000000000000/file')).status, 404);
  });
});
