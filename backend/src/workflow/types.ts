export const WORKFLOW_TYPES = [
  'INSTITUTE_REGISTRATION',
  'STUDENT_UPLOAD',
  'DOCUMENT_REVIEW',
  'INSURANCE_ENROLLMENT',
  'PAYMENT_VERIFICATION',
  'APPLICATION_REVIEW',
  'ECARD_ISSUANCE'
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const WORKFLOW_ACTIONS = [
  'SUBMIT',
  'START_REVIEW',
  'APPROVE',
  'REJECT',
  'REQUEST_CORRECTION',
  'RESUBMIT',
  'VERIFY',
  'CANCEL',
  'COMPLETE',
  'ASSIGN'
] as const;
export type WorkflowActionName = (typeof WORKFLOW_ACTIONS)[number];

export const TASK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type WorkflowPriority = (typeof PRIORITIES)[number];

export const DOCUMENT_REVIEW_STATUSES = [
  'NOT_STARTED',
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
  'REPLACEMENT_REQUIRED'
] as const;
export type DocumentReviewStatus = (typeof DOCUMENT_REVIEW_STATUSES)[number];

export const OPEN_WORKFLOW_STATES = [
  'PENDING',
  'UNDER_REVIEW',
  'CORRECTION_REQUESTED',
  'SUBMITTED',
  'VALIDATING',
  'VALIDATION_COMPLETE',
  'IMPORTING',
  'OPEN'
] as const;
