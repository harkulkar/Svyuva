import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, signupSchema } from './authValidators.js';

const universityId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

test('loginSchema requires email and password', () => {
  const missing = loginSchema.safeParse({});
  assert.equal(missing.success, false);
  const ok = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
  assert.equal(ok.success, true);
});

test('signupSchema rejects ADMIN role and weak passwords', () => {
  const base = {
    universityId,
    instituteName: 'Test Institute',
    exclusiveType: 'Non Exclusive',
    locationType: 'Urban',
    minorityType: 'Non Minority',
    linguisticType: 'Non Linguistic',
    address: '123 College Road Pune',
    district: 'Pune',
    taluka: 'Haveli',
    jdRegion: 'Pune',
    email: 'college@example.in',
    mobile: '9876543210',
    principalName: 'Principal Name',
    collegeType: 'Aided',
    password: 'ValidPass1',
    confirmPassword: 'ValidPass1'
  };
  assert.equal(signupSchema.safeParse(base).success, true);
  assert.equal(signupSchema.safeParse({ ...base, role: 'ADMIN' }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, password: 'weak', confirmPassword: 'weak' }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, confirmPassword: 'OtherPass1' }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, email: 'not-an-email' }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, exclusiveType: 'No such type' }).success, false);
});
