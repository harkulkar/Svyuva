import { Link } from 'react-router-dom';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';
import type { SubmissionDetail, SubmissionSummary } from '../../types/submission';

export function SubmissionSummary({
  item,
  href
}: {
  item: SubmissionSummary | SubmissionDetail;
  href?: string;
}) {
  const body = (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p><span className="text-slate-500">Submission</span> {item.submissionNumber}</p>
      <p><span className="text-slate-500">Academic year</span> {item.academicYear}</p>
      <p><span className="text-slate-500">Institute</span> {item.institute.name}</p>
      <p><span className="text-slate-500">University</span> {item.university.name}</p>
      <p><span className="text-slate-500">Students</span> {item.studentCount.toLocaleString()}</p>
      <p><span className="text-slate-500">Premium</span> {item.premium == null ? '—' : `${item.currency} ${item.premium.toLocaleString()}`}</p>
      <p className="sm:col-span-2"><SubmissionStatusBadge status={item.status} /></p>
      {item.submittedAt ? <p className="sm:col-span-2 text-slate-600">Submitted on: {new Date(item.submittedAt).toLocaleString()}</p> : null}
      {item.locked ? <p className="sm:col-span-2 font-medium text-navy">Submitted — this record is read-only for the college.</p> : null}
    </div>
  );
  return (
    <section className="border border-slate-300 bg-white p-4">
      {href ? <Link to={href} className="block">{body}</Link> : body}
    </section>
  );
}
