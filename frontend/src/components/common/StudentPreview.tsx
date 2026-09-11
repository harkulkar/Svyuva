import { Pagination } from './Pagination';
import { ResponsiveTable } from './ResponsiveTable';
import type { PreviewRow } from '../../types/submission';

export function StudentPreview({
  rows,
  page,
  totalPages,
  total,
  onPage,
  q,
  onSearch,
  validity,
  onValidity
}: {
  rows: PreviewRow[];
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
  q: string;
  onSearch: (value: string) => void;
  validity: string;
  onValidity: (value: string) => void;
}) {
  return (
    <section className="mt-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Search
          <input className="ml-2 min-h-11 border px-2" value={q} onChange={(event) => onSearch(event.target.value)} />
        </label>
        <label className="text-sm">
          Filter
          <select className="ml-2 min-h-11 border px-2" value={validity} onChange={(event) => onValidity(event.target.value)}>
            <option value="all">All</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>
        </label>
      </div>
      <ResponsiveTable
        caption="Student preview"
        columns={[
          { key: 'id', header: 'Student ID', render: (row) => row.studentId },
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'course', header: 'Course', hideOnMobile: true, render: (row) => row.course },
          { key: 'year', header: 'Academic year', hideOnMobile: true, render: (row) => row.academicYear },
          { key: 'ok', header: 'Status', render: (row) => (row.valid ? 'Valid' : 'Invalid') }
        ]}
        rows={rows.map((row, index) => ({ ...row, id: row.id || `${row.studentId}-${index}` }))}
        empty="No rows on this page."
        cardTitle={(row) => row.name || row.studentId}
        cardLines={(row) => [row.studentId, row.course, row.valid ? 'Valid' : row.message || 'Invalid']}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPage={onPage} />
    </section>
  );
}
