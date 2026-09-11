import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { ConfirmDialog, EmptyState } from '../../components/common/AdminUi';
import { fetchAdminUsers, fetchInactiveAccounts, getApiErrorMessage, updateAdminUserStatusRequest } from '../../services/api';
import { Pagination } from '../college/Students';
import type { AdminUserRow, PagedList } from '../../types/auth';

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<PagedList<AdminUserRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inactive, setInactive] = useState<Array<{ id: string; name: string; email: string; role: string; lastLoginAt: string | null }>>([]);
  const [confirm, setConfirm] = useState<AdminUserRow | null>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const role = params.get('role') || '';
  const status = params.get('status') || '';

  function load() {
    setError(null);
    void fetchAdminUsers({ page, limit: 20, q: q || undefined, role: role || undefined, status: status || undefined })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
    void fetchInactiveAccounts(90)
      .then((result) => setInactive(result.items))
      .catch(() => setInactive([]));
  }

  useEffect(() => {
    load();
  }, [page, q, role, status]);

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
      <Seo title="Users" path="/admin/users" />
      <h1 className="text-2xl font-semibold text-navy">Users</h1>
      <p className="mt-2 text-sm text-slate-700">The last active administrator cannot be deactivated. Roles cannot be changed here. Inactive accounts are listed for review only — they are not auto-disabled.</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update({
          q: String(form.get('q') || ''),
          role: String(form.get('role') || ''),
          status: String(form.get('status') || '')
        });
      }}>
        <input name="q" defaultValue={q} placeholder="Search name or email" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Search users" />
        <select name="role" defaultValue={role} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Role">
          <option value="">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="COLLEGE">COLLEGE</option>
        </select>
        <select name="status" defaultValue={status} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="PENDING">PENDING</option>
        </select>
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>Retry</button></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data && data.items.length === 0 ? <EmptyState message="No users found." /> : null}
      {data && data.items.length > 0 ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {data.items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1 break-all">{item.email}</p>
                <p className="mt-1">{item.role} · {item.status}</p>
                {item.status === 'PENDING' ? null : (
                  <button type="button" className="mt-3 font-semibold text-navy underline" onClick={() => setConfirm(item)}>
                    {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last login</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.email}</td>
                  <td className="px-3 py-2">{item.role}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{item.lastLogin ? new Date(item.lastLogin).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">
                    {item.status === 'PENDING' ? '—' : (
                      <button type="button" className="font-semibold text-navy underline" onClick={() => setConfirm(item)}>
                        {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : null}
      {inactive.length > 0 ? (
        <section className="mt-6 border border-slate-300 bg-white p-4 text-sm">
          <h2 className="font-semibold text-navy">Inactive account review (90 days)</h2>
          <p className="mt-1 text-slate-600">Use Activate/Deactivate above. No automatic disable is applied.</p>
          <ul className="mt-2 space-y-1">
            {inactive.slice(0, 15).map((item) => (
              <li key={item.id}>{item.email} ({item.role}) last login {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString() : 'never'}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {data ? <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPage={(next) => update({ page: String(next) })} /> : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
        danger={confirm?.status === 'ACTIVE'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          void updateAdminUserStatusRequest(confirm.id, confirm.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            .then(() => { setConfirm(null); load(); })
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        {confirm ? `${confirm.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${confirm.email}?` : null}
      </ConfirmDialog>
    </>
  );
}
