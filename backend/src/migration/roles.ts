import type { UserRole } from '../types/roles.js';

const ADMIN_ALIASES = new Set(['admin', 'administrator', 'superadmin', 'super_admin', 'dheadmin', 'dhe']);
const COLLEGE_ALIASES = new Set([
  'college',
  'institute',
  'instituteuser',
  'collegeuser',
  'principal',
  'collegeadmin',
  'instituteadmin'
]);

export type RoleMapResult =
  | { ok: true; role: UserRole; warning?: string }
  | { ok: false; reason: string };

export function mapLegacyRole(raw: string | undefined): RoleMapResult {
  if (!raw) {
    return { ok: false, reason: 'MIGRATION_REVIEW_REQUIRED: legacy role is missing' };
  }
  const normalized = raw.trim().toLowerCase().replace(/[\s-]/g, '');
  if (ADMIN_ALIASES.has(normalized)) {
    return { ok: true, role: 'ADMIN' };
  }
  if (COLLEGE_ALIASES.has(normalized) || normalized === 'user') {
    const warning =
      normalized === 'user' ? 'MIGRATION_REVIEW_REQUIRED: generic role "user" mapped to COLLEGE' : undefined;
    return { ok: true, role: 'COLLEGE', warning };
  }
  if (normalized === 'admin' || normalized === 'college') {
    return { ok: true, role: normalized.toUpperCase() as UserRole };
  }
  return { ok: false, reason: `MIGRATION_REVIEW_REQUIRED: unsupported legacy role "${raw}"` };
}
