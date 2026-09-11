import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import type { MigrationEntity } from '../models/MigrationIdMap.js';
import { bindModels, type BoundModels } from './bindModels.js';
import { assertStagingTarget, type MigrationConfig } from './config.js';
import { IdMapStore } from './idMap.js';
import { migrationLog } from './log.js';
import { emptyCounts, firstString, normalizeEmail, normalizeName } from './pick.js';
import { printCounts, writeReports, type ReportBundle } from './reports.js';
import { loadLegacySource } from './source.js';
import {
  transformAudit,
  transformDocument,
  transformEcard,
  transformEnrollment,
  transformInstitute,
  transformInsurance,
  transformNotification,
  transformPayment,
  transformReview,
  transformStudent,
  transformUniversity,
  transformUser
} from './transform.js';
import type { DuplicateHit, EntityCounts, IssueRow, LegacyRecord, LegacySource, OrphanHit, TransformResult } from './types.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function bump(counts: EntityCounts, classification: TransformResult['classification']): void {
  if (classification === 'VALID') counts.valid += 1;
  if (classification === 'WARNING') counts.warning += 1;
  if (classification === 'REVIEW_REQUIRED') counts.review += 1;
  if (classification === 'SKIPPED') counts.skipped += 1;
  if (classification === 'FAILED') counts.failed += 1;
}

function parentId(record: LegacyRecord, aliases: string[]): string | undefined {
  return firstString(record, aliases);
}

export function findDuplicates(source: LegacySource): DuplicateHit[] {
  const hits: DuplicateHit[] = [];

  function collect(entity: string, records: LegacyRecord[], keyFn: (row: LegacyRecord) => string | undefined) {
    const groups = new Map<string, string[]>();
    for (const row of records) {
      const key = keyFn(row);
      if (!key) continue;
      const id = firstString(row, ['legacyId', 'id']) || '?';
      const list = groups.get(key) ?? [];
      list.push(id);
      groups.set(key, list);
    }
    for (const [key, legacyIds] of groups) {
      if (legacyIds.length > 1) hits.push({ entity, key, legacyIds });
    }
  }

  collect('university', source.universities, (row) => {
    const name = firstString(row, ['name', 'university_name', 'universityName']);
    return name ? `name:${normalizeName(name)}` : undefined;
  });
  collect('institute', source.institutes, (row) => {
    const email = normalizeEmail(firstString(row, ['email']));
    return email ? `email:${email}` : undefined;
  });
  collect('user', source.users, (row) => {
    const email = normalizeEmail(firstString(row, ['email']));
    return email ? `email:${email}` : undefined;
  });
  collect('student', source.students, (row) => {
    const inst = firstString(row, ['institute_id', 'inst_id', 'instituteId']);
    const sid = firstString(row, ['studentId', 'student_code', 'legacyId', 'id']);
    return inst && sid ? `institute:${inst}:studentId:${sid}` : undefined;
  });
  return hits;
}

export function findOrphans(source: LegacySource): OrphanHit[] {
  const uniIds = new Set(source.universities.map((row) => firstString(row, ['legacyId', 'id', 'university_id', 'uni_id'])).filter(Boolean) as string[]);
  const instIds = new Set(source.institutes.map((row) => firstString(row, ['legacyId', 'id', 'institute_id', 'inst_id'])).filter(Boolean) as string[]);
  const studentIds = new Set(source.students.map((row) => firstString(row, ['legacyId', 'id', 'student_id'])).filter(Boolean) as string[]);
  const hits: OrphanHit[] = [];

  for (const row of source.institutes) {
    const id = firstString(row, ['legacyId', 'id']) || '?';
    const uni = firstString(row, ['university_id', 'uni_id', 'universityId']);
    if (uni && !uniIds.has(uni)) hits.push({ entity: 'institute', legacyId: id, missing: 'university', parentLegacyId: uni });
  }
  for (const row of source.students) {
    const id = firstString(row, ['legacyId', 'id']) || '?';
    const inst = firstString(row, ['institute_id', 'inst_id', 'instituteId']);
    if (inst && !instIds.has(inst)) hits.push({ entity: 'student', legacyId: id, missing: 'institute', parentLegacyId: inst });
  }
  for (const row of source.insurance) {
    const id = firstString(row, ['legacyId', 'id']) || '?';
    const student = firstString(row, ['student_id', 'stud_id', 'studentId']);
    if (student && !studentIds.has(student)) hits.push({ entity: 'insurance', legacyId: id, missing: 'student', parentLegacyId: student });
  }
  for (const row of source.documents) {
    const id = firstString(row, ['legacyId', 'id']) || '?';
    const student = firstString(row, ['student_id', 'stud_id', 'studentId']);
    if (student && !studentIds.has(student)) hits.push({ entity: 'document', legacyId: id, missing: 'student', parentLegacyId: student });
  }
  return hits;
}

