import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { REQUIRED_COLLECTIONS } from '../config/collections.js';
import mongoose from 'mongoose';

const EXPECTED: Record<string, string[]> = {
  users: ['email_1'],
  institutes: ['email_1', 'status_1'],
  students: ['instituteId_1_status_1'],
  auditLogs: ['createdAt_-1', 'action_1']
};

async function main(): Promise<void> {
  const destructive = process.env.CONFIRM_DESTRUCTIVE_OPERATION === 'true';
  await connectDatabase();
  const db = mongoose.connection.db;
  const perCollection: Array<{ collection: string; indexes: string[]; missingExpected: string[] }> = [];
  if (db) {
    for (const name of REQUIRED_COLLECTIONS) {
      try {
        const indexes = await db.collection(name).indexes();
        const indexNames = indexes.map((item) => item.name || '').filter(Boolean);
        const expected = EXPECTED[name] || [];
        perCollection.push({
          collection: name,
          indexes: indexNames,
          missingExpected: expected.filter((item) => !indexNames.includes(item))
        });
      } catch {
        perCollection.push({ collection: name, indexes: [], missingExpected: EXPECTED[name] || ['collection missing'] });
      }
    }
  }
  const report = {
    mode: 'read-only',
    destructiveRequested: destructive,
    destructiveExecuted: false,
    collections: perCollection,
    note: 'Index names only. No MongoDB admin credentials or hostnames are printed.'
  };
  console.log(JSON.stringify(report, null, 2));
  await disconnectDatabase();
}

main().catch(async (error: unknown) => {
  console.error(JSON.stringify({
    status: 'FAILED',
    message: error instanceof Error ? error.message : 'Unknown error'
  }));
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
