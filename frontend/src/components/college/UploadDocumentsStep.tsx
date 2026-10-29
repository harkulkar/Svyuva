import { useEffect, useRef, useState } from 'react';
import { ButtonSpinner } from '../common/Loading';
import { downloadUploadDocument, fetchUploadDocuments, getApiErrorMessage, uploadUploadDocument } from '../../services/api';
import type { UploadDocumentList } from '../../types/uploadDocuments';

function sizeLabel(bytes: number | null) {
  if (bytes == null) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Document pack the insurer needs before the premium can be paid. Reports completeness to the parent. */
export function UploadDocumentsStep({
  jobId,
  onStatus
}: {
  jobId: string;
  onStatus: (state: { required: boolean; complete: boolean }) => void;
}) {
  const [data, setData] = useState<UploadDocumentList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ type: string; message: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void fetchUploadDocuments(jobId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load the document list.'));
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    onStatus({ required: Boolean(data?.required) || (data === null && !error), complete: Boolean(data?.complete) });
  }, [data, error, onStatus]);

  async function onPick(type: string, file: File | undefined) {
    if (!file || !data) return;
    setRowError(null);
    if (file.size > data.maxFileMb * 1024 * 1024) {
      setRowError({ type, message: `The file is larger than ${data.maxFileMb} MB.` });
      return;
    }
    setBusyType(type);
    try {
      setData(await uploadUploadDocument(jobId, type, file));
    } catch (err) {
      setRowError({ type, message: getApiErrorMessage(err, 'Upload failed. Please try again.') });
    } finally {
      setBusyType(null);
      const input = inputs.current[type];
      if (input) input.value = '';
    }
  }

  async function onView(type: string, filename: string | null) {
    setRowError(null);
    try {
      await downloadUploadDocument(jobId, type, filename || 'document');
    } catch (err) {
      setRowError({ type, message: getApiErrorMessage(err, 'Could not open the file.') });
    }
  }

  if (error) {
    return <p className="mt-6 text-sm text-red-800" role="alert">{error}</p>;
  }
  if (!data) {
    return <p className="mt-6 text-sm text-slate-600">Loading documents…</p>;
  }
  if (!data.required) return null;

  const accept = data.allowedExtensions.map((ext) => `.${ext}`).join(',');

  return (
    <section className="mt-6 border border-slate-200 p-4" aria-labelledby="upload-docs-heading">
      <h3 id="upload-docs-heading" className="text-base font-semibold text-navy">Upload documents</h3>
      <p className="mt-1 text-sm text-slate-700">
        ICICI Lombard needs all {data.total} documents before payment. {data.uploadedCount} of {data.total} uploaded.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Accepted: {data.allowedExtensions.map((ext) => ext.toUpperCase()).join(', ')}. Maximum {data.maxFileMb} MB per file.
        {data.locked ? ' Payment is complete, so documents can no longer be changed.' : ''}
      </p>
      <ol className="mt-4 space-y-3">
        {data.items.map((item, index) => {
          const busy = busyType === item.type;
          const inputId = `doc-${item.type}`;
          return (
            <li key={item.type} className="border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-navy">
                  {index + 1}. {item.label}
                </p>
                <span className={item.uploaded ? 'font-semibold text-green-800' : 'text-slate-500'}>
                  {item.uploaded ? 'Uploaded' : 'Required'}
                </span>
              </div>
              {item.uploaded ? (
                <p className="mt-1 text-slate-700">
                  {item.filename} {item.sizeBytes ? `· ${sizeLabel(item.sizeBytes)}` : ''}{' '}
                  <button type="button" className="ml-1 text-navy underline" onClick={() => void onView(item.type, item.filename)}>
                    View
                  </button>
                </p>
              ) : null}
              {!data.locked ? (
                <div className="mt-2">
                  <input
                    id={inputId}
                    ref={(node) => {
                      inputs.current[item.type] = node;
                    }}
                    type="file"
                    accept={accept}
                    className="sr-only"
                    disabled={busy}
                    onChange={(event) => void onPick(item.type, event.target.files?.[0])}
                  />
                  <label
                    htmlFor={inputId}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border border-navy px-3 py-2 text-sm font-semibold text-navy ${busy ? 'opacity-60' : ''}`}
                  >
                    {busy ? <ButtonSpinner /> : null}
                    {item.uploaded ? 'Replace file' : 'Choose file'}
                    <span className="sr-only"> for {item.label}</span>
                  </label>
                </div>
              ) : null}
              {rowError?.type === item.type ? (
                <p className="mt-2 text-red-800" role="alert">{rowError.message}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
