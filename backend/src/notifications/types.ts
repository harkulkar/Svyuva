export const NOTIFICATION_TYPES = [
  'ACCOUNT_APPROVED',
  'ACCOUNT_REJECTED',
  'STUDENT_UPLOAD_COMPLETED',
  'STUDENT_UPLOAD_FAILED',
  'DOCUMENT_REQUIRED',
  'DOCUMENT_REJECTED',
  'DOCUMENT_APPROVED',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'INSURANCE_SUBMITTED',
  'INSURANCE_APPROVED',
  'INSURANCE_REJECTED',
  'ECARD_GENERATED',
  'REVIEW_REQUIRED',
  'SUBMISSION_RECEIVED',
  'SUBMISSION_APPROVED',
  'SUBMISSION_REJECTED',
  'SUBMISSION_CORRECTION_REQUIRED',
  'SYSTEM_ALERT',
  'ANNOUNCEMENT',
  'REMINDER'
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const CRITICAL_NOTIFICATION_TYPES = new Set<NotificationType>([
  'ACCOUNT_APPROVED',
  'ACCOUNT_REJECTED',
  'SYSTEM_ALERT'
]);

export const TEMPLATE_VARIABLES = [
  'instituteName',
  'studentName',
  'applicationId',
  'status',
  'actionUrl',
  'universityName',
  'recipientName',
  'count',
  'reminderType'
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const ANNOUNCEMENT_AUDIENCES = ['ALL', 'ROLE', 'UNIVERSITY', 'INSTITUTES', 'USERS'] as const;
export type AnnouncementAudienceType = (typeof ANNOUNCEMENT_AUDIENCES)[number];
