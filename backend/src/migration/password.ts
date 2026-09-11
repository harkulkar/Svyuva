import { randomBytes } from 'node:crypto';
import { hashPassword } from '../utils/password.js';

export type PasswordAlgorithm = 'bcrypt' | 'argon2' | 'md5' | 'sha1' | 'sha256' | 'plaintext' | 'unknown' | 'none';

export type PreparedPassword = {
  passwordHash: string;
  passwordResetRequired: boolean;
  algorithm: PasswordAlgorithm;
};

const BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ARGON2 = /^\$argon2(id|i|d)\$/;
const HEX = /^[a-fA-F0-9]+$/;

export function detectPasswordAlgorithm(value: unknown): PasswordAlgorithm {
  if (value === undefined || value === null) return 'none';
  const raw = String(value).trim();
  if (!raw) return 'none';
  if (BCRYPT.test(raw)) return 'bcrypt';
  if (ARGON2.test(raw)) return 'argon2';
  if (HEX.test(raw) && raw.length === 32) return 'md5';
  if (HEX.test(raw) && raw.length === 40) return 'sha1';
  if (HEX.test(raw) && raw.length === 64) return 'sha256';
  if (raw.length <= 64 && /[a-zA-Z]/.test(raw) && !raw.startsWith('$')) return 'plaintext';
  return 'unknown';
}

export async function unusablePasswordHash(): Promise<string> {
  return hashPassword(`MIGRATE-RESET-${randomBytes(24).toString('hex')}`);
}

export async function prepareMigratedPassword(value: unknown): Promise<PreparedPassword> {
  const algorithm = detectPasswordAlgorithm(value);
  if (algorithm === 'bcrypt') {
    return {
      passwordHash: String(value).trim(),
      passwordResetRequired: false,
      algorithm
    };
  }
  return {
    passwordHash: await unusablePasswordHash(),
    passwordResetRequired: true,
    algorithm
  };
}
