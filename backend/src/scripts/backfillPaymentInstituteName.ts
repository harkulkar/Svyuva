import '../config/dns.js';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Payment } from '../models/Payment.js';
import { Institute } from '../models/Institute.js';
import { logger } from '../utils/logger.js';

const MISSING_INSTITUTE_NAME = {
  instituteId: { $ne: null },
  $or: [{ instituteName: null }, { instituteName: { $exists: false } }, { instituteName: '' }]
};

async function main(): Promise<void> {
  const apply = process.env.CONFIRM_DESTRUCTIVE_OPERATION === 'true';
  await connectDatabase();

  const totalPayments = await Payment.countDocuments({});
  const missingRows = await Payment.aggregate<{ _id: mongoose.Types.ObjectId | null; count: number }>([
    { $match: MISSING_INSTITUTE_NAME },
    { $group: { _id: '$instituteId', count: { $sum: 1 } } }
  ]);

  const instituteIds = missingRows.map((row) => row._id).filter((id): id is mongoose.Types.ObjectId => id != null);
  const institutes = instituteIds.length
    ? await Institute.find({ _id: { $in: instituteIds } }).select('name').lean()
    : [];
  const nameById = new Map(institutes.map((institute) => [String(institute._id), institute.name]));

  let backfillable = 0;
  let orphaned = 0;
  for (const row of missingRows) {
    const key = row._id == null ? '' : String(row._id);
    if (nameById.has(key)) backfillable += row.count;
    else orphaned += row.count;
  }

  let updated = 0;
  if (apply) {
    for (const [id, name] of nameById) {
      const result = await Payment.updateMany(
        { ...MISSING_INSTITUTE_NAME, instituteId: id },
        { $set: { instituteName: name } }
      );
      updated += result.modifiedCount ?? 0;
    }
  }

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    destructiveRequested: apply,
    destructiveExecuted: apply,
    totals: {
      payments: totalPayments,
      missingInstituteName: missingRows.reduce((sum, row) => sum + row.count, 0),
      distinctInstitutes: missingRows.length,
      backfillable,
      orphaned
    },
    updated,
    note: apply
      ? 'instituteName written from the linked institute record. Payments without a matching institute were skipped.'
      : 'Dry run only. Re-run with CONFIRM_DESTRUCTIVE_OPERATION=true to write instituteName.'
  };
  console.log(JSON.stringify(report, null, 2));
  await disconnectDatabase();
}

main().catch(async (error: unknown) => {
  logger.error('payment_institute_name_backfill_failed', {
    message: error instanceof Error ? error.message : 'Unknown error'
  });
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
