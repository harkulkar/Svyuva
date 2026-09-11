import assert from 'node:assert/strict';
import test from 'node:test';
import { redact } from './logger.js';

test('logger redacts secrets and credential-like keys', () => {
  const out = redact({
    password: 'secret',
    token: 'abc',
    nested: { jwt: 'nope', route: '/api/health' },
    message: 'ok'
  }) as Record<string, unknown>;
  assert.equal(out.password, '[redacted]');
  assert.equal(out.token, '[redacted]');
  assert.equal((out.nested as Record<string, unknown>).jwt, '[redacted]');
  assert.equal((out.nested as Record<string, unknown>).route, '/api/health');
  assert.equal(out.message, 'ok');
  const httpish = redact({ route: '/api/auth/change-password', password: 'secret' }) as Record<string, unknown>;
  assert.equal(httpish.route, '/api/auth/change-password');
  assert.equal(httpish.password, '[redacted]');
});
