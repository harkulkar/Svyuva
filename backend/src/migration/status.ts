import { INSTITUTE_STATUSES, USER_STATUSES } from '../types/roles.js';
import { STUDENT_STATUSES } from '../data/studentMaster.js';

type StatusResult<T extends string> = { status: T; warning?: string } | { status: null; reason: string };

function compact(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '');
}

export function mapUserStatus(raw: string | undefined): StatusResult<(typeof USER_STATUSES)[number]> {
  if (!raw) {
    return { status: 'PENDING', warning: 'Missing user status defaulted to PENDING' };
  }
  const value = compact(raw);
  if (['active', '1', 'approved', 'enabled', 'yes'].includes(value)) return { status: 'ACTIVE' };
  if (['inactive', '0', 'disabled', 'blocked', 'no'].includes(value)) return { status: 'INACTIVE' };
  if (['pending', 'new', 'unapproved'].includes(value)) return { status: 'PENDING' };
  return { status: null, reason: `MIGRATION_REVIEW_REQUIRED: unknown user status "${raw}"` };
}

export function mapInstituteStatus(raw: string | undefined): StatusResult<(typeof INSTITUTE_STATUSES)[number]> {
  if (!raw) {
    return { status: 'PENDING', warning: 'Missing institute status defaulted to PENDING' };
  }
  const value = compact(raw);
  if (['active', '1', 'approved', 'enabled', 'yes'].includes(value)) return { status: 'ACTIVE' };
  if (['inactive', 'disabled', '0'].includes(value)) return { status: 'INACTIVE' };
  if (['pending', 'new', 'unapproved'].includes(value)) return { status: 'PENDING' };
  if (['rejected', 'reject', 'declined'].includes(value)) return { status: 'REJECTED' };
  return { status: null, reason: `MIGRATION_REVIEW_REQUIRED: unknown institute status "${raw}"` };
}

export function mapStudentStatus(raw: string | undefined): StatusResult<(typeof STUDENT_STATUSES)[number]> {
  if (!raw) {
    return { status: 'INACTIVE', warning: 'Missing student status defaulted to INACTIVE pending review' };
  }
  const value = compact(raw);
  if (['active', '1', 'enabled', 'yes'].includes(value)) return { status: 'ACTIVE' };
  if (['inactive', '0', 'disabled', 'no'].includes(value)) return { status: 'INACTIVE' };
  return { status: null, reason: `MIGRATION_REVIEW_REQUIRED: unknown student status "${raw}"` };
}

export function mapInsuranceStatus(raw: string | undefined): { status: string; review: boolean } {
  if (!raw) return { status: 'UNKNOWN', review: true };
  const value = compact(raw);
  const mapped: Record<string, string> = {
    active: 'ACTIVE',
    enrolled: 'ENROLLED',
    pending: 'PENDING',
    expired: 'EXPIRED',
    cancelled: 'CANCELLED',
    canceled: 'CANCELLED',
    claimed: 'CLAIMED',
    inactive: 'INACTIVE'
  };
  const status = mapped[value];
  if (!status) return { status: raw.trim(), review: true };
  return { status, review: false };
}

export function mapPaymentStatus(raw: string | undefined): { status: string; review: boolean } {
  if (!raw) return { status: 'UNKNOWN', review: true };
  const value = compact(raw);
  const mapped: Record<string, string> = {
    success: 'SUCCESS',
    successful: 'SUCCESS',
    paid: 'SUCCESS',
    captured: 'SUCCESS',
    failed: 'FAILED',
    failure: 'FAILED',
    pending: 'PENDING',
    initiated: 'PENDING',
    refunded: 'REFUNDED',
    cancelled: 'CANCELLED',
    canceled: 'CANCELLED'
  };
  const status = mapped[value];
  if (!status) return { status: raw.trim(), review: true };
  return { status, review: false };
}
