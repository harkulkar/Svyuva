import { notifyAdmins, notifyInstituteUsers } from '../notifications/notification.service.js';
import type { NotificationType } from '../notifications/types.js';
import type { AuthUser } from '../types/auth.js';
import type { WorkflowActionName, WorkflowType } from './types.js';

export async function notifyWorkflowChange(params: {
  type: WorkflowType;
  action: WorkflowActionName;
  toState: string;
  instance: { entityId: string; instituteId?: { toString(): string } | null };
  user: AuthUser;
  reason?: string;
}) {
  const instituteId = params.instance.instituteId ? String(params.instance.instituteId) : params.instance.entityId;
  const reminderKey = `wf:${params.type}:${params.instance.entityId}:${params.action}:${params.toState}`;

  if (params.type === 'INSTITUTE_REGISTRATION') {
    if (params.action === 'APPROVE') return;
    if (params.action === 'REJECT') return;
    if (params.action === 'REQUEST_CORRECTION' || params.action === 'START_REVIEW') {
      await notifyInstituteUsers(instituteId, {
        type: 'REVIEW_REQUIRED',
        title: params.action === 'REQUEST_CORRECTION' ? 'Registration correction requested' : 'Registration is under review',
        message:
          params.action === 'REQUEST_CORRECTION'
            ? 'Please review the comments and resubmit your institute registration.'
            : 'An administrator started reviewing your institute registration.',
        relatedEntityType: 'Institute',
        relatedEntityId: params.instance.entityId,
        actionUrl: '/college/profile',
        reminderKey,
        vars: { status: params.toState, instituteName: '' }
      });
    }
    if (params.action === 'RESUBMIT') {
      await notifyAdmins({
        type: 'REVIEW_REQUIRED',
        title: 'Institute registration resubmitted',
        message: 'A college resubmitted a registration after a correction request.',
        relatedEntityType: 'Institute',
        relatedEntityId: params.instance.entityId,
        actionUrl: `/admin/registrations/${params.instance.entityId}`,
        reminderKey,
        vars: { status: params.toState }
      });
    }
    return;
  }

  const typeMap: Partial<Record<WorkflowActionName, NotificationType>> = {
    VERIFY: params.type === 'PAYMENT_VERIFICATION' ? 'PAYMENT_VERIFIED' : 'DOCUMENT_APPROVED',
    REJECT: params.type === 'DOCUMENT_REVIEW' ? 'DOCUMENT_REJECTED' : params.type === 'INSURANCE_ENROLLMENT' ? 'INSURANCE_REJECTED' : 'PAYMENT_REJECTED',
    APPROVE: params.type === 'INSURANCE_ENROLLMENT' ? 'INSURANCE_APPROVED' : 'DOCUMENT_APPROVED',
    SUBMIT: params.type === 'INSURANCE_ENROLLMENT' ? 'INSURANCE_SUBMITTED' : 'REVIEW_REQUIRED',
    COMPLETE: params.type === 'ECARD_ISSUANCE' ? 'ECARD_GENERATED' : 'REVIEW_REQUIRED',
    REQUEST_CORRECTION: 'REVIEW_REQUIRED'
  };
  const nType = typeMap[params.action];
  if (!nType || !instituteId) return;
  await notifyInstituteUsers(instituteId, {
    type: nType,
    title: `Workflow update: ${params.action}`,
    message: 'A workflow status changed for a record linked to your institute.',
    relatedEntityType: params.type,
    relatedEntityId: params.instance.entityId,
    actionUrl: '/college',
    reminderKey,
    vars: { status: params.toState }
  });
}
