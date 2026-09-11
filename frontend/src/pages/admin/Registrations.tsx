import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/AdminUi';
import { fetchAdminRegistrations, getApiErrorMessage } from '../../services/api';
import { Pagination } from '../college/Students';
import type { AdminInstituteList } from '../../types/auth';

export function AdminRegistrationsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<AdminInstituteList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';

  function load() {
    setError(null);
    void fetchAdminRegistrations({ page, limit: 20, q: q || undefined })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [page, q]);

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
      <Seo title="College registrations" path="/admin/registrations" />
      <h1 className="text-2xl font-semibold text-navy">College registrations</h1>
      <p className="mt-2 text-sm text-slate-700">Pending institute registrations awaiting approval.</p>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update({ q: String(form.get('q') || '') });
      }}>
        <input name="q" defaultValue={q} placeholder="Search institute, email, principal" className="min-h-11 flex-1 border border-slate-300 px-3 py-2 text-sm" aria-label="Search registrations" type="search" />
        <button type="submit" className="min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <EmptyState message="No pending college registrations." /> : null}
      {data && data.items.length > 0 ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <Link key={item.id} to={`/admin/registrations/${item.id}`} className="block border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1">{item.university.name}</p>
                <p className="mt-1">{item.status} · {item.district}</p>
                <p className="mt-1 text-slate-600">{item.principalName}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Institute</th>
                <th className="px-3 py-2">University</th>
                <th className="px-3 py-2">Principal</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Registration date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.university.name}</td>
                  <td className="px-3 py-2">{item.principalName}</td>
                  <td className="px-3 py-2">{item.email}</td>
                  <td className="px-3 py-2">{item.mobile}</td>
                  <td className="px-3 py-2">{item.district}</td>
                  <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link className="font-semibold text-navy underline" to={`/admin/registrations/${item.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : null}
      {data ? <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(next) => update({ page: String(next) })} /> : null}
    </>
  );
}
