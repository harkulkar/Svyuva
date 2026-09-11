import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction, isTest } from '../config/env.js';
import { parseDurationToMs } from './jwt.js';

export const ACCESS_COOKIE = 'svysy_access';
export const REFRESH_COOKIE = 'svysy_refresh';

function authCookieFlags(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite'> {
  const automated = isTest || Boolean(process.env.NODE_TEST_CONTEXT);
  const sameSite = automated ? 'lax' : env.COOKIE_SAMESITE ?? (isProduction ? 'strict' : 'none');
  return {
    httpOnly: true,
    secure: automated ? false : isProduction || sameSite === 'none',
    sameSite
  };
}

function cookieOptions(maxAgeMs: number | undefined, path = '/'): CookieOptions {
  const options: CookieOptions = {
    ...authCookieFlags(),
    path
  };
  if (maxAgeMs !== undefined) {
    options.maxAge = maxAgeMs;
  }
  return options;
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string, persistent = false): void {
  const accessMaxAge = persistent ? parseDurationToMs(env.JWT_ACCESS_EXPIRES_IN) : undefined;
  const refreshMaxAge = persistent ? parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN) : undefined;
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge, '/api/auth'));
}

export function clearAuthCookies(res: Response): void {
  const base: CookieOptions = {
    ...authCookieFlags(),
    path: '/'
  };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/auth' });
}

export function readAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const cookie = req.cookies?.[ACCESS_COOKIE];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : undefined;
}

export function readRefreshToken(req: Request): string | undefined {
  const cookie = req.cookies?.[REFRESH_COOKIE];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : undefined;
}
