import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { Document } from '../models/Document.js';

async function listLocalFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(full.slice(root.length + 1).replace(/\\/g, '/'));
    }
  }
  await walk(root);
  return out;
}

async function main(): Promise<void> {
  const destructive = process.env.CONFIRM_DESTRUCTIVE_OPERATION === 'true';
  await connectDatabase();
  const docs = await Document.find().select('storageKey legacyPath fileStatus originalFilename').lean();
  const keys = new Set(docs.map((row) => row.storageKey).filter((value): value is string => Boolean(value)));
  const missingFiles = docs.filter((row) => !row.storageKey || row.fileStatus === 'NOT_AVAILABLE_IN_LEGACY_SOURCE' || row.fileStatus === 'FILE_MIGRATION_FAILED');
  let orphanFiles: string[] = [];
  let localScanned = 0;
  if (env.STORAGE_SOURCE) {
    const files = await listLocalFiles(env.STORAGE_SOURCE);
    localScanned = files.length;
    orphanFiles = files.filter((file) => !keys.has(file));
  }
  const report = {
    mode: 'read-only',
    destructiveRequested: destructive,
    destructiveExecuted: false,
    storageConfigured: Boolean(env.STORAGE_BUCKET && env.STORAGE_ENDPOINT),
    httpApi: 'not_implemented',
    validFiles: docs.length - missingFiles.length,
    orphanFiles: orphanFiles.length,
    orphanFileSamples: orphanFiles.slice(0, 20),
    missingFiles: missingFiles.length,
    missingFileSamples: missingFiles.slice(0, 20).map((row) => ({
      id: String(row._id),
      fileStatus: row.fileStatus
    })),
    localFilesScanned: localScanned,
    failedChecks: env.STORAGE_SOURCE ? 0 : ['STORAGE_SOURCE not set; object listing skipped'],
    note: 'Orphan files were not deleted. Review this report before any cleanup.'
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
