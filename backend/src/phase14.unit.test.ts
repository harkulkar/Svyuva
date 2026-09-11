import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from './middleware/errorHandler.js';
import { featureDisabled, instituteFilter } from './services/schemeRecords.service.js';
import type { AuthUser } from './types/auth.js';

const college: AuthUser = {
  id: 'u1',
  name: 'College User',
  email: 'college@example.in',
  role: 'COLLEGE',
  status: 'ACTIVE',
  instituteId: 'inst-session'
};

const admin: AuthUser = {
  id: 'u2',
  name: 'Admin User',
  email: 'admin@example.in',
  role: 'ADMIN',
  status: 'ACTIVE'
};

test('college scheme lists ignore query instituteId and use the session institute', () => {
  assert.deepEqual(instituteFilter(college, { instituteId: 'someone-else' }), { instituteId: 'inst-session' });
});

test('admin scheme lists are unscoped unless instituteId is provided', () => {
  assert.deepEqual(instituteFilter(admin, {}), {});
  assert.deepEqual(instituteFilter(admin, { instituteId: 'inst-a' }), { instituteId: 'inst-a' });
});

test('college accounts without an institute cannot list scheme records', () => {
  assert.throws(
    () => instituteFilter({ ...college, instituteId: undefined }, {}),
    (error: unknown) => error instanceof AppError && error.statusCode === 403
  );
});

test('disabled document and e-card file APIs stay feature-flagged', () => {
  assert.throws(
    () => featureDisabled('document'),
    (error: unknown) => error instanceof AppError && error.statusCode === 501 && error.code === 'FEATURE_DISABLED'
  );
  assert.throws(
    () => featureDisabled('ecard'),
    (error: unknown) => error instanceof AppError && error.statusCode === 501
  );
});
