import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { MigrationConfig } from './config.js';
import { migrationLog } from './log.js';

export type StorageInventoryItem = {
  relativePath: string;
  sizeBytes: number;
  sha256: string | null;
  status: 'INVENTORIED' | 'COPIED' | 'VERIFIED' | 'FILE_MIGRATION_FAILED';
  reason?: string;
};

async function walk(dir: string, base = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
}

export async function runStorageMigration(config: MigrationConfig): Promise<{
  inventoried: number;
  copied: number;
  verified: number;
  failed: number;
  items: StorageInventoryItem[];
}> {
  const items: StorageInventoryItem[] = [];
  if (!config.storageSource) {
    console.info('STORAGE_SOURCE is empty. NOT_AVAILABLE_IN_LEGACY_SOURCE.');
    return { inventoried: 0, copied: 0, verified: 0, failed: 0, items };
  }
  try {
    await fs.access(config.storageSource);
  } catch {
    console.info(`STORAGE_SOURCE does not exist: ${config.storageSource}`);
    return { inventoried: 0, copied: 0, verified: 0, failed: 0, items };
  }

  const files = await walk(config.storageSource);
  let copied = 0;
  let verified = 0;
  let failed = 0;
  for (const relativePath of files) {
    const sourcePath = path.join(config.storageSource, relativePath);
    try {
      const stat = await fs.stat(sourcePath);
      const checksum = await sha256File(sourcePath);
      const item: StorageInventoryItem = {
        relativePath,
        sizeBytes: stat.size,
        sha256: checksum,
        status: 'INVENTORIED'
      };
      if (!config.dryRun) {
        if (!config.storageDestination) {
          item.status = 'FILE_MIGRATION_FAILED';
          item.reason = 'STORAGE_DESTINATION is not set';
          failed += 1;
          items.push(item);
          continue;
        }
        const dest = path.join(config.storageDestination, relativePath);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(sourcePath, dest);
        item.status = 'COPIED';
        copied += 1;
        const destHash = await sha256File(dest);
        if (destHash !== checksum) {
          item.status = 'FILE_MIGRATION_FAILED';
          item.reason = 'Checksum mismatch after copy';
          failed += 1;
        } else {
          item.status = 'VERIFIED';
          verified += 1;
        }
      }
      items.push(item);
      migrationLog({
        entity: 'document',
        legacyId: relativePath,
        action: config.dryRun ? 'INVENTORY' : 'COPY',
        result: item.status
      });
    } catch (error) {
      failed += 1;
      items.push({
        relativePath,
        sizeBytes: 0,
        sha256: null,
        status: 'FILE_MIGRATION_FAILED',
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  console.info(`Storage inventory: ${files.length}; copied: ${copied}; verified: ${verified}; failed: ${failed}; dryRun=${config.dryRun}`);
  return { inventoried: files.length, copied, verified, failed, items };
}
