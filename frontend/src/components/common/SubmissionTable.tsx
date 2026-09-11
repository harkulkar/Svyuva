import { Link } from 'react-router-dom';
import { ResponsiveTable } from './ResponsiveTable';
import { Pagination } from './Pagination';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';
import type { SubmissionSummary } from '../../types/submission';

export function SubmissionTable({
  rows,
  page,
  totalPages,
  total,
  onPage,
  href
}: {
  rows: SubmissionSummary[];
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
  href: (row: SubmissionSummary) => string;
}) {
  return (
    <>
      <ResponsiveTable
        caption="Submissions"
        columns={[
          { key: 'num', header: 'Submission number', render: (row) => row.submissionNumber },
          { key: 'year', header: 'Academic year', hideOnMobile: true, render: (row) => row.academicYear },
          { key: 'uni', header: 'University', hideOnMobile: true, render: (row) => row.university.name },
          { key: 'inst', header: 'Institute', hideOnMobile: true, render: (row) => row.institute.name },
          { key: 'students', header: 'Students', hideOnMobile: true, render: (row) => row.studentCount.toLocaleString() },
          { key: 'prem', header: 'Premium', hideOnMobile: true, render: (row) => (row.premium == null ? '—' : String(row.premium)) },
          { key: 'status', header: 'Status', render: (row) => <SubmissionStatusBadge status={row.status} /> },
          {
            key: 'at',
            header: 'Submitted at',
            hideOnMobile: true,
            render: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—')
          },
          { key: 'act', header: 'Actions', render: (row) => <Link className="underline" to={href(row)}>Open</Link> }
        ]}
        rows={rows}
        empty="No submissions found."
        href={href}
        cardTitle={(row) => row.submissionNumber}
        cardLines={(row) => [row.academicYear, row.status, `Students: ${row.studentCount}`]}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPage={onPage} />
    </>
  );
}