async function persistEntity(
  config: MigrationConfig,
  models: BoundModels | null,
  maps: IdMapStore,
  entity: MigrationEntity,
  modelName: keyof BoundModels,
  result: TransformResult,
  uniqueQuery?: Record<string, unknown>
): Promise<'migrated' | 'existing' | 'skipped'> {
  if (!result.legacyId || !result.document) return 'skipped';
  const existingMap = await maps.load(entity, result.legacyId);
  if (!config.dryRun && models) {
    const Model = models[modelName];
    if (existingMap) {
      await Model.updateOne({ _id: existingMap }, { $set: result.document });
      migrationLog({ entity, legacyId: result.legacyId, action: 'MIGRATE', result: 'UPDATED' });
      return 'existing';
    }
    if (uniqueQuery) {
      const clash = asRecord(await Model.findOne(uniqueQuery).lean());
      if (clash && !clash.legacyId) {
        migrationLog({
          entity,
          legacyId: result.legacyId,
          action: 'MIGRATE',
          result: 'REVIEW_REQUIRED',
          code: 'DUPLICATE_REVIEW_REQUIRED',
          message: 'Target record exists without this legacyId'
        });
        return 'skipped';
      }
      if (clash && clash.legacyId && String(clash.legacyId) !== result.legacyId) {
        migrationLog({
          entity,
          legacyId: result.legacyId,
          action: 'MIGRATE',
          result: 'REVIEW_REQUIRED',
          code: 'DUPLICATE_REVIEW_REQUIRED'
        });
        return 'skipped';
      }
      if (clash) {
        await Model.updateOne({ _id: clash._id }, { $set: result.document });
        await maps.set(entity, result.legacyId, String(clash._id));
        return 'existing';
      }
    }
    const created = await Model.create(result.document);
    await maps.set(entity, result.legacyId, String(created._id));
    migrationLog({ entity, legacyId: result.legacyId, action: 'MIGRATE', result: 'SUCCESS' });
    return 'migrated';
  }
  if (existingMap) {
    migrationLog({ entity, legacyId: result.legacyId, action: 'DRY_RUN', result: 'EXISTING' });
    return 'existing';
  }
  await maps.set(entity, result.legacyId, new mongoose.Types.ObjectId().toString());
  migrationLog({ entity, legacyId: result.legacyId, action: 'DRY_RUN', result: 'SUCCESS' });
  return 'migrated';
}

async function runBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    for (const item of slice) {
      await fn(item);
    }
  }
}

