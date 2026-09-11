import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { PageError } from '../../components/common/PageState';
import { SubmissionTable } from '../../components/common/SubmissionTable';
import { DebouncedSearchField } from '../../components/common/SearchField';
import { createCollegeSubmission, fetchCollegeSubmissionMeta, fetchCollegeSubmissions, getApiErrorMessage } from '../../services/api';
import type { SubmissionMeta, SubmissionSummary } from '../../types/submission';
import type { PagedList } from '../../types/auth';

export function CollegeSubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PagedList<SubmissionSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const academicYear = params.get('academicYear') || '';
  const status = params.get('status') || '';

  useEffect(() => {
    setError(null);
    void fetchCollegeSubmissions({ page, limit: 20, q: q || undefined, academicYear: academicYear || undefined, status: status || undefined })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [page, q, academicYear, status]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    if (!next.page) merged.set('page', '1');
    setParams(merged);
  }

  return (
    <>
      <Seo title="My submissions" path="/college/submissions" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy">My submissions</h1>
        <Link to="/college/submissions/new" className="min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white">
          New submission
        </Link>
      </div>
      <div className="mt-4">
        <DebouncedSearchField value={q} onDebouncedChange={(next) => update({ q: next })} label="Search submission number" />
      </div>
      <form
        className="mt-3 flex flex-wrap gap-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update({ academicYear: String(form.get('academicYear') || ''), status: String(form.get('status') || '') });
        }}
      >
        <label>
          Academic year
          <input name="academicYear" defaultValue={academicYear} className="ml-2 border px-2 py-2" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status} className="ml-2 border px-2 py-2">
            <option value="">All</option>
            {['DRAFT', 'VALIDATED', 'PREMIUM_CALCULATED', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'].map((item) => (
              <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 border border-navy px-3 text-navy">Apply</button>
      </form>
      {error ? <PageError message={error} /> : null}
      {data ? (
        <SubmissionTable
          rows={data.items}
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPage={(next) => update({ page: String(next) })}
          href={(row) => `/college/submissions/${row.id}`}
        />
      ) : null}
    </>
  );
}

export function CollegeNewSubmissionPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SubmissionMeta | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchCollegeSubmissionMeta()
      .then((data) => {
        setMeta(data);
        setAcademicYear(data.academicYears.current);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createCollegeSubmission(academicYear);
      navigate(`/college/submissions/${created.id}/upload`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="New submission" path="/college/submissions/new" />
      <p className="text-sm"><Link to="/college/submissions" className="underline">My submissions</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">New submission</h1>
      {error ? <PageError message={error} /> : null}
      {meta ? (
        <form className="mt-4 max-w-xl space-y-4 border border-slate-300 bg-white p-4 text-sm" onSubmit={onSubmit}>
          <p><span className="text-slate-500">Institute</span> {meta.institute.name}</p>
          <p><span className="text-slate-500">University</span> {meta.university.name}</p>
          <label className="block">
            Academic year
            <select className="mt-1 min-h-11 w-full border px-2" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} required>
              {meta.academicYears.options.map((year) => (
                <option key={year.value} value={year.value}>{year.label} ({year.value})</option>
              ))}
            </select>
          </label>
          <p className="text-slate-600">{meta.academicYears.note}</p>
          <ol className="list-decimal space-y-1 pl-5 text-slate-700">
            <li>Download the Excel template and complete student rows.</li>
            <li>Upload and validate. Invalid rows are listed; they are not ignored.</li>
            <li>Confirm student data, calculate premium on the server, then review and submit.</li>
            <li>Uploading Excel does not submit the data to administration.</li>
          </ol>
          <p className="text-xs text-slate-500">{meta.excelNote}</p>
          <button type="submit" disabled={busy} className="min-h-11 bg-navy px-4 py-2 font-semibold text-white disabled:opacity-50">
            Create draft
          </button>
        </form>
      ) : null}
    </>
  );
}
