import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../utils/apiResponse.js';
import { clearAuthCookies, readRefreshToken, setAuthCookies } from '../utils/cookies.js';
import {
  changePassword,
  listUniversities,
  loginWithPassword,
  logoutSession,
  refreshSession,
  registerCollege,
  requestPasswordReset,
  resetPasswordWithToken
} from '../services/authService.js';
import type { LoginInput, SignupInput } from '../validators/authValidators.js';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as LoginInput;
    const result = await loginWithPassword(body, req);
    setAuthCookies(res, result.accessToken, result.refreshToken, result.persistent);
    res.json(ok({ user: result.user }, 'Login successful'));
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await logoutSession(readRefreshToken(req), req, req.authUser?.id);
    clearAuthCookies(res);
    res.json(ok(null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json(ok({ user: req.authUser }, 'OK'));
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await registerCollege(req.body as SignupInput, req);
    res.status(201).json(
      ok(
        { user },
        'Registration submitted successfully. Your account is pending approval.'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requestPasswordReset(req.body.email as string, req);
    res.json(ok(null, 'If an account exists for this email, a reset link has been sent.'));
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await resetPasswordWithToken(req.body.token as string, req.body.password as string, req);
    res.json(ok(null, 'Password updated successfully. You can now log in.'));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await refreshSession(readRefreshToken(req));
    setAuthCookies(res, result.accessToken, result.refreshToken, result.persistent);
    res.json(ok({ user: result.user }, 'Session refreshed'));
  } catch (error) {
    next(error);
  }
}

export async function universities(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await listUniversities();
    res.json(ok({ universities: items }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) {
      res.status(401).json(fail('Authentication required.', 'UNAUTHORIZED', req.requestId));
      return;
    }
    const session = await changePassword(req.authUser.id, req.body, req);
    setAuthCookies(res, session.accessToken, session.refreshToken, session.persistent);
    res.json(ok(null, 'Password updated successfully.'));
  } catch (error) {
    next(error);
  }
}
