import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(backendDir, '..');

let cached: string | null = null;

export function getAppVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim();
  if (fromEnv) return fromEnv;
  if (cached) return cached;
  try {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as { version?: string };
    cached = pkg.version?.trim() || '0.0.0';
  } catch {
    cached = '0.0.0';
  }
  return cached;
}
