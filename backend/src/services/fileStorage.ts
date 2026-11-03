import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KEY_PATTERN = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

/** Private directory outside the web root. Override with DOCUMENT_STORAGE_DIR (absolute path). */
export function documentStorageRoot(): string {
  return path.resolve(env.DOCUMENT_STORAGE_DIR || path.join(backendDir, 'storage', 'documents'));
}

export function resolveStorageKey(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key.');
  const root = documentStorageRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid storage key.');
  return full;
}

export async function saveDocumentFile(buffer: Buffer, ext: string, now = new Date()): Promise<string> {
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
  const full = resolveStorageKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer, { flag: 'wx', mode: 0o640 });
  return key;
}

export async function openDocumentFile(key: string): Promise<{ stream: ReadStream; size: number }> {
  const full = resolveStorageKey(key);
  const info = await stat(full);
  return { stream: createReadStream(full), size: info.size };
}
