import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

async function newestInDir(dir: string): Promise<{ name: string; mtime: string; sizeBytes: number } | null> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  let best: { name: string; mtime: string; sizeBytes: number } | null = null;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(dir, entry.name);
    const info = await stat(full);
    const item = { name: entry.name, mtime: info.mtime.toISOString(), sizeBytes: info.size };
    if (!best || item.mtime > best.mtime) best = item;
  }
  return best;
}

async function main(): Promise<void> {
  const dir = env.BACKUP_VERIFY_DIR;
  if (!dir) {
    console.log(JSON.stringify({
      status: 'NOT_CONFIGURED',
      backupExists: false,
      backupTimestamp: null,
      backupSizeBytes: null,
      integrity: 'NOT_SUPPORTED',
      lastRestoreTest: 'NOT_EXECUTED',
      restoreResult: 'NOT_EXECUTED',
      issues: ['BACKUP_VERIFY_DIR is not set. Atlas API verification is TODO: CONFIGURE.'],
      note: 'A backup is not valid until a restore test has been performed. Historical backups were not deleted.'
    }, null, 2));
    process.exit(2);
    return;
  }
  const newest = await newestInDir(dir);
  const report = {
    status: newest ? 'OK' : 'FAILED',
    backupExists: Boolean(newest),
    backupTimestamp: newest?.mtime ?? null,
    backupSizeBytes: newest?.sizeBytes ?? null,
    integrity: 'SIZE_ONLY',
    lastRestoreTest: 'NOT_EXECUTED',
    restoreResult: 'NOT_EXECUTED',
    issues: newest ? [] : ['No backup files found in BACKUP_VERIFY_DIR'],
    note: 'File presence check only. Restore drill remains NOT_EXECUTED until an operator records it. Historical backups were not deleted.'
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(newest ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    status: 'FAILED',
    message: error instanceof Error ? error.message : 'Unknown error'
  }));
  process.exit(1);
});
