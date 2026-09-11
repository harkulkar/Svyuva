import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const knowledgeDir = path.join(backendDir, 'storage', 'knowledge');

export function checksumBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function saveKnowledgeFile(id: string, originalName: string, buffer: Buffer): Promise<string> {
  await mkdir(knowledgeDir, { recursive: true });
  const ext = path.extname(originalName).slice(0, 8) || '.bin';
  const filename = `${id}${ext}`;
  await writeFile(path.join(knowledgeDir, filename), buffer);
  return filename;
}

export async function readKnowledgeFile(fileReference: string): Promise<Buffer> {
  return readFile(path.join(knowledgeDir, fileReference));
}

export async function deleteKnowledgeFile(fileReference: string): Promise<void> {
  if (!fileReference) return;
  try {
    await unlink(path.join(knowledgeDir, fileReference));
  } catch {
    // missing file is acceptable
  }
}

export function knowledgeStorageConfigured(): boolean {
  return Boolean(env.STORAGE_BUCKET && env.STORAGE_ENDPOINT) || true;
}
