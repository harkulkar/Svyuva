import assert from 'node:assert/strict';
import test from 'node:test';
import { fail, ok } from './utils/apiResponse.js';
import { REQUIRED_COLLECTIONS } from './config/collections.js';

test('ok() returns a success envelope', () => {
  const result = ok({ ping: true }, 'Service healthy');
  assert.equal(result.success, true);
  assert.equal(result.message, 'Service healthy');
  assert.deepEqual(result.data, { ping: true });
});

test('fail() returns a standard error envelope', () => {
  const result = fail('Readable message', 'ERROR_CODE');
  assert.equal(result.success, false);
  assert.equal(result.message, 'Readable message');
  assert.equal(result.code, 'ERROR_CODE');
});

test('required collections include SVYSY domain sets', () => {
  assert.ok(REQUIRED_COLLECTIONS.includes('users'));
  assert.ok(REQUIRED_COLLECTIONS.includes('institutes'));
  assert.ok(REQUIRED_COLLECTIONS.includes('students'));
  assert.ok(REQUIRED_COLLECTIONS.includes('settings'));
  assert.ok(REQUIRED_COLLECTIONS.includes('refreshTokens'));
  assert.ok(REQUIRED_COLLECTIONS.includes('migrationIdMaps'));
  assert.ok(REQUIRED_COLLECTIONS.includes('reviews'));
  assert.ok(REQUIRED_COLLECTIONS.includes('ecards'));
  assert.ok(REQUIRED_COLLECTIONS.includes('knowledgeDocuments'));
  assert.ok(REQUIRED_COLLECTIONS.includes('aiConversations'));
  assert.ok(REQUIRED_COLLECTIONS.includes('announcements'));
  assert.ok(REQUIRED_COLLECTIONS.includes('jobRuns'));
  assert.equal(REQUIRED_COLLECTIONS.length, 27);
});
