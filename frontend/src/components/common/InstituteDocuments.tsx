import { useEffect, useState } from 'react';
import { downloadAdminDocument, fetchInstituteDocuments, getApiErrorMessage } from '../../services/api';
import type { InstituteDocuments as InstituteDocumentsData } from '../../types/uploadDocuments';

function sizeLabel(bytes: number | null) {
  if (bytes == null) return '—';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function when(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

const INSURER_NAMES: Record<string, string> = { ICICI: 'ICICI Lombard', NATIONAL: 'National Insurance' };

/** Admin view: every document this institute has uploaded, grouped by student upload, with download. */
export function InstituteDocuments({ instituteId }: { instituteId: string }) {
  const [data, setData] = useState<InstituteDocumentsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReplaced, setShowReplaced] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void fetchInstituteDocuments(instituteId, showReplaced)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load documents.'));
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId, showReplaced]);

  async function onDownload(id: string, filename: string) {
    setDownloadError(null);
    setDownloading(id);
    try {
      await downloadAdminDocument(id, filename);
    } catch (err) {
      setDownloadError(getApiErrorMessage(err, 'Could not download the file.'));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="mt-6 border border-slate-300 bg-white p-5" aria-labelledby="institute-docs-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="institute-docs-heading" className="text-sm font-semibold text-navy">Uploaded documents</h2>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={showReplaced} onChange={(event) => setShowReplaced(event.target.checked)} />
          Show replaced versions
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
      {downloadError ? <p className="mt-3 text-sm text-red-800" role="alert">{downloadError}</p> : null}
      {!data && !error ? <p className="mt-3 text-sm text-slate-600">Loading documents…</p> : null}
      {data && data.groups.length === 0 ? <p className="mt-3 text-sm text-slate-600">This institute has not uploaded any documents yet.</p> : null}
      {data?.groups.map((group) => (
        <div key={group.uploadJobId ?? 'other'} className="mt-4 border border-slate-200">
          <div className="bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold text-navy">{group.uploadJobId ? `Upload on ${when(group.uploadedAt)}` : 'Other documents'}</span>
            {group.uploadFilename ? ` · ${group.uploadFilename}` : ''}
            {group.insurer ? ` · ${INSURER_NAMES[group.insurer] || group.insurer}${group.policyType ? ` ${group.policyType}` : ''}` : ''}
            {group.studentCount ? ` · ${group.studentCount} students` : ''}
            {group.paymentStatus ? ` · Payment: ${group.paymentStatus}` : ''}
          </div>
          <ul className="divide-y divide-slate-200">
            {group.items.map((item) => (
              <li key={item.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${item.isCurrent ? '' : 'bg-slate-50 text-slate-500'}`}>
                <div className="min-w-0">
                  <p className={`font-medium ${item.isCurrent ? 'text-navy' : ''}`}>
                    {item.label}
                    {!item.isCurrent ? <span className="ml-2 text-xs font-normal">Replaced (v{item.version})</span> : null}
                  </p>
                  <p className="break-all text-xs">
                    {item.filename} · {sizeLabel(item.sizeBytes)} · {when(item.uploadedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-9 border border-navy px-3 py-1 text-xs font-semibold text-navy disabled:opacity-60"
                  disabled={downloading === item.id}
                  onClick={() => void onDownload(item.id, item.filename)}
                  aria-label={`Download ${item.label}`}
                >
                  {downloading === item.id ? 'Downloading…' : 'Download'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
