import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SubmissionSummary } from './SubmissionSummary';
import { ValidationSummary } from './ValidationSummary';
import { PremiumBreakdown } from './PremiumBreakdown';
import { SubmissionTimeline } from './SubmissionTimeline';
import type { SubmissionDetail } from '../../types/submission';

export function SubmissionReview({
  submission,
  children
}: {
  submission: SubmissionDetail;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <SubmissionSummary item={submission} />
      <ValidationSummary
        totalRows={submission.validation.totalRows}
        valid={submission.validation.validRows}
        invalid={submission.validation.invalidRows}
        duplicates={submission.validation.duplicateRows}
      />
      <p className="text-sm">
        Uploaded Excel: {submission.uploadedFile?.originalFilename || '—'}
        {submission.uploadedFile?.sizeBytes != null ? ` (${submission.uploadedFile.sizeBytes} bytes)` : ''}
      </p>
      <PremiumBreakdown premium={submission.premium} />
      {submission.documents.length ? (
        <ul className="text-sm">
          {submission.documents.map((doc) => (
            <li key={doc.id}>{doc.documentType}: {doc.originalFilename}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm">
        <Link className="underline" to={`/college/submissions/${submission.id}/preview`}>Student preview</Link>
      </p>
      <section className="border border-slate-300 bg-white p-4">
        <h2 className="text-sm font-semibold text-navy">Timeline</h2>
        <div className="mt-3">
          <SubmissionTimeline items={submission.timeline} />
        </div>
      </section>
      {children}
    </div>
  );
}
