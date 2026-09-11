import mongoose from 'mongoose';
import { bindModels } from './bindModels.js';
import { assertStagingTarget, type MigrationConfig } from './config.js';

export type VerifyFinding = {
  ok: boolean;
  check: string;
  detail: string;
};

type Doc = Record<string, unknown> & { _id?: unknown };

function asDoc(value: unknown): Doc | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Doc;
}

function asDocs(value: unknown): Doc[] {
  return Array.isArray(value) ? (value as Doc[]) : [];
}

export async function verifyMigration(config: MigrationConfig): Promise<{ findings: VerifyFinding[]; sampled: number }> {
  if (!config.stagingUri) {
    console.info('MONGODB_URI_MIGRATION_STAGING is not set. Verification skipped (no staging database).');
    return { findings: [], sampled: 0 };
  }
  assertStagingTarget(config);
  const connection = await mongoose.createConnection(config.stagingUri, { dbName: config.dbName }).asPromise();
  const models = bindModels(connection);
  const findings: VerifyFinding[] = [];
  const limit = config.sampleSize;

  const students = asDocs(await models.Student.find({ legacyId: { $ne: null } }).limit(limit).lean());
  for (const student of students) {
    const institute = asDoc(await models.Institute.findById(student.instituteId).lean());
    const university = asDoc(await models.University.findById(student.universityId).lean());
    findings.push({
      ok: Boolean(institute),
      check: 'Student → Institute',
      detail: `student legacyId=${String(student.legacyId)} instituteId=${String(student.instituteId)}`
    });
    findings.push({
      ok: Boolean(university) && (!institute || String(institute.universityId) === String(student.universityId)),
      check: 'Student → University / Institute.universityId',
      detail: `student legacyId=${String(student.legacyId)}`
    });
    const insurance = asDoc(await models.InsuranceEnrollment.findOne({ studentId: student._id }).lean());
    if (insurance) {
      findings.push({
        ok: String(insurance.studentId) === String(student._id),
        check: 'Student → Insurance',
        detail: `insurance legacyId=${String(insurance.legacyId)}`
      });
    }
    const ecard = asDoc(await models.ECard.findOne({ studentId: student._id }).lean());
    if (ecard) {
      findings.push({
        ok: String(ecard.studentId) === String(student._id),
        check: 'Student → E-Card',
        detail: `ecard legacyId=${String(ecard.legacyId)}`
      });
    }
  }

  const institutes = asDocs(await models.Institute.find({ legacyId: { $ne: null } }).limit(limit).lean());
  for (const institute of institutes) {
    const university = asDoc(await models.University.findById(institute.universityId).lean());
    findings.push({
      ok: Boolean(university),
      check: 'Institute → University',
      detail: `institute legacyId=${String(institute.legacyId)}`
    });
    const user = asDoc(await models.User.findOne({ instituteId: institute._id, role: 'COLLEGE' }).lean());
    if (user) {
      findings.push({
        ok: String(user.instituteId) === String(institute._id),
        check: 'Institute → User',
        detail: `user legacyId=${String(user.legacyId)}`
      });
    }
  }

  const payments = asDocs(await models.Payment.find({ legacyId: { $ne: null }, insuranceId: { $ne: null } }).limit(limit).lean());
  for (const payment of payments) {
    const insurance = asDoc(await models.InsuranceEnrollment.findById(payment.insuranceId).lean());
    findings.push({
      ok: Boolean(insurance),
      check: 'Insurance → Payment',
      detail: `payment legacyId=${String(payment.legacyId)}`
    });
  }

  const reviews = asDocs(await models.Review.find({ legacyId: { $ne: null }, entityId: { $ne: null } }).limit(limit).lean());
  for (const review of reviews) {
    findings.push({
      ok: Boolean(review.entityType),
      check: 'Review → related record',
      detail: `review legacyId=${String(review.legacyId)} entityType=${String(review.entityType)}`
    });
  }

  await connection.close();
  const failed = findings.filter((row) => !row.ok);
  console.info(`Verification sampled ${students.length} students, ${institutes.length} institutes.`);
  console.info(`Checks: ${findings.length}; failed: ${failed.length}`);
  for (const row of failed) {
    console.info(`FAIL ${row.check} ${row.detail}`);
  }
  return { findings, sampled: students.length + institutes.length };
}
