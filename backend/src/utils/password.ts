import bcrypt from 'bcryptjs';

const ROUNDS = 12;

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function isStrongPassword(password: string): boolean {
  return PASSWORD_PATTERN.test(password);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
