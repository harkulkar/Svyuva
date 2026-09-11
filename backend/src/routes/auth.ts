import { Router } from 'express';
import {
  changePasswordHandler,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  resetPassword,
  signup,
  universities
} from '../controllers/authController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { changePasswordLimiter, forgotPasswordLimiter, loginLimiter, refreshLimiter, resetPasswordLimiter, signupLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from '../validators/authValidators.js';
import { changePasswordSchema } from '../validators/adminValidators.js';

export const authRouter = Router();

authRouter.get('/universities', universities);
authRouter.post('/login', loginLimiter, validateBody(loginSchema), login);
authRouter.post('/logout', optionalAuthenticate, logout);
authRouter.get('/me', authenticate, me);
authRouter.post('/signup', signupLimiter, validateBody(signupSchema), signup);
authRouter.post('/forgot-password', forgotPasswordLimiter, validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', resetPasswordLimiter, validateBody(resetPasswordSchema), resetPassword);
authRouter.post('/refresh', refreshLimiter, refresh);
authRouter.post('/change-password', authenticate, changePasswordLimiter, validateBody(changePasswordSchema), changePasswordHandler);
