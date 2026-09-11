import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/AdminUi';
import { fetchLoginActivity, getApiErrorMessage } from '../../services/api';
import { Pagination } from '../college/Students';

type Row = {
  id: string;
  user: { id: string; name: string; email: string } | null;
  timestamp: string;
  success: boolean;
  action: string;
  requestId: string | null;
};

export function AdminLoginActivityPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<{ items: Row[]; pagination: { page: number; totalPages: number; total: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);
  const result = params.get('result') || '';

  function load() {
    setError(null);
    void fetchLoginActivity({ page, limit: 20, result: result || undefined })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [page, result]);

  return (
    <>
      <Seo title="Login activity" path="/admin/login-activity" />
      <h1 className="text-2xl font-semibold text-navy">Login activity</h1>
      <p className="mt-2 text-sm text-slate-700">Administrators only. Detailed device or network data is not shown.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const merged = new URLSearchParams(params);
          const value = String(form.get('result') || '');
          if (value) merged.set('result', value);
          else merged.delete('result');
          merged.set('page', '1');
          setParams(merged);
        }}
      >
        <select name="result" defaultValue={result} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Result">
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <EmptyState message="No login activity matches these filters." /> : null}
      {data && data.items.length > 0 ? (
        <div className="mt-6 overflow-x-auto border border-slate-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Reference ID</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{item.user?.email || '—'}</td>
                  <td className="px-3 py-2">{item.success ? 'Success' : 'Failure'}</td>
                  <td className="px-3 py-2">{item.requestId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data ? (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPage={(next) => {
            const merged = new URLSearchParams(params);
            merged.set('page', String(next));
            setParams(merged);
          }}
        />
      ) : null}
    </>
  );
}
