import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { PageError } from '../../components/common/PageState';
import { StatCard } from '../../components/common/StatCard';
import { SubmissionTable } from '../../components/common/SubmissionTable';
import { SubmissionSummary } from '../../components/common/SubmissionSummary';
import { PremiumBreakdown } from '../../components/common/PremiumBreakdown';
import { StudentPreview } from '../../components/common/StudentPreview';
import { SubmissionTimeline } from '../../components/common/SubmissionTimeline';
import { ValidationSummary } from '../../components/common/ValidationSummary';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DebouncedSearchField } from '../../components/common/SearchField';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  downloadAdminSubmissionsExport,
  downloadSubmissionErrors,
  fetchAdminSubmission,
  fetchAdminSubmissionSummary,
  fetchAdminSubmissions,
  fetchAdminUniversities,
  fetchSubmissionPreview,
  getApiErrorMessage,
  reviewAdminSubmission,
  saveAdminPremiumRule
} from '../../services/api';
import type { PagedList, UniversityOption } from '../../types/auth';
import type { PreviewRow, SubmissionDetail, SubmissionStats, SubmissionSummary as SubmissionRow } from '../../types/submission';

export function AdminSubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PagedList<SubmissionRow> | null>(null);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateYear, setRateYear] = useState('');
  const [rate, setRate] = useState('');
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const academicYear = params.get('academicYear') || '';
  const status = params.get('status') || '';
  const universityId = params.get('universityId') || '';

  useEffect(() => {
    void fetchAdminUniversities().then(setUniversities);
    void fetchAdminSubmissionSummary().then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    setError(null);
    void fetchAdminSubmissions({
      page,
      limit: 20,
      q: q || undefined,
      academicYear: academicYear || undefined,
      status: status || undefined,
      universityId: universityId || undefined
    })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [page, q, academicYear, status, universityId]);

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
      <Seo title="Submissions" path="/admin/submissions" />
      <h1 className="text-2xl font-semibold text-navy">College submissions</h1>
      {stats ? (
        <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total submissions" value={stats.total} />
          <StatCard title="Draft" value={stats.byStatus.DRAFT || 0} />
          <StatCard title="Submitted" value={stats.byStatus.SUBMITTED || 0} />
          <StatCard title="Under review" value={stats.byStatus.UNDER_REVIEW || 0} />
          <StatCard title="Correction required" value={stats.byStatus.CORRECTION_REQUIRED || 0} />
          <StatCard title="Approved" value={stats.byStatus.APPROVED || 0} />
          <StatCard title="Rejected" value={stats.byStatus.REJECTED || 0} />
          <StatCard title="Students submitted" value={stats.totalStudentsSubmitted} />
          <StatCard title="Calculated premium" value={stats.totalCalculatedPremium} />
        </div>
      ) : null}
      <form
        className="mt-6 border border-slate-300 bg-white p-4 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!rateYear || !rate) return;
          void saveAdminPremiumRule({
            academicYear: rateYear,
            version: `${rateYear}-v1`,
            ratePerStudent: Number(rate),
            active: true
          }).catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        <h2 className="font-semibold text-navy">Configurable premium rule</h2>
        <p className="mt-1 text-xs text-slate-500">TODO: VERIFY OFFICIAL PREMIUM RULE. This is not an official Government rate.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="border px-2 py-2" placeholder="Academic year 2025-26" value={rateYear} onChange={(event) => setRateYear(event.target.value)} />
          <input className="border px-2 py-2" placeholder="Rate per student" value={rate} onChange={(event) => setRate(event.target.value)} />
          <button type="submit" className="min-h-11 border border-navy px-3 text-navy">Save rule</button>
        </div>
      </form>
      <div className="mt-4">
        <DebouncedSearchField value={q} onDebouncedChange={(next) => update({ q: next })} label="Search submission number" />
      </div>
      <form
        className="mt-3 flex flex-wrap gap-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update({
            academicYear: String(form.get('academicYear') || ''),
            status: String(form.get('status') || ''),
            universityId: String(form.get('universityId') || '')
          });
        }}
      >
        <input name="academicYear" defaultValue={academicYear} placeholder="Academic year" className="border px-2 py-2" />
        <select name="status" defaultValue={status} className="border px-2 py-2">
          <option value="">All statuses</option>
          {['DRAFT', 'VALIDATED', 'PREMIUM_CALCULATED', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select name="universityId" defaultValue={universityId} className="border px-2 py-2">
          <option value="">All universities</option>
          {universities.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 border px-3">Filter</button>
        <button type="button" className="min-h-11 border px-3" onClick={() => void downloadAdminSubmissionsExport('csv', { q, academicYear, status, universityId })}>
          Export CSV
        </button>
        <button type="button" className="min-h-11 border px-3" onClick={() => void downloadAdminSubmissionsExport('xlsx', { q, academicYear, status, universityId })}>
          Export Excel
        </button>
      </form>
      {error ? <PageError message={error} /> : null}
      {data ? (
        <SubmissionTable
          rows={data.items}
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPage={(next) => update({ page: String(next) })}
          href={(row) => `/admin/submissions/${row.id}`}
        />
      ) : null}
    </>
  );
}

export function AdminSubmissionDetailPage() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reason, setReason] = useState('');
  const [dialog, setDialog] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!id) return;
    void fetchAdminSubmission(id).then(setSubmission).catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void fetchSubmissionPreview('ADMIN', id, { page, limit: 20, q: debouncedQ || undefined, validity: 'valid' })
      .then((data) => {
        setRows(data.items);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      })
      .catch(() => undefined);
  }, [id, page, debouncedQ]);

  async function runReview(action: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION') {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await reviewAdminSubmission(id, action, reason || undefined);
      setDialog(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Submission detail" path={`/admin/submissions/${id}`} />
      <p className="text-sm"><Link to="/admin/submissions" className="underline">All submissions</Link></p>
      {error ? <PageError message={error} /> : null}
      {submission ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold text-navy">{submission.submissionNumber}</h1>
          <SubmissionSummary item={submission} />
          {submission.reconciliation.warnings.length ? (
            <ul className="mt-3 border border-saffron bg-white p-3 text-sm">
              {submission.reconciliation.warnings.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <ValidationSummary
            totalRows={submission.validation.totalRows}
            valid={submission.validation.validRows}
            invalid={submission.validation.invalidRows}
            duplicates={submission.validation.duplicateRows}
            onDownloadErrors={() => id && void downloadSubmissionErrors('ADMIN', id)}
          />
          <p className="mt-3 text-sm">Uploaded Excel: {submission.uploadedFile?.originalFilename || '—'} {submission.uploadedFile?.checksum ? `(checksum ${submission.uploadedFile.checksum.slice(0, 12)}…)` : ''}</p>
          <div className="mt-4">
            <PremiumBreakdown premium={submission.premium} />
          </div>
          <StudentPreview rows={rows} page={page} totalPages={totalPages} total={total} onPage={setPage} q={q} onSearch={setQ} validity="valid" onValidity={() => undefined} />
          <p className="mt-2 text-sm">
            <Link className="underline" to={`/admin/students?submissionId=${submission.id}`}>Open in student directory</Link>
          </p>
          {submission.versions.length ? (
            <section className="mt-4 border border-slate-300 bg-white p-4 text-sm">
              <h2 className="font-semibold text-navy">Versions</h2>
              <ul className="mt-2">
                {submission.versions.map((row) => (
                  <li key={row.version}>Version {row.version} · {row.status} · students {row.studentCount} · {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="mt-4 border border-slate-300 bg-white p-4">
            <h2 className="text-sm font-semibold text-navy">Timeline</h2>
            <div className="mt-3"><SubmissionTimeline items={submission.timeline} /></div>
          </section>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 border px-3" onClick={() => void runReview('START_REVIEW')}>Start review</button>
            <button type="button" className="min-h-11 bg-indiaGreen px-3 text-white" onClick={() => setDialog('APPROVE')}>Approve</button>
            <button type="button" className="min-h-11 bg-red-800 px-3 text-white" onClick={() => setDialog('REJECT')}>Reject</button>
            <button type="button" className="min-h-11 bg-saffron px-3 text-navy" onClick={() => setDialog('REQUEST_CORRECTION')}>Request correction</button>
          </div>
          {submission.reviewComment ? <p className="mt-3 text-sm">Last comment: {submission.reviewComment}</p> : null}
        </>
      ) : null}
      <ConfirmationDialog
        open={Boolean(dialog)}
        title={dialog === 'APPROVE' ? 'Approve submission?' : dialog === 'REJECT' ? 'Reject submission?' : 'Request correction?'}
        confirmLabel={dialog || 'Confirm'}
        busy={busy}
        confirmDisabled={(dialog === 'REJECT' || dialog === 'REQUEST_CORRECTION') && !reason.trim()}
        onCancel={() => setDialog(null)}
        onConfirm={() => dialog && void runReview(dialog)}
      >
        {(dialog === 'REJECT' || dialog === 'REQUEST_CORRECTION') ? (
          <label className="block text-sm">
            Reason
            <textarea className="mt-1 w-full border p-2" value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
        ) : (
          <p>This notifies the college. Submitted premium is not recalculated.</p>
        )}
      </ConfirmationDialog>
    </>
  );
}
