import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading, ButtonSpinner } from '../../components/common/Loading';
import { ConfirmDialog, EmptyState } from '../../components/common/AdminUi';
import { TextField } from '../../components/auth/FormField';
import { Pagination } from '../college/Students';
import {
  createUniversityRequest,
  fetchAdminUniversityList,
  getApiErrorMessage,
  updateUniversityRequest,
  updateUniversityStatusRequest
} from '../../services/api';
import type { UniversityOption } from '../../types/auth';

const schema = z.object({
  name: z.string().min(2, 'University name is required.'),
  code: z.string().optional(),
  shortName: z.string().optional()
});

type Row = UniversityOption & { createdAt?: string };

export function AdminUniversitiesPage() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const page = Number(params.get('page') || 1);
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<{ name: string; code?: string; shortName?: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', shortName: '' }
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUniversityList({ page, limit: 20, q: q || undefined, status: status || undefined });
      setItems(data.items);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [page, q, status]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    if (!next.page) merged.set('page', '1');
    setParams(merged);
  }

  async function onSubmit(values: { name: string; code?: string; shortName?: string }) {
    setError(null);
    try {
      if (editing) {
        await updateUniversityRequest(editing.id, {
          name: values.name.trim(),
          code: values.code?.trim() || '',
          shortName: values.shortName?.trim() || ''
        });
        setEditing(null);
      } else {
        await createUniversityRequest({
          name: values.name.trim(),
          code: values.code?.trim() || undefined,
          shortName: values.shortName?.trim() || undefined
        });
      }
      reset({ name: '', code: '', shortName: '' });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Universities" path="/admin/universities" />
      <h1 className="text-2xl font-semibold text-navy">Universities</h1>
      <p className="mt-2 text-sm text-slate-700">Universities are not deleted. Use Active or Inactive.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField label="Name" required error={errors.name?.message} {...register('name')} />
        <TextField label="Code" error={errors.code?.message} {...register('code')} />
        <TextField label="Short name" error={errors.shortName?.message} {...register('shortName')} />
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {isSubmitting ? <ButtonSpinner /> : null}
          {editing ? 'Save university' : 'Add university'}
        </button>
        {editing ? (
          <button type="button" className="text-sm text-navy underline" onClick={() => { setEditing(null); reset(); }}>
            Cancel edit
          </button>
        ) : null}
      </form>
      <form className="mt-6 flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update({ q: String(form.get('q') || ''), status: String(form.get('status') || '') });
      }}>
        <input name="q" defaultValue={q} placeholder="Search name or code" className="border border-slate-300 px-3 py-2 text-sm" aria-label="Search universities" />
        <select name="status" defaultValue={status} className="border border-slate-300 px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
        <button type="submit" className="bg-navy px-3 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      {loading ? <div className="mt-4"><Loading /></div> : null}
      {!loading && items.length === 0 ? (
        <EmptyState message="No universities found." onRetry={error ? () => void load() : undefined} />
      ) : null}
      {!loading && items.length > 0 ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.name}</p>
                <p className="mt-1">{item.code || '—'} · {item.status || 'ACTIVE'}</p>
                <div className="mt-3 flex gap-3">
                  <button type="button" className="font-semibold text-navy underline" onClick={() => { setEditing(item); reset({ name: item.name, code: item.code || '', shortName: item.shortName }); }}>
                    Edit
                  </button>
                  <button type="button" className="font-semibold text-navy underline" onClick={() => setConfirm(item)}>
                    {item.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">University</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.code || '—'}</td>
                  <td className="px-3 py-2">{item.status || 'ACTIVE'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <button type="button" className="font-semibold text-navy underline" onClick={() => { setEditing(item); reset({ name: item.name, code: item.code || '', shortName: item.shortName }); }}>
                      Edit
                    </button>
                    {' · '}
                    <button type="button" className="font-semibold text-navy underline" onClick={() => setConfirm(item)}>
                      {item.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      ) : null}
      <Pagination page={page} totalPages={totalPages} total={total} onPage={(next) => update({ page: String(next) })} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.status === 'INACTIVE' ? 'Activate university' : 'Deactivate university'}
        confirmLabel={confirm?.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          void updateUniversityStatusRequest(confirm.id, confirm.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE')
            .then(() => { setConfirm(null); return load(); })
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        {confirm ? `${confirm.status === 'INACTIVE' ? 'Activate' : 'Deactivate'} ${confirm.name}? Linked institutes are kept.` : null}
      </ConfirmDialog>
    </>
  );
}