export async function runPipeline(config: MigrationConfig): Promise<ReportBundle> {
  const runId = randomUUID();
  const source = await loadLegacySource(config);
  const counts = {
    Universities: emptyCounts(),
    Institutes: emptyCounts(),
    Users: emptyCounts(),
    Students: emptyCounts(),
    Enrollments: emptyCounts(),
    Insurance: emptyCounts(),
    Documents: emptyCounts(),
    Payments: emptyCounts(),
    Reviews: emptyCounts(),
    'E-Cards': emptyCounts(),
    Notifications: emptyCounts(),
    'Audit logs': emptyCounts()
  };
  const issues: IssueRow[] = [];
  const duplicates = findDuplicates(source);
  const orphans = findOrphans(source);
  const missingFiles: ReportBundle['missingFiles'] = [];

  let models: BoundModels | null = null;
  let connection: mongoose.Connection | null = null;
  if (!config.dryRun) {
    assertStagingTarget(config);
    connection = await mongoose.createConnection(config.stagingUri, { dbName: config.dbName }).asPromise();
    models = bindModels(connection);
    await models.MigrationRun.create({
      runId,
      mode: config.mode,
      dryRun: false,
      startedAt: new Date(),
      sourceKind: source.kind,
      notes: [source.note]
    });
  }

  const maps = new IdMapStore(models, config.legacySystem, runId, !config.dryRun);

  counts.Universities.legacy = source.universities.length;
  await runBatches(source.universities, config.batchSize, async (row) => {
    const result = transformUniversity(row);
    issues.push(...result.issues);
    bump(counts.Universities, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'university', 'University', result, {
      nameNormalized: (result.document as { nameNormalized?: string }).nameNormalized
    });
    if (outcome === 'migrated') counts.Universities.migrated += 1;
    if (outcome === 'existing') counts.Universities.existing += 1;
  });

  counts.Institutes.legacy = source.institutes.length;
  await runBatches(source.institutes, config.batchSize, async (row) => {
    const uniLegacy = parentId(row, ['university_id', 'uni_id', 'universityId']);
    const uniNew = uniLegacy ? await maps.load('university', uniLegacy) : undefined;
    const result = transformInstitute(row, uniNew);
    issues.push(...result.issues);
    bump(counts.Institutes, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'institute', 'Institute', result, {
      email: (result.document as { email?: string }).email
    });
    if (outcome === 'migrated') counts.Institutes.migrated += 1;
    if (outcome === 'existing') counts.Institutes.existing += 1;
  });

  counts.Users.legacy = source.users.length;
  await runBatches(source.users, config.batchSize, async (row) => {
    const instLegacy = parentId(row, ['institute_id', 'inst_id', 'instituteId']);
    const uniLegacy = parentId(row, ['university_id', 'uni_id', 'universityId']);
    const result = await transformUser(row, {
      instituteId: instLegacy ? await maps.load('institute', instLegacy) : undefined,
      universityId: uniLegacy ? await maps.load('university', uniLegacy) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Users, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'user', 'User', result, { email: (result.document as { email?: string }).email });
    if (outcome === 'migrated') counts.Users.migrated += 1;
    if (outcome === 'existing') counts.Users.existing += 1;
  });

  counts.Students.legacy = source.students.length;
  await runBatches(source.students, config.batchSize, async (row) => {
    const instLegacy = parentId(row, ['institute_id', 'inst_id', 'instituteId']);
    const uniLegacyDirect = parentId(row, ['university_id', 'uni_id']);
    const instituteId = instLegacy ? await maps.load('institute', instLegacy) : undefined;
    let universityId = uniLegacyDirect ? await maps.load('university', uniLegacyDirect) : undefined;
    if (!universityId && instLegacy) {
      const parentInstitute = source.institutes.find(
        (item) => firstString(item, ['legacyId', 'id', 'institute_id', 'inst_id']) === instLegacy
      );
      const parentUni = parentInstitute ? parentId(parentInstitute, ['university_id', 'uni_id', 'universityId']) : undefined;
      universityId = parentUni ? await maps.load('university', parentUni) : undefined;
    }
    if (!universityId && instituteId && models && !config.dryRun) {
      const inst = asRecord(await models.Institute.findById(instituteId).lean());
      universityId = inst?.universityId ? String(inst.universityId) : undefined;
    }
    const result = transformStudent(row, { instituteId, universityId });
    issues.push(...result.issues);
    bump(counts.Students, result.classification);
    if (!result.document || !result.legacyId) return;
    const doc = result.document as { instituteId?: unknown; studentId?: unknown };
    const outcome = await persistEntity(config, models, maps, 'student', 'Student', result, {
      instituteId: doc.instituteId,
      studentId: doc.studentId
    });
    if (outcome === 'migrated') counts.Students.migrated += 1;
    if (outcome === 'existing') counts.Students.existing += 1;
  });

  counts.Enrollments.legacy = source.enrollments.length;
  await runBatches(source.enrollments, config.batchSize, async (row) => {
    const studentLegacy = parentId(row, ['student_id', 'stud_id', 'studentId']);
    const result = transformEnrollment(row, {
      studentId: studentLegacy ? await maps.load('student', studentLegacy) : undefined,
      instituteId: parentId(row, ['institute_id']) ? await maps.load('institute', parentId(row, ['institute_id']) as string) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Enrollments, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'enrollment', 'Enrollment', result);
    if (outcome === 'migrated') counts.Enrollments.migrated += 1;
    if (outcome === 'existing') counts.Enrollments.existing += 1;
  });

  counts.Insurance.legacy = source.insurance.length;
  await runBatches(source.insurance, config.batchSize, async (row) => {
    const studentLegacy = parentId(row, ['student_id', 'stud_id', 'studentId']);
    const result = transformInsurance(row, {
      studentId: studentLegacy ? await maps.load('student', studentLegacy) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Insurance, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'insurance', 'InsuranceEnrollment', result);
    if (outcome === 'migrated') counts.Insurance.migrated += 1;
    if (outcome === 'existing') counts.Insurance.existing += 1;
  });

  counts.Documents.legacy = source.documents.length;
  await runBatches(source.documents, config.batchSize, async (row) => {
    const studentLegacy = parentId(row, ['student_id', 'stud_id', 'studentId']);
    const instLegacy = parentId(row, ['institute_id', 'inst_id']);
    const result = transformDocument(row, {
      studentId: studentLegacy ? await maps.load('student', studentLegacy) : undefined,
      instituteId: instLegacy ? await maps.load('institute', instLegacy) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Documents, result.classification);
    if (result.classification === 'FAILED') {
      missingFiles.push({
        legacyId: result.legacyId || '?',
        path: String(firstString(row, ['path', 'file_path', 'url']) || ''),
        reason: result.issues[0]?.message || 'FILE_MIGRATION_FAILED'
      });
    }
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'document', 'Document', result);
    if (outcome === 'migrated') counts.Documents.migrated += 1;
    if (outcome === 'existing') counts.Documents.existing += 1;
  });

  counts.Payments.legacy = source.payments.length;
  await runBatches(source.payments, config.batchSize, async (row) => {
    const studentLegacy = parentId(row, ['student_id', 'stud_id']);
    const result = transformPayment(row, {
      studentId: studentLegacy ? await maps.load('student', studentLegacy) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Payments, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'payment', 'Payment', result);
    if (outcome === 'migrated') counts.Payments.migrated += 1;
    if (outcome === 'existing') counts.Payments.existing += 1;
  });

  counts.Reviews.legacy = source.reviews.length;
  await runBatches(source.reviews, config.batchSize, async (row) => {
    const result = transformReview(row, {
      studentId: parentId(row, ['student_id']) ? await maps.load('student', parentId(row, ['student_id']) as string) : undefined,
      reviewerId: parentId(row, ['reviewer_id', 'user_id']) ? await maps.load('user', parentId(row, ['reviewer_id', 'user_id']) as string) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Reviews, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'review', 'Review', result);
    if (outcome === 'migrated') counts.Reviews.migrated += 1;
    if (outcome === 'existing') counts.Reviews.existing += 1;
  });

  counts['E-Cards'].legacy = source.ecards.length;
  await runBatches(source.ecards, config.batchSize, async (row) => {
    const studentLegacy = parentId(row, ['student_id', 'stud_id']);
    const result = transformEcard(row, {
      studentId: studentLegacy ? await maps.load('student', studentLegacy) : undefined
    });
    issues.push(...result.issues);
    bump(counts['E-Cards'], result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'ecard', 'ECard', result);
    if (outcome === 'migrated') counts['E-Cards'].migrated += 1;
    if (outcome === 'existing') counts['E-Cards'].existing += 1;
  });

  counts.Notifications.legacy = source.notifications.length;
  await runBatches(source.notifications, config.batchSize, async (row) => {
    const result = transformNotification(row, {
      userId: parentId(row, ['user_id']) ? await maps.load('user', parentId(row, ['user_id']) as string) : undefined
    });
    issues.push(...result.issues);
    bump(counts.Notifications, result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'notification', 'Notification', result);
    if (outcome === 'migrated') counts.Notifications.migrated += 1;
    if (outcome === 'existing') counts.Notifications.existing += 1;
  });

  counts['Audit logs'].legacy = source.auditLogs.length;
  await runBatches(source.auditLogs, config.batchSize, async (row) => {
    const result = transformAudit(row, {
      userId: parentId(row, ['user_id']) ? await maps.load('user', parentId(row, ['user_id']) as string) : undefined
    });
    issues.push(...result.issues);
    bump(counts['Audit logs'], result.classification);
    if (!result.document || !result.legacyId) return;
    const outcome = await persistEntity(config, models, maps, 'audit', 'AuditLog', result);
    if (outcome === 'migrated') counts['Audit logs'].migrated += 1;
    if (outcome === 'existing') counts['Audit logs'].existing += 1;
  });

  const bundle: ReportBundle = {
    generatedAt: new Date().toISOString(),
    mode: config.mode,
    sourceKind: source.kind,
    sourceNote: source.note,
    dryRun: config.dryRun,
    counts,
    issues,
    duplicates,
    orphans,
    missingFiles
  };

  await writeReports(config.reportsDir, bundle);
  await fs.mkdir(config.mapsDir, { recursive: true });
  const snapshot = maps.snapshot();
  for (const [entity, mapping] of Object.entries(snapshot)) {
    await fs.writeFile(path.join(config.mapsDir, `${entity}-map.json`), JSON.stringify(mapping, null, 2));
  }

  if (models) {
    await models.MigrationRun.updateOne({ runId }, { $set: { finishedAt: new Date(), counts } });
    if (issues.length) {
      await models.MigrationIssue.insertMany(
        issues.map((row) => ({
          runId,
          entity: row.entity,
          legacyId: row.legacyId,
          classification: row.classification,
          code: row.code,
          message: row.message
        }))
      );
    }
  }
  if (connection) await connection.close();

  printCounts(counts);
  console.info(`Duplicates: ${duplicates.length}`);
  console.info(`Orphans: ${orphans.length}`);
  console.info(`Missing files: ${missingFiles.length}`);
  console.info(`Issues: ${issues.length}`);
  console.info(`Reports written to ${config.reportsDir}`);
  return bundle;
}
