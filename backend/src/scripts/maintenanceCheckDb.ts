import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { REQUIRED_COLLECTIONS } from '../config/collections.js';
import { pingDatabase } from '../services/operationsService.js';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const destructive = process.env.CONFIRM_DESTRUCTIVE_OPERATION === 'true';
  await connectDatabase();
  const ping = await pingDatabase();
  const db = mongoose.connection.db;
  const collections = db ? (await db.listCollections().toArray()).map((item) => item.name) : [];
  const missing = REQUIRED_COLLECTIONS.filter((name) => !collections.includes(name));
  const counts: Record<string, number> = {};
  if (db) {
    for (const name of REQUIRED_COLLECTIONS) {
      if (collections.includes(name)) {
        counts[name] = await db.collection(name).estimatedDocumentCount();
      }
    }
  }
  const report = {
    mode: 'read-only',
    destructiveRequested: destructive,
    destructiveExecuted: false,
    database: { status: ping.status, connected: ping.connected, responseTimeMs: ping.responseTimeMs },
    missingCollections: missing,
    estimatedCounts: counts,
    note: 'Collection names only. Credentials are not printed. Destructive maintenance is not implemented.'
  };
  console.log(JSON.stringify(report, null, 2));
  await disconnectDatabase();
  if (ping.status !== 'ok') process.exit(1);
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
