import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptSecret, encryptSecret, isEncryptionKeyUsable } from './payments/secretBox.js';
import { signCheckout, signWebhook, verifyCheckoutSignature, verifyWebhookSignature } from './payments/signatures.js';
import { expectedJobAmountPaise, rupeesToPaise } from './payments/amounts.js';
import { gatewayClearSchema, gatewayConfigSchema, razorpayKeyIdSchema, verifyPaymentSchema } from './payments/payment.validators.js';
import { createRazorpayOrder, pingRazorpay, setRazorpayFetch } from './payments/razorpayClient.js';

const KEY = 'unit-test-encryption-key-that-is-long-enough';

test('secrets round-trip through AES-GCM and reject tampering or the wrong key', () => {
  const sealed = encryptSecret('rzp-secret-value', KEY);
  assert.ok(sealed.startsWith('v1:'));
  assert.ok(!sealed.includes('rzp-secret-value'));
  assert.equal(decryptSecret(sealed, KEY), 'rzp-secret-value');
  assert.notEqual(encryptSecret('rzp-secret-value', KEY), sealed, 'IV must be random');
  assert.throws(() => decryptSecret(sealed, `${KEY}-other`));
  const parts = sealed.split(':');
  parts[3] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decryptSecret(parts.join(':'), KEY));
  assert.throws(() => encryptSecret('x', 'short'));
  assert.equal(isEncryptionKeyUsable('short'), false);
  assert.equal(isEncryptionKeyUsable(KEY), true);
});

test('checkout and webhook signatures verify only with the right secret and payload', () => {
  const sig = signCheckout('order_ABC', 'pay_XYZ', 'secret');
  assert.equal(verifyCheckoutSignature('order_ABC', 'pay_XYZ', sig, 'secret'), true);
  assert.equal(verifyCheckoutSignature('order_ABC', 'pay_OTHER', sig, 'secret'), false);
  assert.equal(verifyCheckoutSignature('order_ABC', 'pay_XYZ', sig, 'wrong'), false);
  assert.equal(verifyCheckoutSignature('order_ABC', 'pay_XYZ', 'short', 'secret'), false);
  assert.equal(verifyCheckoutSignature('', 'pay_XYZ', sig, 'secret'), false);

  const body = Buffer.from('{"event":"payment.captured"}');
  const hook = signWebhook(body, 'whsec');
  assert.equal(verifyWebhookSignature(body, hook, 'whsec'), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), hook, 'whsec'), false);
  assert.equal(verifyWebhookSignature(body, hook, 'other'), false);
  assert.equal(verifyWebhookSignature(body, '', 'whsec'), false);
});

test('the payable amount is derived server-side in paise with GST', () => {
  assert.equal(rupeesToPaise(236), 23600);
  assert.equal(rupeesToPaise(0.1 + 0.2), 30);
  const icici = expectedJobAmountPaise({ insurer: 'ICICI', policyType: 'GPA', validCount: 10 });
  assert.equal(icici?.amountPaise, 23600);
  assert.equal(expectedJobAmountPaise({ insurer: 'ICICI', policyType: 'XXX', validCount: 10 }), null);
  assert.equal(expectedJobAmountPaise({ insurer: null, policyType: null, validCount: 10 }), null);
});

test('gateway validators accept real-looking input and reject bad input', () => {
  assert.equal(razorpayKeyIdSchema.safeParse('rzp_test_AbCdEf12345').success, true);
  assert.equal(razorpayKeyIdSchema.safeParse('rzp_live_AbCdEf12345').success, true);
  assert.equal(razorpayKeyIdSchema.safeParse('key_AbCdEf12345').success, false);
  assert.equal(razorpayKeyIdSchema.safeParse('rzp_test_').success, false);
  const ok = gatewayConfigSchema.safeParse({ keyId: 'rzp_test_AbCdEf12345', enabled: true, currentPassword: 'x', mid: 'MID_1' });
  assert.equal(ok.success, true);
  assert.equal(gatewayConfigSchema.safeParse({ keyId: 'rzp_test_AbCdEf12345', enabled: true }).success, false, 'password required');
  assert.equal(gatewayConfigSchema.safeParse({ keyId: 'rzp_test_AbCdEf12345', enabled: true, currentPassword: 'x', extra: 1 }).success, false);
  assert.equal(gatewayConfigSchema.safeParse({ keyId: 'rzp_test_AbCdEf12345', enabled: true, currentPassword: 'x', mid: 'bad mid!' }).success, false);
  assert.equal(gatewayClearSchema.safeParse({}).success, false);
  assert.equal(
    verifyPaymentSchema.safeParse({ razorpay_order_id: 'order_Abc1', razorpay_payment_id: 'pay_Abc1', razorpay_signature: 'a'.repeat(64) }).success,
    true
  );
  const extra = verifyPaymentSchema.safeParse({
    razorpay_order_id: 'order_Abc1',
    razorpay_payment_id: 'pay_Abc1',
    razorpay_signature: 'a'.repeat(64),
    something_new: 'x'
  });
  assert.equal(extra.success, true, 'extra checkout keys are ignored');
  assert.deepEqual(Object.keys(extra.success ? extra.data : {}).sort(), ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']);
  assert.equal(
    verifyPaymentSchema.safeParse({ razorpay_order_id: 'x', razorpay_payment_id: 'pay_Abc1', razorpay_signature: 'a'.repeat(64) }).success,
    false
  );
});

test('razorpay client sends basic auth and maps gateway errors', async (t) => {
  t.after(() => setRazorpayFetch());
  const calls: Array<{ url: string; auth: string | null; body: unknown }> = [];
  setRazorpayFetch(async (url, init) => {
    calls.push({
      url,
      auth: new Headers(init?.headers).get('authorization'),
      body: init?.body ? JSON.parse(String(init.body)) : null
    });
    return new Response(JSON.stringify({ id: 'order_1', amount: 23600, currency: 'INR', status: 'created' }), { status: 200 });
  });
  const order = await createRazorpayOrder(
    { keyId: 'rzp_test_AbCdEf12345', keySecret: 's3cret' },
    { amountPaise: 23600, currency: 'INR', receipt: 'r1', notes: { a: 'b' } }
  );
  assert.equal(order.id, 'order_1');
  assert.equal(calls[0]?.url, 'https://api.razorpay.com/v1/orders');
  assert.equal(calls[0]?.auth, `Basic ${Buffer.from('rzp_test_AbCdEf12345:s3cret').toString('base64')}`);
  assert.deepEqual(calls[0]?.body, { amount: 23600, currency: 'INR', receipt: 'r1', notes: { a: 'b' } });

  setRazorpayFetch(async () => new Response(JSON.stringify({ error: { description: 'Authentication failed' } }), { status: 401 }));
  await assert.rejects(pingRazorpay({ keyId: 'k', keySecret: 's' }), (error: { code?: string }) => error.code === 'GATEWAY_AUTH_FAILED');

  setRazorpayFetch(async () => new Response(JSON.stringify({ error: { description: 'Bad amount' } }), { status: 400 }));
  await assert.rejects(pingRazorpay({ keyId: 'k', keySecret: 's' }), (error: { code?: string }) => error.code === 'GATEWAY_ERROR');

  setRazorpayFetch(async () => {
    throw new Error('network down');
  });
  await assert.rejects(pingRazorpay({ keyId: 'k', keySecret: 's' }), (error: { code?: string }) => error.code === 'GATEWAY_UNREACHABLE');
});
