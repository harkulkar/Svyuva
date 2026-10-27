import assert from 'node:assert/strict';
import test from 'node:test';

// env.ts is evaluated on first import, so configure the encryption key before loading anything that reads it.
process.env.PAYMENT_ENCRYPTION_KEY = 'payment-api-test-encryption-key-0123456789';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';

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
const { Payment } = await import('./models/Payment.js');
const { SystemSetting } = await import('./models/SystemSetting.js');
const { hashPassword } = await import('./utils/password.js');
const { setRazorpayFetch } = await import('./payments/razorpayClient.js');
const { signCheckout, signWebhook } = await import('./payments/signatures.js');

const app = createApp();
const stamp = Date.now();
const password = 'ValidPass1';
const adminEmail = `pay.admin.${stamp}@example.in`;
const collegeAEmail = `pay.college.a.${stamp}@example.in`;
const collegeBEmail = `pay.college.b.${stamp}@example.in`;
const universityName = `Payment University ${stamp}`;
const keyId = 'rzp_test_AbCdEf123456';
const keySecret = `secret-${stamp}-abcdefghijklmnop`;
const webhookSecret = `whsec-${stamp}-abcdefghijklmnop`;
const orderId = `order_T${stamp}`;
const paymentId = `pay_T${stamp}`;

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
    principalName: 'Principal Payment',
    collegeType: 'Aided',
    password,
    confirmPassword: password
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

