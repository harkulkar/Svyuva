import rateLimit from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

function skipAutomated(): boolean {
  return Boolean(process.env.NODE_TEST_CONTEXT);
}

function makeLimiter(max: number, windowMs = 15 * 60 * 1000, skipHealth = false) {
  return rateLimit({
    windowMs,
    max,
    skip: (req) => skipAutomated() || (skipHealth && (req.path === '/health' || req.path.startsWith('/health/'))),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(fail('Too many attempts. Please try again later.', 'RATE_LIMITED'));
    }
  });
}

export const apiLimiter = makeLimiter(600, 15 * 60 * 1000, true);
export const loginLimiter = makeLimiter(20);
export const signupLimiter = makeLimiter(10);
export const forgotPasswordLimiter = makeLimiter(8);
export const resetPasswordLimiter = makeLimiter(8);
export const refreshLimiter = makeLimiter(30);
export const changePasswordLimiter = makeLimiter(10);
export const uploadLimiter = makeLimiter(20);
export const exportLimiter = makeLimiter(20);
export const searchLimiter = makeLimiter(60);
export const notificationLimiter = makeLimiter(120);
