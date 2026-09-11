import type { UserRole } from '../types/auth';

export function requiredPasswordResetPath(user: { role: UserRole; passwordResetRequired?: boolean }): string | null {
  if (!user.passwordResetRequired) return null;
  return user.role === 'ADMIN' ? '/admin/profile' : '/college/profile';
}