test('payment gateway settings, order, verification, webhook and import gate', async (t) => {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'SVYSY_TEST', serverSelectionTimeoutMS: 20000 });
  await repairLegacyIndexes();
  await SystemSetting.deleteOne({ key: 'payment.razorpay' });

  setRazorpayFetch(async (url, init) => {
    const method = init?.method ?? 'GET';
    if (method === 'POST' && url.endsWith('/orders')) {
      const body = JSON.parse(String(init?.body));
      return json({ id: orderId, amount: body.amount, currency: body.currency, receipt: body.receipt, status: 'created' });
    }
    if (method === 'GET' && url.includes('/orders?count=1')) return json({ items: [] });
    if (method === 'GET' && url.endsWith(`/payments/${paymentId}`)) {
      return json({ id: paymentId, order_id: orderId, status: 'captured', amount: 23600, currency: 'INR', method: 'upi' });
    }
    return json({ error: { description: 'unexpected call' } }, 500);
  });

  t.after(async () => {
    setRazorpayFetch();
    const users = await User.find({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    const institutes = await Institute.find({ email: { $in: [collegeAEmail, collegeBEmail] } });
    const instituteIds = institutes.map((row) => row._id);
    await RefreshToken.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await Payment.deleteMany({ instituteId: { $in: instituteIds } });
    await UploadJob.deleteMany({ instituteId: { $in: instituteIds } });
    await SystemSetting.deleteOne({ key: 'payment.razorpay' });
    await User.deleteMany({ email: { $in: [adminEmail, collegeAEmail, collegeBEmail] } });
    await Institute.deleteMany({ email: { $in: [collegeAEmail, collegeBEmail] } });
    await University.deleteMany({ nameNormalized: universityName.toLowerCase() });
    await mongoose.disconnect();
  });

  await User.create({
    name: 'Payment Admin',
    email: adminEmail,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  const university = await University.create({
    name: universityName,
    nameNormalized: universityName.toLowerCase(),
    code: `PAY-${stamp}`,
    shortName: 'PAYU',
    status: 'ACTIVE'
  });
  const universityId = String(university._id);

  const admin = request.agent(app);
  assert.equal((await admin.post('/api/auth/login').send({ email: adminEmail, password })).status, 200);
  await request(app).post('/api/auth/signup').send(signupPayload(collegeAEmail, `Payment Institute A ${stamp}`, universityId));
  await request(app).post('/api/auth/signup').send(signupPayload(collegeBEmail, `Payment Institute B ${stamp}`, universityId));
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

  const job = await UploadJob.create({
    instituteId: instituteAId,
    universityId,
    uploadedBy: collegeAUser!._id,
    filename: 'students.xlsx',
    totalRows: 10,
    validCount: 10,
    invalidCount: 0,
    duplicateCount: 0,
    insurer: 'ICICI',
    policyType: 'GPA',
    paymentStatus: 'QUOTED',
    expiresAt: new Date(Date.now() + 3600_000)
  });
  const jobId = String(job._id);
  let dbPaymentId = '';

  await t.test('gateway settings are admin-only and start unconfigured', async () => {
    assert.equal((await request(app).get('/api/admin/payment-gateway')).status, 401);
    assert.equal((await collegeA.get('/api/admin/payment-gateway')).status, 403);
    assert.equal((await collegeA.put('/api/admin/payment-gateway').send({})).status, 403);
    const res = await admin.get('/api/admin/payment-gateway');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.configured, false);
    assert.equal(res.body.data.encryptionKeyConfigured, true);
    assert.equal((await collegeA.get('/api/college/payments/availability')).body.data.enabled, false);
  });

  await t.test('saving requires a valid key id and the admin password', async () => {
    const base = { keyId, keySecret, webhookSecret, mid: 'MID_1', pfMid: 'PF_MID_1', enabled: true };
    assert.equal((await admin.put('/api/admin/payment-gateway').send(base)).status, 400);
    assert.equal((await admin.put('/api/admin/payment-gateway').send({ ...base, currentPassword: 'WrongPass1' })).status, 400);
    assert.equal((await admin.put('/api/admin/payment-gateway').send({ ...base, keyId: 'nope', currentPassword: password })).status, 400);
    assert.equal((await admin.put('/api/admin/payment-gateway').send({ ...base, keySecret: '', currentPassword: password })).status, 400);
  });

  await t.test('credentials are saved encrypted and never returned', async () => {
    const res = await admin
      .put('/api/admin/payment-gateway')
      .send({ keyId, keySecret, webhookSecret, mid: 'MID_1', pfMid: 'PF_MID_1', enabled: true, currentPassword: password });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.keyId, keyId);
    assert.equal(res.body.data.keySecretSet, true);
    assert.equal(res.body.data.mode, 'test');
    assert.equal(res.body.data.mid, 'MID_1');
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes(keySecret) && !text.includes(webhookSecret));
    const row = await SystemSetting.findOne({ key: 'payment.razorpay' }).lean();
    const stored = JSON.stringify(row);
    assert.ok(!stored.includes(keySecret) && !stored.includes(webhookSecret), 'secrets must be encrypted at rest');
    const again = await admin.get('/api/admin/payment-gateway');
    assert.ok(!JSON.stringify(again.body).includes(keySecret));
    assert.equal((await admin.post('/api/admin/payment-gateway/test')).status, 200);
    assert.equal((await collegeA.get('/api/college/payments/availability')).body.data.enabled, true);
  });

  await t.test('import is blocked until the premium is paid', async () => {
    const res = await collegeA.post('/api/college/students/import').send({ jobId });
    assert.equal(res.status, 402);
    assert.equal(res.body.code, 'PAYMENT_REQUIRED');
  });

  await t.test('order amount is computed server-side and the order is reused', async () => {
    const res = await collegeA.post('/api/college/payments/create-order').send({ jobId });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.checkout.amountPaise, 23600);
    assert.equal(res.body.data.checkout.orderId, orderId);
    assert.equal(res.body.data.checkout.keyId, keyId);
    assert.ok(!JSON.stringify(res.body).includes(keySecret));
    dbPaymentId = res.body.data.payment.id;
    const again = await collegeA.post('/api/college/payments/create-order').send({ jobId });
    assert.equal(again.status, 200);
    assert.equal(again.body.data.payment.id, dbPaymentId);
    assert.equal(await Payment.countDocuments({ uploadJobId: jobId }), 1);
    const extra = await collegeA.post('/api/college/payments/create-order').send({ jobId, amount: 1 });
    assert.equal(extra.status, 400, 'a client-supplied amount is rejected');
  });

  await t.test('another college cannot pay for or read this payment', async () => {
    assert.equal((await collegeB.post('/api/college/payments/create-order').send({ jobId })).status, 404);
    assert.equal((await collegeB.get(`/api/college/payments/${dbPaymentId}`)).status, 404);
    const sig = signCheckout(orderId, paymentId, keySecret);
    assert.equal(
      (await collegeB.post('/api/college/payments/verify').send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig })).status,
      404
    );
  });

  await t.test('a forged signature does not mark the payment paid', async () => {
    const res = await collegeA
      .post('/api/college/payments/verify')
      .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: 'a'.repeat(64) });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_SIGNATURE');
    assert.equal((await UploadJob.findById(jobId))?.paymentStatus, 'PAYMENT_PENDING');
    assert.equal((await Payment.findById(dbPaymentId))?.status, 'PENDING');
  });

  await t.test('a valid signature verifies the payment with the gateway and unlocks the job', async () => {
    const sig = signCheckout(orderId, paymentId, keySecret);
    const input = { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig };
    const res = await collegeA.post('/api/college/payments/verify').send(input);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.payment.status, 'VERIFIED');
    assert.equal(res.body.data.payment.paymentId, paymentId);
    assert.equal((await UploadJob.findById(jobId))?.paymentStatus, 'PAID');
    assert.equal((await collegeA.post('/api/college/payments/verify').send(input)).status, 200, 'verify is idempotent');
    assert.equal((await collegeA.post('/api/college/payments/create-order').send({ jobId })).status, 409);
    const detail = await collegeA.get(`/api/college/payments/${dbPaymentId}`);
    assert.equal(detail.body.data.payment.status, 'VERIFIED');
    const gate = await collegeA.post('/api/college/students/import').send({ jobId });
    assert.notEqual(gate.status, 402, 'the payment gate no longer blocks import');
    assert.equal((await collegeA.post('/api/college/students/premium-quote').send({ jobId, insurer: 'NATIONAL', policyType: 'GPA' })).status, 409);
  });

  await t.test('webhooks require a valid signature and are idempotent', async () => {
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: paymentId, order_id: orderId, status: 'captured', amount: 23600, currency: 'INR' } } }
    });
    const bad = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'b'.repeat(64))
      .send(body);
    assert.equal(bad.status, 400);

    const sig = signWebhook(body, webhookSecret);
    const first = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .set('x-razorpay-event-id', `evt_${stamp}`)
      .send(body);
    assert.equal(first.status, 200);
    assert.equal(first.body.data.handled, true);
    const second = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .set('x-razorpay-event-id', `evt_${stamp}`)
      .send(body);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.reason, 'duplicate');

    const refund = JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { amount: 23600, payment_id: paymentId } } } });
    const refunded = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signWebhook(refund, webhookSecret))
      .set('x-razorpay-event-id', `evt_refund_${stamp}`)
      .send(refund);
    assert.equal(refunded.status, 200);
    assert.equal((await Payment.findById(dbPaymentId))?.status, 'REFUNDED');
    assert.equal((await UploadJob.findById(jobId))?.paymentStatus, 'REFUNDED');
  });

  await t.test('removing credentials switches online payment off', async () => {
    assert.equal((await admin.post('/api/admin/payment-gateway/clear').send({ currentPassword: 'WrongPass1' })).status, 400);
    const res = await admin.post('/api/admin/payment-gateway/clear').send({ currentPassword: password });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.configured, false);
    assert.equal((await collegeA.post('/api/college/payments/create-order').send({ jobId })).status, 503);
  });
});
