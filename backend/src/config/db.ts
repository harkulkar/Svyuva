import mongoose from 'mongoose';
import { env } from './env.js';
import { REQUIRED_COLLECTIONS } from './collections.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDatabase(): Promise<typeof mongoose> {
  const connection = await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 15000
  });

  logger.info(`MongoDB connected (database=${env.MONGODB_DB_NAME})`);
  attachSlowQueryMonitor();
  await ensureCollections();
  return connection;
}

function attachSlowQueryMonitor(): void {
  const client = mongoose.connection.getClient();
  client.on('commandSucceeded', (event) => {
    if (event.duration >= env.SLOW_QUERY_MS && event.commandName !== 'ping') {
      logger.warn('slow_query', {
        command: event.commandName,
        durationMs: event.duration,
        category: 'database'
      });
    }
  });
  client.on('commandFailed', (event) => {
    logger.error('db_command_failed', {
      command: event.commandName,
      durationMs: event.duration,
      category: 'database',
      message: 'Database command failed'
    });
  });
}

export async function ensureCollections(): Promise<string[]> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }

  const existing = new Set((await db.listCollections().toArray()).map((item) => item.name));
  const created: string[] = [];

  for (const name of REQUIRED_COLLECTIONS) {
    if (!existing.has(name)) {
      await db.createCollection(name);
      created.push(name);
    }
  }

  if (created.length > 0) {
    logger.info(`Created collections: ${created.join(', ')}`);
  }

  await db.collection('settings').updateOne(
    { key: 'bootstrap' },
    {
      $setOnInsert: {
        key: 'bootstrap',
        database: env.MONGODB_DB_NAME,
        phase: 1,
        note: 'Phase 1 bootstrap record. Not production seed data.',
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  await repairLegacyIndexes();

  return [...existing, ...created];
}

const LEGACY_INDEXED_COLLECTIONS = [
  'users',
  'universities',
  'institutes',
  'students',
  'documents',
  'enrollments',
  'insurance',
  'payments',
  'reviews',
  'ecards',
  'notifications',
  'auditLogs'
] as const;

export async function repairLegacyIndexes(connection = mongoose.connection): Promise<void> {
  const db = connection.db;
  if (!db) return;
  for (const name of LEGACY_INDEXED_COLLECTIONS) {
    try {
      await db.collection(name).dropIndex('legacySystem_1_legacyId_1');
    } catch {
      // Index may not exist on a fresh database.
    }
    try {
      await db.collection(name).createIndex(
        { legacySystem: 1, legacyId: 1 },
        {
          unique: true,
          name: 'legacySystem_1_legacyId_1',
          partialFilterExpression: { legacyId: { $type: 'string' }, legacySystem: { $type: 'string' } }
        }
      );
    } catch {
      // Collection might not exist yet.
    }
  }
  try {
    await db.collection('knowledgeDocuments').dropIndex('seedKey_1');
  } catch {
    // Recreated as unique sparse below via Mongoose, or may not exist.
  }

  // Phase 13: unique indexes that treated null as a real key blocked multiple notifications per user.
  try {
    await db.collection('notifications').dropIndex('reminderKey_1');
  } catch {
    // Recreated as unique sparse via Notification schema.
  }
  try {
    await db.collection('notifications').dropIndex('userId_1_announcementId_1');
  } catch {
    // Recreated with partialFilterExpression via Notification schema.
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function getDatabaseStatus(): {
  connected: boolean;
  database: string;
  readyState: number;
} {
  return {
    connected: mongoose.connection.readyState === 1,
    database: mongoose.connection.name || env.MONGODB_DB_NAME,
    readyState: mongoose.connection.readyState
  };
}
