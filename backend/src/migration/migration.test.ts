import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { detectPasswordAlgorithm, prepareMigratedPassword } from './password.js';
import { mapLegacyRole } from './roles.js';
import { findDuplicates, findOrphans, runPipeline } from './pipeline.js';
import { loadLegacySource } from './source.js';
import { sha256File } from './storage.js';
import { stripForbiddenPaymentFields } from './sensitive.js';
import {
  transformInstitute,
  transformPayment,
  transformStudent,
  transformUniversity,
  transformUser
} from './transform.js';
import { migrationConfig } from './config.js';
import { IdMapStore } from './idMap.js';

const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-export');

test('role mapping only allows ADMIN and COLLEGE', () => {
  assert.equal(mapLegacyRole('admin').ok && mapLegacyRole('admin').ok ? mapLegacyRole('administrator').ok : false, true);
  const admin = mapLegacyRole('ADMIN');
  assert.equal(admin.ok, true);
  if (admin.ok) assert.equal(admin.role, 'ADMIN');
  const college = mapLegacyRole('institute');
  assert.equal(college.ok, true);
  if (college.ok) assert.equal(college.role, 'COLLEGE');
  const bad = mapLegacyRole('superuser');
  assert.equal(bad.ok, false);
});

test('password migration never copies plaintext or weak hashes', async () => {
  assert.equal(detectPasswordAlgorithm('ValidPass1'), 'plaintext');
  assert.equal(detectPasswordAlgorithm('5f4dcc3b5aa765d61d8327deb882cf99'), 'md5');
  assert.equal(detectPasswordAlgorithm('$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'), 'bcrypt');
  const plain = await prepareMigratedPassword('ValidPass1');
  assert.equal(plain.passwordResetRequired, true);
  assert.notEqual(plain.passwordHash, 'ValidPass1');
  assert.equal(plain.passwordHash.startsWith('$2'), true);
  const md5 = await prepareMigratedPassword('5f4dcc3b5aa765d61d8327deb882cf99');
  assert.equal(md5.passwordResetRequired, true);
  assert.notEqual(md5.passwordHash, '5f4dcc3b5aa765d61d8327deb882cf99');
  const bcrypt = await prepareMigratedPassword('$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
  assert.equal(bcrypt.passwordResetRequired, false);
  assert.equal(bcrypt.passwordHash, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
});

test('payment transform drops card secrets', () => {
  const cleaned = stripForbiddenPaymentFields({
    id: 'PAY-1',
    amount: 10,
    card_number: '4111111111111111',
    cvv: '123',
    otp: '999999',
    txn_id: 'ABC'
  });
  assert.equal(cleaned.card_number, undefined);
  assert.equal(cleaned.cvv, undefined);
  assert.equal(cleaned.otp, undefined);
  assert.equal(cleaned.txn_id, 'ABC');
  const result = transformPayment(
    { id: 'PAY-1', amount: 10, card_number: '4111111111111111', cvv: '123', status: 'paid', txn_id: 'ABC' },
    {}
  );
  assert.ok(result.document);
  assert.equal((result.document as { gatewayReference?: string }).gatewayReference, 'ABC');
  assert.equal(JSON.stringify(result.document).includes('4111111111111111'), false);
});

test('university and student transforms require real fields', () => {
  const missing = transformUniversity({ id: 'U1' });
  assert.equal(missing.classification, 'REVIEW_REQUIRED');
  const ok = transformUniversity({ id: 'U1', name: 'TEST University' });
  assert.equal(ok.classification, 'VALID');
  const orphanStudent = transformStudent(
    {
      id: 'S1',
      studentId: 'S1',
      enrollmentNumber: 'E1',
      rollNumber: 'R1',
      firstName: 'A',
      lastName: 'B',
      gender: 'Male',
      dateOfBirth: '2005-01-01',
      mobile: '9876543210',
      course: 'BA',
      year: 'First Year',
      academicYear: '2025-26'
    },
    {}
  );
  assert.equal(orphanStudent.classification, 'REVIEW_REQUIRED');
  assert.equal(orphanStudent.issues[0]?.code, 'MISSING_PARENT');
});

test('duplicate and orphan detection uses identifiers not row position', async () => {
  const source = await loadLegacySource({
    ...migrationConfig('dry-run', { fixtureDir }),
    exportDir: fixtureDir
  });
  const duplicates = findDuplicates(source);
  assert.ok(duplicates.some((row) => row.entity === 'institute' && row.key.includes('institute.one@example.test')));
  assert.ok(duplicates.some((row) => row.entity === 'student' && row.key.includes('S001')));
  const orphans = findOrphans(source);
  assert.ok(orphans.some((row) => row.entity === 'institute' && row.parentLegacyId === 'UNI-DOES-NOT-EXIST'));
  assert.ok(orphans.some((row) => row.entity === 'student' && row.parentLegacyId === 'INST-MISSING'));
});

test('id map is deterministic by legacyId', async () => {
  const maps = new IdMapStore(null, 'svyuvasuraksha-legacy', 'run-1', false);
  await maps.set('university', 'UNI-TEST-1', 'new-1');
  await maps.set('university', 'UNI-TEST-1', 'new-1');
  assert.equal(maps.get('university', 'UNI-TEST-1'), 'new-1');
  assert.equal(maps.get('university', 'UNI-TEST-2'), undefined);
});

test('document checksum is SHA-256', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'svysy-mig-'));
  const file = path.join(dir, 'sample.txt');
  await fs.writeFile(file, 'fixture-bytes');
  const digest = await sha256File(file);
  const expected = createHash('sha256').update('fixture-bytes').digest('hex');
  assert.equal(digest, expected);
  await fs.rm(dir, { recursive: true, force: true });
});

