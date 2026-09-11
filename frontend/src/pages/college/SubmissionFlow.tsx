import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { PageError } from '../../components/common/PageState';
import { Stepper } from '../../components/common/Stepper';
import { ExcelUpload } from '../../components/common/ExcelUpload';
import { ValidationSummary } from '../../components/common/ValidationSummary';
import { StudentPreview } from '../../components/common/StudentPreview';
import { PremiumBreakdown } from '../../components/common/PremiumBreakdown';
import { SubmissionReview } from '../../components/common/SubmissionReview';
import { SubmissionSummary } from '../../components/common/SubmissionSummary';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  calculateCollegePremium,
  confirmCollegeSubmission,
  downloadStudentTemplate,
  downloadSubmissionErrors,
  fetchCollegeSubmission,
  fetchCollegeSubmissionMeta,
  fetchSubmissionPreview,
  getApiErrorMessage,
  submitCollegeSubmission,
  uploadCollegeSubmissionExcel
} from '../../services/api';
import type { ExcelIssue } from '../../types/student';
import type { PreviewRow, SubmissionDetail } from '../../types/submission';
import type { UploadUiState } from '../../components/common/FileUpload';

const STEPS = [
  { id: 'upload', title: 'Upload' },
  { id: 'preview', title: 'Preview' },
  { id: 'premium', title: 'Premium' },
  { id: 'review', title: 'Review' }
];

function stepIndex(path: string, submission?: SubmissionDetail | null) {
  if (path.includes('/review')) return 3;
  if (path.includes('/premium')) return 2;
  if (path.includes('/preview')) return 1;
  if (path.includes('/upload')) return 0;
  if (submission?.status === 'SUBMITTED' || submission?.status === 'APPROVED') return 3;
  if (submission?.premium) return 2;
  if (submission?.studentsConfirmed) return 1;
  return 0;
}

function useSubmission() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  function load() {
    if (!id) return;
    setError(null);
    void fetchCollegeSubmission(id).then(setSubmission).catch((err) => setError(getApiErrorMessage(err)));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return { id: id || '', submission, error, reload: load, setError };
}

export function CollegeSubmissionDetailPage() {
  const { id, submission, error } = useSubmission();
  const path = `/college/submissions/${id}`;
  return (
    <>
      <Seo title="Submission" path={path} />
      <p className="text-sm"><Link to="/college/submissions" className="underline">My submissions</Link></p>
      {error ? <PageError message={error} /> : null}
      {submission ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold text-navy">{submission.submissionNumber}</h1>
          <Stepper steps={STEPS} current={stepIndex('', submission)} />
          <SubmissionSummary item={submission} />
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {submission.canEdit ? <Link className="min-h-11 border border-navy px-3 py-2 text-navy" to={`${path}/upload`}>Upload Excel</Link> : null}
            <Link className="min-h-11 border border-navy px-3 py-2 text-navy" to={`${path}/preview`}>Preview</Link>
            <Link className="min-h-11 border border-navy px-3 py-2 text-navy" to={`${path}/premium`}>Premium</Link>
            <Link className="min-h-11 bg-navy px-3 py-2 text-white" to={`${path}/review`}>Review / submit</Link>
          </div>
        </>
      ) : null}
    </>
  );
}

