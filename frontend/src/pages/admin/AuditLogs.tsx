import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/AdminUi';
import { fetchAuditLogs, getApiErrorMessage } from '../../services/api';
import { Pagination } from '../college/Students';
import type { AuditLogRow, PagedList } from '../../types/auth';

export function AdminAuditLogsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PagedList<AuditLogRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);
  const action = params.get('action') || '';
  const entity = params.get('entity') || '';
  const userId = params.get('userId') || '';
  const actor = params.get('actor') || '';
  const entityId = params.get('entityId') || '';
  const result = params.get('result') || '';
  const startDate = params.get('startDate') || '';
  const endDate = params.get('endDate') || '';

  function load() {
    setError(null);
    void fetchAuditLogs({
      page,
      limit: 20,
      action: action || undefined,
      entity: entity || undefined,
      entityId: entityId || undefined,
      userId: userId || undefined,
      actor: actor || undefined,
      result: result || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [page, action, entity, entityId, userId, actor, result, startDate, endDate]);

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
      <Seo title="Audit logs" path="/admin/audit-logs" />
      <h1 className="text-2xl font-semibold text-navy">Audit logs</h1>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update({
          actor: String(form.get('actor') || ''),
          action: String(form.get('action') || ''),
          entity: String(form.get('entity') || ''),
          entityId: String(form.get('entityId') || ''),
          userId: String(form.get('userId') || ''),
          result: String(form.get('result') || ''),
          startDate: String(form.get('startDate') || ''),
          endDate: String(form.get('endDate') || '')
        });
      }}>
        <input name="actor" defaultValue={params.get('actor') || ''} placeholder="Actor (name or email)" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Actor" />
        <input name="action" defaultValue={action} placeholder="Action" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Action" />
        <input name="entity" defaultValue={entity} placeholder="Target / entity" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Entity" />
        <input name="entityId" defaultValue={params.get('entityId') || ''} placeholder="Target ID" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Target ID" />
        <input name="userId" defaultValue={userId} placeholder="User ID" className="border border-slate-300 px-3 py-2 text-sm" aria-label="User ID" />
        <select name="result" defaultValue={params.get('result') || ''} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Result">
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="info">Info</option>
        </select>
        <input type="date" name="startDate" defaultValue={startDate} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Start date" />
        <input type="date" name="endDate" defaultValue={endDate} className="border border-slate-300 px-3 py-2 text-sm" aria-label="End date" />
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <EmptyState message="No audit log entries match these filters." /> : null}
      {data && data.items.length > 0 ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.action}</p>
                <p className="mt-1">{item.user?.email || '—'}</p>
                <p className="mt-1">{item.entity} · {item.result || '—'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Date/Time</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Entity ID</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Reference ID</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{item.user?.email || '—'}</td>
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2">{item.entity}</td>
                  <td className="px-3 py-2">{item.entityId || '—'}</td>
                  <td className="px-3 py-2">{item.result || '—'}</td>
                  <td className="px-3 py-2">{item.requestId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : null}
      {data ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={(next) => update({ page: String(next) })} /> : null}
    </>
  );
}