test('dry-run fixture pipeline does not invent official data and classifies problems', async () => {
  const reportsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svysy-reports-'));
  const mapsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'svysy-maps-'));
  const config = migrationConfig('dry-run', { fixtureDir });
  config.reportsDir = reportsDir;
  config.mapsDir = mapsDir;
  const bundle = await runPipeline(config);
  assert.equal(bundle.dryRun, true);
  assert.equal(bundle.sourceKind, 'fixture');
  assert.equal(bundle.counts.Universities.legacy, 2);
  assert.equal(bundle.counts.Universities.valid, 1);
  assert.equal(bundle.counts.Universities.review, 1);
  assert.ok(bundle.counts.Institutes.review >= 1);
  assert.ok(bundle.counts.Students.review >= 1);
  assert.ok(bundle.counts.Documents.failed >= 1);
  const college = await transformUser(
    {
      id: 'USER-TEST-COLLEGE',
      email: 'fixture.college@example.test',
      name: 'Fixture College User',
      role: 'college',
      status: 'active',
      password: '5f4dcc3b5aa765d61d8327deb882cf99'
    },
    { instituteId: 'mapped-inst' }
  );
  assert.equal((college.document as { passwordResetRequired?: boolean }).passwordResetRequired, true);
  const quality = JSON.parse(await fs.readFile(path.join(reportsDir, 'data-quality-report.json'), 'utf8')) as {
    counts: { Universities: { legacy: number } };
  };
  assert.equal(quality.counts.Universities.legacy, 2);
  await fs.rm(reportsDir, { recursive: true, force: true });
  await fs.rm(mapsDir, { recursive: true, force: true });
});

test('institute without parent mapping is review required', () => {
  const result = transformInstitute(
    {
      id: 'INST-1',
      name: 'X',
      email: 'x@example.test',
      address: 'addr',
      district: 'Pune',
      taluka: 'Haveli',
      jd_region: 'Pune',
      mobile: '9876543210',
      principal_name: 'P',
      college_type: 'Aided'
    },
    undefined
  );
  assert.equal(result.classification, 'REVIEW_REQUIRED');
});
