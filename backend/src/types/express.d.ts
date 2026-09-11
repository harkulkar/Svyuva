import type { AuthUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
