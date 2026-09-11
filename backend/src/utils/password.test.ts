import assert from 'node:assert/strict';
import test from 'node:test';
import { comparePassword, hashPassword, isStrongPassword } from './password.js';

test('isStrongPassword enforces complexity', () => {
  assert.equal(isStrongPassword('short'), false);
  assert.equal(isStrongPassword('alllowercase1'), false);
  assert.equal(isStrongPassword('ALLUPPERCASE1'), false);
  assert.equal(isStrongPassword('NoNumberHere'), false);
  assert.equal(isStrongPassword('ValidPass1'), true);
});

test('hashPassword does not store plaintext', async () => {
  const hash = await hashPassword('ValidPass1');
  assert.notEqual(hash, 'ValidPass1');
  assert.equal(await comparePassword('ValidPass1', hash), true);
  assert.equal(await comparePassword('WrongPass1', hash), false);
});