export function CollegeSubmissionUploadPage() {
  const { id, submission, error, setError, reload } = useSubmission();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadUiState>('IDLE');
  const [result, setResult] = useState<{ totalRows: number; valid: number; invalid: number; duplicates: number; issues: ExcelIssue[]; filename: string; sizeBytes: number } | null>(null);
  const [maxBytes, setMaxBytes] = useState(5 * 1024 * 1024);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchCollegeSubmissionMeta().catch(() => undefined);
  }, []);

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Select an Excel file first.');
      return;
    }
    setState('VALIDATING');
    setError(null);
    try {
      const data = await uploadCollegeSubmissionExcel(id, file);
      setResult(data);
      setState('SUCCESS');
      reload();
    } catch (err) {
      setState('FAILED');
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Upload Excel" path={`/college/submissions/${id}/upload`} />
      <p className="text-sm"><Link to={`/college/submissions/${id}`} className="underline">Back to submission</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Upload student Excel</h1>
      {submission ? <Stepper steps={STEPS} current={0} /> : null}
      {submission?.locked ? <p className="mt-2 text-sm font-medium">Submitted on: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}</p> : null}
      {error ? <PageError message={error} /> : null}
      <p className="mt-2 text-sm text-slate-700">
        Template columns: Sr No, Student ID No, Student Name, Parent Name, Student's DOB, Parent's DOB (Optional), Age, Parent -Age, Student Gender, Father/Mother, Student's Mail Id, Student's Mobile No.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 border border-navy px-3 text-navy" onClick={() => void downloadStudentTemplate()}>
          Download template
        </button>
      </div>
      <form className="mt-4 space-y-4" onSubmit={onUpload}>
        <ExcelUpload
          file={file}
          state={state}
          error={error}
          disabled={Boolean(submission && !submission.canEdit)}
          maxBytes={maxBytes}
          onSelect={(next) => {
            setFile(next);
            setState(next ? 'SELECTED' : 'IDLE');
            setMaxBytes(maxBytes);
          }}
          onRemove={() => {
            setFile(null);
            setState('IDLE');
          }}
        />
        <button type="submit" disabled={!file || Boolean(submission && !submission.canEdit)} className="min-h-11 bg-navy px-4 py-2 text-white disabled:opacity-50">
          Validate Excel
        </button>
      </form>
      {result ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm">{result.filename} · {result.sizeBytes} bytes · Validation {state === 'SUCCESS' ? 'complete' : state}</p>
          <ValidationSummary
            totalRows={result.totalRows}
            valid={result.valid}
            invalid={result.invalid}
            duplicates={result.duplicates}
            issues={result.issues}
            onDownloadErrors={() => void downloadSubmissionErrors('COLLEGE', id)}
          />
          <Link className="inline-block min-h-11 bg-navy px-4 py-2 text-white" to={`/college/submissions/${id}/preview`}>
            Show preview
          </Link>
        </div>
      ) : null}
      {submission && !result ? (
        <div className="mt-4">
          <ValidationSummary
            totalRows={submission.validation.totalRows}
            valid={submission.validation.validRows}
            invalid={submission.validation.invalidRows}
            duplicates={submission.validation.duplicateRows}
            onDownloadErrors={() => void downloadSubmissionErrors('COLLEGE', id)}
          />
          {submission.validation.totalRows ? (
            <button type="button" className="mt-3 min-h-11 border px-3" onClick={() => navigate(`/college/submissions/${id}/preview`)}>Continue to preview</button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function CollegeSubmissionPreviewPage() {
  const { id, submission, error, setError, reload } = useSubmission();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [validity, setValidity] = useState('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void fetchSubmissionPreview('COLLEGE', id, { page, limit: 20, q: debouncedQ || undefined, validity })
      .then((data) => {
        setRows(data.items);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [id, page, debouncedQ, validity, setError]);

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      await confirmCollegeSubmission(id);
      reload();
      navigate(`/college/submissions/${id}/premium`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Preview students" path={`/college/submissions/${id}/preview`} />
      <p className="text-sm"><Link to={`/college/submissions/${id}`} className="underline">Back to submission</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Confirm student data</h1>
      <Stepper steps={STEPS} current={1} />
      {error ? <PageError message={error} /> : null}
      {submission ? (
        <ValidationSummary
          totalRows={submission.validation.totalRows}
          valid={submission.validation.validRows}
          invalid={submission.validation.invalidRows}
          duplicates={submission.validation.duplicateRows}
          onDownloadErrors={() => void downloadSubmissionErrors('COLLEGE', id)}
        />
      ) : null}
      <StudentPreview
        rows={rows}
        page={page}
        totalPages={totalPages}
        total={total}
        onPage={setPage}
        q={q}
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
        validity={validity}
        onValidity={(value) => {
          setValidity(value);
          setPage(1);
        }}
      />
      {submission?.canEdit ? (
        <button type="button" disabled={busy} className="mt-4 min-h-11 bg-navy px-4 py-2 text-white disabled:opacity-50" onClick={() => void onConfirm()}>
          Confirm student data
        </button>
      ) : null}
    </>
  );
}

export function CollegeSubmissionPremiumPage() {
  const { id, submission, error, setError, reload } = useSubmission();
  const [busy, setBusy] = useState(false);

  async function onCalc() {
    setBusy(true);
    setError(null);
    try {
      await calculateCollegePremium(id);
      reload();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Premium summary" path={`/college/submissions/${id}/premium`} />
      <p className="text-sm"><Link to={`/college/submissions/${id}`} className="underline">Back to submission</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Premium summary</h1>
      <Stepper steps={STEPS} current={2} />
      {error ? <PageError message={error} /> : null}
      {submission ? (
        <>
          <SubmissionSummary item={submission} />
          <div className="mt-4">
            <PremiumBreakdown premium={submission.premium} />
          </div>
          {submission.lastCalculatedAt ? <p className="mt-2 text-sm text-slate-600">Last calculated: {new Date(submission.lastCalculatedAt).toLocaleString()}</p> : null}
          {submission.canEdit ? (
            <button type="button" disabled={busy || !submission.studentsConfirmed} className="mt-4 min-h-11 bg-navy px-4 py-2 text-white disabled:opacity-50" onClick={() => void onCalc()}>
              {submission.premium ? 'Recalculate premium' : 'Calculate premium'}
            </button>
          ) : null}
          <Link className="mt-3 inline-block min-h-11 border border-navy px-4 py-2 text-navy" to={`/college/submissions/${id}/review`}>
            Continue to review
          </Link>
        </>
      ) : null}
    </>
  );
}

export function CollegeSubmissionReviewPage() {
  const { id, submission, error, setError, reload } = useSubmission();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await submitCollegeSubmission(id);
      setOpen(false);
      reload();
      navigate(`/college/submissions/${id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Review submission" path={`/college/submissions/${id}/review`} />
      <p className="text-sm"><Link to={`/college/submissions/${id}`} className="underline">Back to submission</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Review and submit</h1>
      <Stepper steps={STEPS} current={3} />
      {error ? <PageError message={error} /> : null}
      {submission ? (
        <SubmissionReview submission={submission}>
          <section className="border border-slate-300 bg-white p-4 text-sm">
            <h2 className="font-semibold text-navy">Declaration</h2>
            <p className="mt-2">
              I confirm that the student data and premium summary have been reviewed. Submitting sends this record to administration.
              Further changes may require a correction request. The premium calculation stored at submit time will be retained.
            </p>
          </section>
          {submission.canSubmit ? (
            <button type="button" className="min-h-11 bg-navy px-4 py-2 text-white" onClick={() => setOpen(true)}>
              Submit
            </button>
          ) : null}
          {submission.locked ? <p className="font-medium text-navy">Submitted on: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}</p> : null}
        </SubmissionReview>
      ) : null}
      <ConfirmationDialog
        open={open}
        title="Submit this data?"
        confirmLabel="Submit"
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => void onSubmit()}
      >
        <p>Are you sure you want to submit this data?</p>
        <ul className="mt-2 list-disc pl-5">
          <li>The data will be sent to administration.</li>
          <li>Changes after submit may require correction or reopening.</li>
          <li>The premium calculation will be recorded as calculated on the server.</li>
        </ul>
      </ConfirmationDialog>
    </>
  );
}
