import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../types/roles.js';

export type AccessTokenPayload = {
  userId: string;
  role: UserRole;
  iat?: number;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    subject: payload.userId
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.userId || !decoded.role) {
    throw new Error('Invalid token payload');
  }
  return {
    userId: String(decoded.userId),
    role: decoded.role as UserRole,
    iat: typeof decoded.iat === 'number' ? decoded.iat : undefined
  };
}

export function createRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}

export function createPasswordResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return { token, tokenHash: hashToken(token), expiresAt };
}

export function parseDurationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit ?? 'd'] ?? 86_400_000);
}
