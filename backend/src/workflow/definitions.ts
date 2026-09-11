import { getFeatureFlags } from '../config/featureFlags.js';
import type { WorkflowActionName, WorkflowType } from './types.js';

export type TransitionRule = {
  action: WorkflowActionName;
  from: string[];
  to: string;
  roles: Array<'ADMIN' | 'COLLEGE' | 'SYSTEM'>;
  reasonRequired?: boolean;
  commentOptional?: boolean;
  featureFlag?: 'insuranceHttpApi' | 'documentHttpApi' | 'paymentHttpApi' | 'reviewHttpApi' | 'ecardHttpApi';
};

const registration: TransitionRule[] = [
  { action: 'SUBMIT', from: [''], to: 'PENDING', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'START_REVIEW', from: ['PENDING'], to: 'UNDER_REVIEW', roles: ['ADMIN'] },
  { action: 'REQUEST_CORRECTION', from: ['PENDING', 'UNDER_REVIEW'], to: 'CORRECTION_REQUESTED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'RESUBMIT', from: ['CORRECTION_REQUESTED'], to: 'PENDING', roles: ['COLLEGE'] },
  { action: 'APPROVE', from: ['PENDING', 'UNDER_REVIEW'], to: 'APPROVED', roles: ['ADMIN'] },
  { action: 'REJECT', from: ['PENDING', 'UNDER_REVIEW'], to: 'REJECTED', roles: ['ADMIN'], reasonRequired: true }
];

const studentUpload: TransitionRule[] = [
  { action: 'SUBMIT', from: [''], to: 'VALIDATING', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'COMPLETE', from: ['VALIDATING'], to: 'VALIDATION_COMPLETE', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'SUBMIT', from: ['VALIDATION_COMPLETE'], to: 'IMPORTING', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'COMPLETE', from: ['IMPORTING'], to: 'COMPLETED', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'REJECT', from: ['VALIDATING', 'VALIDATION_COMPLETE', 'IMPORTING'], to: 'FAILED', roles: ['SYSTEM', 'COLLEGE'] }
];

const documentReview: TransitionRule[] = [
  { action: 'SUBMIT', from: ['', 'NOT_STARTED', 'REPLACEMENT_REQUIRED'], to: 'PENDING_REVIEW', roles: ['COLLEGE', 'SYSTEM'] },
  { action: 'VERIFY', from: ['PENDING_REVIEW'], to: 'VERIFIED', roles: ['ADMIN'] },
  { action: 'REJECT', from: ['PENDING_REVIEW'], to: 'REJECTED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'REQUEST_CORRECTION', from: ['PENDING_REVIEW', 'REJECTED'], to: 'REPLACEMENT_REQUIRED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'RESUBMIT', from: ['REJECTED', 'REPLACEMENT_REQUIRED'], to: 'PENDING_REVIEW', roles: ['COLLEGE'] }
];

const flagged = (
  flag: TransitionRule['featureFlag'],
  rules: TransitionRule[]
): TransitionRule[] => rules.map((rule) => ({ ...rule, featureFlag: flag }));

const insurance: TransitionRule[] = flagged('insuranceHttpApi', [
  { action: 'SUBMIT', from: ['', 'UNKNOWN', 'DRAFT', 'OPEN'], to: 'SUBMITTED', roles: ['COLLEGE'] },
  { action: 'START_REVIEW', from: ['SUBMITTED'], to: 'UNDER_REVIEW', roles: ['ADMIN'] },
  { action: 'APPROVE', from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'APPROVED', roles: ['ADMIN'] },
  { action: 'REJECT', from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'REJECTED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'REQUEST_CORRECTION', from: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'], to: 'CORRECTION_REQUESTED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'RESUBMIT', from: ['CORRECTION_REQUESTED', 'REJECTED'], to: 'SUBMITTED', roles: ['COLLEGE'] },
  { action: 'COMPLETE', from: ['APPROVED'], to: 'COMPLETED', roles: ['ADMIN'] }
]);

const payment: TransitionRule[] = flagged('paymentHttpApi', [
  { action: 'SUBMIT', from: ['', 'UNKNOWN', 'PENDING'], to: 'PENDING', roles: ['SYSTEM', 'COLLEGE'] },
  { action: 'VERIFY', from: ['PENDING'], to: 'VERIFIED', roles: ['ADMIN'] },
  { action: 'REJECT', from: ['PENDING'], to: 'FAILED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'COMPLETE', from: ['VERIFIED'], to: 'COMPLETED', roles: ['ADMIN'] }
]);

const applicationReview: TransitionRule[] = flagged('reviewHttpApi', [
  { action: 'START_REVIEW', from: ['', 'UNKNOWN', 'PENDING'], to: 'UNDER_REVIEW', roles: ['ADMIN'] },
  { action: 'APPROVE', from: ['UNDER_REVIEW', 'PENDING'], to: 'APPROVED', roles: ['ADMIN'] },
  { action: 'REJECT', from: ['UNDER_REVIEW', 'PENDING'], to: 'REJECTED', roles: ['ADMIN'], reasonRequired: true },
  { action: 'REQUEST_CORRECTION', from: ['UNDER_REVIEW', 'PENDING'], to: 'CORRECTION_REQUESTED', roles: ['ADMIN'], reasonRequired: true }
]);

const ecard: TransitionRule[] = flagged('ecardHttpApi', [
  { action: 'COMPLETE', from: ['', 'UNKNOWN', 'PENDING'], to: 'GENERATED', roles: ['ADMIN'] },
  { action: 'CANCEL', from: ['GENERATED'], to: 'CANCELLED', roles: ['ADMIN'] }
]);

export const TRANSITIONS: Record<WorkflowType, TransitionRule[]> = {
  INSTITUTE_REGISTRATION: registration,
  STUDENT_UPLOAD: studentUpload,
  DOCUMENT_REVIEW: documentReview,
  INSURANCE_ENROLLMENT: insurance,
  PAYMENT_VERIFICATION: payment,
  APPLICATION_REVIEW: applicationReview,
  ECARD_ISSUANCE: ecard
};

export function findRule(type: WorkflowType, action: WorkflowActionName, fromState: string): TransitionRule | undefined {
  const current = fromState || '';
  return TRANSITIONS[type].find((rule) => rule.action === action && rule.from.includes(current));
}

export function actionBlockedByFlag(rule: TransitionRule): boolean {
  if (!rule.featureFlag) return false;
  const flags = getFeatureFlags();
  return !flags[rule.featureFlag];
}

export function allowedActionsFor(
  type: WorkflowType,
  fromState: string,
  role: 'ADMIN' | 'COLLEGE' | 'SYSTEM'
): WorkflowActionName[] {
  const current = fromState || '';
  return TRANSITIONS[type]
    .filter((rule) => rule.from.includes(current) && (rule.roles.includes(role) || rule.roles.includes('SYSTEM')) && !actionBlockedByFlag(rule))
    .map((rule) => rule.action);
}

export function entityTypeFor(type: WorkflowType): string {
  switch (type) {
    case 'INSTITUTE_REGISTRATION':
      return 'Institute';
    case 'STUDENT_UPLOAD':
      return 'UploadJob';
    case 'DOCUMENT_REVIEW':
      return 'Document';
    case 'INSURANCE_ENROLLMENT':
      return 'InsuranceEnrollment';
    case 'PAYMENT_VERIFICATION':
      return 'Payment';
    case 'APPLICATION_REVIEW':
      return 'Review';
    case 'ECARD_ISSUANCE':
      return 'ECard';
    default:
      return 'Unknown';
  }
}
