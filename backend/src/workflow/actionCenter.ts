import { Document } from '../models/Document.js';
import { Institute } from '../models/Institute.js';
import { Payment } from '../models/Payment.js';
import { Student } from '../models/Student.js';
import { UploadJob } from '../models/UploadJob.js';
import { WorkflowInstance } from '../models/WorkflowInstance.js';
import { requireCollegeInstituteId } from '../services/instituteService.js';
import type { AuthUser } from '../types/auth.js';

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: string;
};

export async function getCollegeActionCenter(user: AuthUser) {
  const instituteId = requireCollegeInstituteId(user);
  const institute = await Institute.findById(instituteId).select('status correctionReason principalName');
  const items: ActionItem[] = [];

  if (institute?.status === 'PENDING') {
    const wf = await WorkflowInstance.findOne({
      workflowType: 'INSTITUTE_REGISTRATION',
      entityId: instituteId
    }).select('currentState metadata');
    if (wf?.currentState === 'CORRECTION_REQUESTED' || institute.correctionReason) {
      items.push({
        id: 'resubmit-registration',
        title: 'Resubmit institute registration',
        detail: String(institute.correctionReason || (wf?.metadata as { correctionReason?: string })?.correctionReason || 'An administrator requested corrections.'),
        href: '/college/profile',
        kind: 'registration'
      });
    } else {
      items.push({
        id: 'awaiting-approval',
        title: 'Registration awaiting review',
        detail: 'Your institute registration is pending administrator review.',
        href: '/college/profile',
        kind: 'registration'
      });
    }
  }

  if (!institute?.principalName) {
    items.push({
      id: 'complete-profile',
      title: 'Complete profile',
      detail: 'Principal name is required on your institute profile.',
      href: '/college/profile',
      kind: 'profile'
    });
  }

  const [rejectedDocs, students, pendingPay, lastUpload] = await Promise.all([
    Document.countDocuments({
      instituteId,
      isCurrent: { $ne: false },
      reviewStatus: { $in: ['REJECTED', 'REPLACEMENT_REQUIRED'] }
    }),
    Student.countDocuments({ instituteId }),
    Payment.countDocuments({ instituteId, status: { $regex: /pending|verification/i } }),
    UploadJob.findOne({ instituteId }).sort({ createdAt: -1 }).select('imported invalidCount')
  ]);

  if (rejectedDocs > 0) {
    items.push({
      id: 'replace-documents',
      title: 'Replace rejected document',
      detail: `${rejectedDocs} document(s) need replacement or review.`,
      href: '/college/documents',
      kind: 'document'
    });
  }

  if (institute?.status === 'ACTIVE' && students === 0) {
    items.push({
      id: 'student-upload',
      title: 'Complete student data upload',
      detail: 'No students are recorded for your institute yet.',
      href: '/college/students/upload',
      kind: 'students'
    });
  }

  if (lastUpload && !lastUpload.imported && (lastUpload.invalidCount || 0) > 0) {
    items.push({
      id: 'excel-errors',
      title: 'Review Excel validation errors',
      detail: 'The last student spreadsheet has rows that were not imported.',
      href: '/college/students/upload',
      kind: 'students'
    });
  }

  if (pendingPay > 0) {
    items.push({
      id: 'payment-pending',
      title: 'Complete payment step',
      detail: `${pendingPay} payment record(s) still show a pending or verification status.`,
      href: '/college/payment-status',
      kind: 'payment'
    });
  }

  const insuranceOpen = await WorkflowInstance.countDocuments({
    workflowType: 'INSURANCE_ENROLLMENT',
    instituteId,
    currentState: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED'] }
  });
  if (insuranceOpen > 0) {
    items.push({
      id: 'insurance-pending',
      title: 'Review pending insurance application',
      detail: `${insuranceOpen} insurance workflow(s) still need attention.`,
      href: '/college/insurance',
      kind: 'insurance'
    });
  }

  return {
    count: items.length,
    headline: items.length === 1 ? '1 action requires your attention' : `${items.length} actions require your attention`,
    items
  };
}
