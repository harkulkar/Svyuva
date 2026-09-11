import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ButtonSpinner } from '../../components/common/Loading';
import { FileUpload, type UploadUiState } from '../../components/common/FileUpload';
import { validateExcelFile } from '../../utils/fileValidation';
import {
  downloadStudentImportErrors,
  downloadStudentTemplate,
  getApiErrorMessage,
  importStudentExcel,
  uploadStudentExcel
} from '../../services/api';
import type { ExcelPreview, ImportResult } from '../../types/student';

export function CollegeUploadStudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ExcelPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'import' | null>(null);
  const [uploadState, setUploadState] = useState<UploadUiState>('IDLE');
  const [controller, setController] = useState<AbortController | null>(null);

  async function onValidate(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Select an Excel file first.');
      return;
    }
    setBusy('upload');
    setError(null);
    setResult(null);
    setStatus('Validating file…');
    setUploadState('VALIDATING');
    const abort = new AbortController();
    setController(abort);
    try {
      setPreview(await uploadStudentExcel(file, abort.signal));
      setStatus('Validation complete. Review the preview before importing.');
      setUploadState('SUCCESS');
    } catch (err) {
      setPreview(null);
      setError(getApiErrorMessage(err, 'Upload failed. Please try again.'));
      setStatus(null);
      setUploadState('FAILED');
    } finally {
      setBusy(null);
      setController(null);
    }
  }

  async function onImport() {
    if (!preview) return;
    setBusy('import');
    setError(null);
    setStatus('Importing valid records…');
    try {
      setResult(await importStudentExcel(preview.jobId));
      setStatus('Import successful.');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStatus(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Seo title="Upload students" path="/college/students/upload" />
      <p className="text-sm"><Link to="/college/students" className="text-navy underline">All students</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Upload students</h1>
      <p className="mt-2 text-sm text-slate-700">
        Download the template on this device, complete the rows on a computer if editing Excel on a phone is impractical, then return here to validate and import.
        This page does not include a spreadsheet editor.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Template columns: Sr No, Student ID No, Student Name, Parent Name, Student's DOB, Parent's DOB (Optional), Age, Parent -Age, Student Gender, Father/Mother, Student's Mail Id, Student's Mobile No.
      </p>
      <div className="mt-4">
        <button type="button" className="border border-navy px-3 py-2 text-sm font-semibold text-navy" onClick={() => void downloadStudentTemplate()}>
          Download Excel template
        </button>
      </div>
      <form className="mt-6 space-y-4 border border-slate-300 bg-white p-5" onSubmit={(event) => void onValidate(event)}>
        <FileUpload
          label="Excel file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hint="Accepted format: .xlsx. Maximum size and row limits are enforced by the server. Editing Excel on a phone is often impractical — download the template on a computer if needed."
          file={file}
          state={file && uploadState === 'IDLE' ? 'SELECTED' : uploadState}
          error={error}
          message={status || undefined}
          onSelect={(next) => {
            setFile(next);
            setPreview(null);
            setResult(null);
            setUploadState(next ? 'SELECTED' : 'IDLE');
          }}
          onRemove={() => {
            setFile(null);
            setPreview(null);
            setUploadState('IDLE');
          }}
          onRetry={() => {
            const fake = { preventDefault() {} } as FormEvent;
            void onValidate(fake);
          }}
          onCancel={() => {
            controller?.abort();
            setBusy(null);
            setUploadState('FAILED');
            setError('Upload cancelled.');
          }}
          validate={(next) => validateExcelFile(next, 5 * 1024 * 1024)}
        />
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy !== null}>
          {busy === 'upload' ? <ButtonSpinner /> : null}
          Validate
        </button>
      </form>
      {preview ? (
        <section className="mt-6 border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold text-navy">Preview</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
            <Stat label="Total rows" value={preview.totalRows} />
            <Stat label="Valid" value={preview.valid} />
            <Stat label="Invalid" value={preview.invalid} />
            <Stat label="Duplicates" value={preview.duplicates} />
          </dl>
          {preview.issues.length ? (
            <ul className="mt-4 space-y-1 text-sm text-red-800" aria-live="polite">
              {preview.issues.map((issue) => (
                <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-green-800">No row errors.</p>}
          {preview.preview.length ? (
            <div className="mt-4 overflow-x-auto md:block">
              <div className="space-y-2 md:hidden">
                {preview.preview.map((row) => (
                  <article key={row.row} className="border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-navy">{row.name}</p>
                    <p>{row.studentId}{row.mobile ? ` · ${row.mobile}` : ''}</p>
                    <p>{row.gender || row.course}</p>
                  </article>
                ))}
              </div>
              <table className="mt-2 hidden min-w-full text-left text-sm md:table">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Student ID No</th>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Mobile No</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row) => (
                    <tr key={row.row} className="border-t border-slate-200">
                      <td className="px-3 py-2">{row.row}</td>
                      <td className="px-3 py-2">{row.studentId}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.gender || '—'}</td>
                      <td className="px-3 py-2">{row.mobile || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {preview.aiSuggestions?.length ? (
            <section className="mt-4 border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-navy">AI-assisted review</h3>
              <p className="mt-1 text-xs text-slate-600">{preview.aiSuggestionsNote}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {preview.aiSuggestions.map((item) => (
                  <li key={`${item.row}-${item.kind}-${item.observation}`}>
                    Row {item.row}: {item.observation} {item.suggestion}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void onImport()} disabled={busy !== null || preview.valid === 0}>
              {busy === 'import' ? <ButtonSpinner /> : null}
              Import valid records
            </button>
            {preview.issues.length ? (
              <button type="button" className="border border-navy px-4 py-2 text-sm font-semibold text-navy" onClick={() => void downloadStudentImportErrors(preview.jobId)}>
                Download error report
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {result ? (
        <section className="mt-6 border border-green-200 bg-green-50 p-5" role="status">
          <h2 className="text-lg font-semibold text-navy">Import successful</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-5 text-sm">
            <Stat label="Total rows" value={result.totalRows} />
            <Stat label="Imported" value={result.imported} />
            <Stat label="Skipped" value={result.skipped} />
            <Stat label="Failed" value={result.failed} />
            <Stat label="Duplicates" value={result.duplicates} />
          </dl>
          <Link to="/college/students" className="mt-4 inline-block font-semibold text-navy underline">View student list</Link>
        </section>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold text-navy">{value}</dd>
    </div>
  );
}
