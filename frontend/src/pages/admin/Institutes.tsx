import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchAdminInstitutes, fetchAdminUniversities, getApiErrorMessage, downloadAdminExport } from '../../services/api';
import { FilterPanel } from '../../components/common/FilterPanel';
import { DebouncedSearchField } from '../../components/common/SearchField';
import type { AdminInstituteList, UniversityOption } from '../../types/auth';

export function AdminInstitutesPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<AdminInstituteList | null>(null);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterFormRef = useRef<HTMLFormElement>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const universityId = params.get('universityId') || '';
  const district = params.get('district') || '';

  useEffect(() => {
    void fetchAdminUniversities().then(setUniversities);
  }, []);

  useEffect(() => {
    setError(null);
    void fetchAdminInstitutes({
      page,
      limit: 20,
      q: q || undefined,
      status: status || undefined,
      universityId: universityId || undefined,
      district: district || undefined
    })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [page, q, status, universityId, district]);

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
      <Seo title="Institutes" path="/admin/institutes" />
      <h1 className="text-2xl font-semibold text-navy">Institutes</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadAdminExport('institutes', { q, status, universityId, district }, 'csv')}>Export CSV</button>
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={() => void downloadAdminExport('institutes', { q, status, universityId, district }, 'xlsx')}>Export Excel</button>
      </div>
      <div className="mt-4">
        <DebouncedSearchField value={q} onDebouncedChange={(next) => update({ q: next })} label="Search institutes" placeholder="Search name, email, code" />
      </div>
      <FilterPanel open={filtersOpen} onOpen={() => setFiltersOpen(true)} onClose={() => setFiltersOpen(false)} onSubmit={() => filterFormRef.current?.requestSubmit()}>
      <form
        ref={filterFormRef}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          update({
            status: String(form.get('status') || ''),
            universityId: String(form.get('universityId') || ''),
            district: String(form.get('district') || '')
          });
        }}
      >
        <select name="status" defaultValue={status} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          {['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED'].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select name="universityId" defaultValue={universityId} className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="University">
          <option value="">All universities</option>
          {universities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input name="district" defaultValue={district} placeholder="District" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" aria-label="District" />
        <button type="submit" className="hidden min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white md:inline-flex md:items-center">
          Apply
        </button>
      </form>
      </FilterPanel>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={() => window.location.reload()}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <p className="mt-6 border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">No institutes found.</p> : null}
      {data ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <Link key={item.id} to={`/admin/institutes/${item.id}`} className="block border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1">{item.university.name}</p>
                <p className="mt-1">{item.status} · {item.district}</p>
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
                <th className="px-3 py-2">District</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Registered</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.university.name}</td>
                  <td className="px-3 py-2">{item.principalName}</td>
                  <td className="px-3 py-2">{item.district}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">
                    <Link to={`/admin/institutes/${item.id}`} className="font-semibold text-navy underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <p>
              Page {data.page} of {data.totalPages} ({data.total} records)
            </p>
            <div className="flex gap-2">
              <button type="button" className="border px-3 py-1" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>
                Previous
              </button>
              <button
                type="button"
                className="border px-3 py-1"
                disabled={data.page >= data.totalPages}
                onClick={() => update({ page: String(data.page + 1) })}
              >
                Next
              </button>
            </div>
          </div>
        </div>
        </>
      ) : null}
    </>
  );
}
