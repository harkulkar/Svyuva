import { PremiumRule } from '../models/PremiumRule.js';
import { PremiumCalculation } from '../models/PremiumCalculation.js';
import type { AuthUser } from '../types/auth.js';
import type mongoose from 'mongoose';

const OFFICIAL_NOTE = 'TODO: VERIFY OFFICIAL PREMIUM RULE';
const INCOMPLETE_MESSAGE = 'Premium calculation configuration requires official verification.';

export type PremiumInputs = {
  submissionId: string;
  instituteId: string;
  universityId: string;
  academicYear: string;
  studentCount: number;
  calculatedBy?: string | null;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function findActivePremiumRule(academicYear: string) {
  const now = new Date();
  return PremiumRule.findOne({
    academicYear,
    active: true,
    $and: [
      { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: now } }] },
      { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }] }
    ]
  }).sort({ updatedAt: -1 });
}

/**
 * Backend-only premium engine.
 * Formula used when a configurable rate exists: studentCount * ratePerStudent.
 * GST/tax/fees are NOT applied. Official SVYS rates were not found in source.
 */
export function computePremiumAmount(studentCount: number, ratePerStudent: number | null | undefined) {
  if (ratePerStudent == null || !Number.isFinite(ratePerStudent) || ratePerStudent < 0) {
    return {
      calculationStatus: 'INCOMPLETE' as const,
      ratePerStudent: null,
      basePremium: null,
      totalPremium: null,
      message: INCOMPLETE_MESSAGE
    };
  }
  const base = roundMoney(studentCount * ratePerStudent);
  return {
    calculationStatus: 'COMPLETE' as const,
    ratePerStudent,
    basePremium: base,
    totalPremium: base,
    message: ''
  };
}

export async function calculatePremiumForSubmission(
  input: PremiumInputs,
  session?: mongoose.ClientSession | null
) {
  const rule = await findActivePremiumRule(input.academicYear);
  const studentCount = Math.max(0, Math.floor(input.studentCount));
  let blockedMessage = '';
  if (rule) {
    if (rule.minimumStudents != null && studentCount < rule.minimumStudents) {
      blockedMessage = `Student count is below the configured minimum (${rule.minimumStudents}). ${OFFICIAL_NOTE}`;
    }
    if (rule.maximumStudents != null && studentCount > rule.maximumStudents) {
      blockedMessage = `Student count is above the configured maximum (${rule.maximumStudents}). ${OFFICIAL_NOTE}`;
    }
  }

  const amount = computePremiumAmount(studentCount, blockedMessage ? null : rule?.ratePerStudent);
  const officialVerified = Boolean(rule?.officialVerified);
  const payload = {
    submissionId: input.submissionId,
    instituteId: input.instituteId,
    universityId: input.universityId,
    academicYear: input.academicYear,
    studentCount,
    ratePerStudent: amount.ratePerStudent,
    basePremium: amount.basePremium,
    adjustments: [] as unknown[],
    taxes: [] as unknown[],
    totalPremium: amount.totalPremium,
    currency: rule?.currency || 'INR',
    ruleId: rule?._id ?? null,
    ruleVersion: rule?.version || '',
    calculationStatus: amount.calculationStatus,
    requiresOfficialVerification: !officialVerified,
    verificationNote: rule?.verificationNote || OFFICIAL_NOTE,
    message: blockedMessage || amount.message || (officialVerified ? '' : INCOMPLETE_MESSAGE),
    superseded: false,
    calculatedAt: new Date(),
    calculatedBy: input.calculatedBy || null
  };

  await PremiumCalculation.updateMany(
    { submissionId: input.submissionId, superseded: false },
    { $set: { superseded: true } },
    session ? { session } : undefined
  );

  const [created] = await PremiumCalculation.create([payload], session ? { session } : undefined);
  if (!created) {
    throw new Error('Premium calculation could not be stored.');
  }
  return created;
}

export function toPremiumDto(calc: {
  _id: mongoose.Types.ObjectId;
  submissionId: mongoose.Types.ObjectId;
  academicYear: string;
  studentCount: number;
  ratePerStudent?: number | null;
  basePremium?: number | null;
  adjustments?: unknown[];
  taxes?: unknown[];
  totalPremium?: number | null;
  currency?: string | null;
  ruleVersion?: string | null;
  calculationStatus: string;
  requiresOfficialVerification?: boolean | null;
  verificationNote?: string | null;
  message?: string | null;
  calculatedAt?: Date | null;
}) {
  const incomplete = calc.calculationStatus !== 'COMPLETE';
  return {
    id: String(calc._id),
    submissionId: String(calc.submissionId),
    academicYear: calc.academicYear,
    studentCount: calc.studentCount,
    inputs: {
      studentCount: calc.studentCount,
      ratePerStudent: incomplete ? null : calc.ratePerStudent ?? null,
      formula: 'TODO: VERIFY OFFICIAL PREMIUM RULE — configurable per-student rate × confirmed student count when a rate is configured.'
    },
    basePremium: incomplete ? null : calc.basePremium ?? null,
    adjustments: calc.adjustments ?? [],
    taxes: calc.taxes ?? [],
    totalPremium: incomplete ? null : calc.totalPremium ?? null,
    currency: calc.currency || 'INR',
    ruleVersion: calc.ruleVersion || '',
    calculationStatus: calc.calculationStatus,
    requiresOfficialVerification: calc.requiresOfficialVerification !== false,
    verificationNote: calc.verificationNote || OFFICIAL_NOTE,
    message: calc.message || (incomplete ? INCOMPLETE_MESSAGE : ''),
    calculatedAt: calc.calculatedAt || null,
    incompleteBanner: incomplete || calc.requiresOfficialVerification !== false ? INCOMPLETE_MESSAGE : null
  };
}

export async function listPremiumRules(academicYear?: string) {
  const filter: Record<string, unknown> = {};
  if (academicYear) filter.academicYear = academicYear;
  const rows = await PremiumRule.find(filter).sort({ academicYear: -1, updatedAt: -1 }).limit(100);
  return rows.map((row) => ({
    id: String(row._id),
    academicYear: row.academicYear,
    ruleType: row.ruleType,
    ratePerStudent: row.ratePerStudent,
    minimumStudents: row.minimumStudents,
    maximumStudents: row.maximumStudents,
    currency: row.currency,
    version: row.version,
    active: row.active,
    officialVerified: row.officialVerified,
    verificationNote: row.verificationNote,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo
  }));
}

export async function upsertPremiumRule(
  input: {
    academicYear: string;
    ratePerStudent?: number | null;
    minimumStudents?: number | null;
    maximumStudents?: number | null;
    currency?: string;
    version: string;
    active?: boolean;
    officialVerified?: boolean;
    effectiveFrom?: Date | null;
    effectiveTo?: Date | null;
  },
  user: AuthUser
) {
  const row = await PremiumRule.findOneAndUpdate(
    { academicYear: input.academicYear, version: input.version },
    {
      $set: {
        ruleType: 'PER_STUDENT',
        ratePerStudent: input.ratePerStudent ?? null,
        minimumStudents: input.minimumStudents ?? null,
        maximumStudents: input.maximumStudents ?? null,
        currency: input.currency || 'INR',
        active: input.active === true,
        officialVerified: input.officialVerified === true,
        verificationNote: OFFICIAL_NOTE,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
        updatedBy: user.id
      },
      $setOnInsert: { createdBy: user.id }
    },
    { upsert: true, new: true }
  );
  return row;
}
