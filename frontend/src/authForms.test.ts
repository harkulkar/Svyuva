import { describe, expect, it } from 'vitest';
import { loginFormSchema } from './pages/auth/loginSchema';
import { requiredPasswordResetPath } from './utils/authGuards';

describe('login form validation', () => {
  it('accepts a valid email and password', () => {
    const parsed = loginFormSchema.safeParse({ email: 'college@example.in', password: 'secret', rememberMe: false });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty password and invalid email', () => {
    expect(loginFormSchema.safeParse({ email: '', password: 'x' }).success).toBe(false);
    expect(loginFormSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginFormSchema.safeParse({ email: 'college@example.in', password: '' }).success).toBe(false);
  });
});

describe('password reset required routing', () => {
  it('sends college and admin users to their profile pages', () => {
    expect(requiredPasswordResetPath({ role: 'COLLEGE', passwordResetRequired: true })).toBe('/college/profile');
    expect(requiredPasswordResetPath({ role: 'ADMIN', passwordResetRequired: true })).toBe('/admin/profile');
    expect(requiredPasswordResetPath({ role: 'COLLEGE', passwordResetRequired: false })).toBeNull();
  });
});
