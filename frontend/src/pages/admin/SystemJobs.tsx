import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ConfirmDialog } from '../../components/common/AdminUi';
import { fetchSystemJobs, getApiErrorMessage, retrySystemJob } from '../../services/api';
import type { JobItem } from '../../types/notifications';

export function AdminSystemJobsPage() {
  const [items, setItems] = useState<JobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryName, setRetryName] = useState<string | null>(null);

  function load() {
    void fetchSystemJobs().then(setItems).catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="System jobs" path="/admin/system-jobs" />
      <h1 className="text-2xl font-semibold text-navy">System jobs</h1>
      <p className="mt-2 text-sm text-slate-700">In-process scheduler. Jobs are idempotent. There is no run-everything control.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      <div className="mt-6 overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Last run</th>
              <th className="px-3 py-2">Next run</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Success</th>
              <th className="px-3 py-2">Failure</th>
              <th className="px-3 py-2">Last error</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Retry</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.name} className="border-t">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.lastRunAt ? new Date(item.lastRunAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">{item.nextRunAt ? new Date(item.nextRunAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.successCount}</td>
                <td className="px-3 py-2">{item.failureCount}</td>
                <td className="px-3 py-2">{item.lastError || '—'}</td>
                <td className="px-3 py-2">{item.lastDurationMs ?? 0} ms</td>
                <td className="px-3 py-2">
                  {item.retryable ? (
                    <button type="button" className="text-navy underline" onClick={() => setRetryName(item.name)}>Retry</button>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(retryName)}
        title="Retry job"
        onCancel={() => setRetryName(null)}
        onConfirm={() => {
          if (!retryName) return;
          void retrySystemJob(retryName).then(() => { setRetryName(null); load(); }).catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        Retry {retryName}? Duplicate notifications are blocked by unique reminder keys.
      </ConfirmDialog>
    </>
  );
}
