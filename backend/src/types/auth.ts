import type { UserRole, UserStatus } from './roles.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  instituteId?: string;
  universityId?: string;
  lastLoginAt?: string | null;
  passwordResetRequired?: boolean;
};
