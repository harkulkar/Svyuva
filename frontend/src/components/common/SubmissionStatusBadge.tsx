import type { SubmissionStatus } from '../../types/submission';

const LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  VALIDATING: 'Validating',
  VALIDATED: 'Validated',
  PREMIUM_CALCULATED: 'Premium calculated',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  CORRECTION_REQUIRED: 'Correction required',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus | string }) {
  const tone =
    status === 'APPROVED'
      ? 'bg-indiaGreen text-white'
      : status === 'REJECTED'
        ? 'bg-red-800 text-white'
        : status === 'CORRECTION_REQUIRED'
          ? 'bg-saffron text-navy'
          : status === 'SUBMITTED' || status === 'UNDER_REVIEW'
            ? 'bg-navy text-white'
            : 'bg-slate-200 text-navy';
  return (
    <span className={`inline-flex min-h-8 items-center px-2 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {LABELS[status] || status.replace(/_/g, ' ')}
    </span>
  );
}
