import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchAdminSupport, getApiErrorMessage, submitDataCorrection } from '../../services/api';

type SupportData = Awaited<ReturnType<typeof fetchAdminSupport>>;

export function AdminSupportPage() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<SupportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState({ entity: 'Student' as 'Student' | 'Institute' | 'User', entityId: '', field: '', value: '', reason: '' });
  const [correctionMsg, setCorrectionMsg] = useState<string | null>(null);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setData(await fetchAdminSupport(q.trim()));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCorrect(event: FormEvent) {
    event.preventDefault();
    setCorrectionMsg(null);
    setError(null);
    try {
      const result = await submitDataCorrection(correction);
      setCorrectionMsg(`Updated ${result.field} from “${result.oldValue}” to “${result.newValue}”. The change is in the audit log.`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Support" path="/admin/support" />
      <h1 className="text-2xl font-semibold text-navy">Support</h1>
      <p className="mt-2 text-sm text-slate-700">Search accounts and records. Passwords are never shown. Corrections are limited to allowed fields and are audit-logged.</p>
      <form className="mt-4 flex gap-2" onSubmit={(event) => void onSearch(event)}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search user, institute, or student" className="flex-1 border border-slate-300 px-3 py-2 text-sm" aria-label="Support search" />
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white" disabled={busy}>
          Search
        </button>
      </form>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {busy ? <div className="mt-4"><Loading /></div> : null}
      {data ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 text-sm">
          <Result title="Users" empty="No matching users.">
            {data.users.map((item) => (
              <li key={item.id}>
                <Link className="font-semibold underline" to={`/admin/users?q=${encodeURIComponent(item.email)}`}>{item.name}</Link>
                {' '}({item.email}) — {item.role} / {item.status}
              </li>
            ))}
          </Result>
          <Result title="Institutes" empty="No matching institutes.">
            {data.institutes.map((item) => (
              <li key={item.id}>
                <Link className="font-semibold underline" to={`/admin/institutes/${item.id}`}>{item.name}</Link>
                {' '}— {item.status}
              </li>
            ))}
          </Result>
          <Result title="Students" empty="No matching students.">
            {data.students.map((item) => (
              <li key={item.id}>
                <Link className="font-semibold underline" to={`/admin/students/${item.id}`}>{item.name}</Link>
                {' '}({item.studentId}) — {item.status}
              </li>
            ))}
          </Result>
          <Result title="Recent failed operations" empty="No recent failed operations.">
            {data.recentFailedOperations.map((item) => (
              <li key={item.id}>
                {item.action} {item.entity} {item.requestId ? `(Reference ID: ${item.requestId})` : ''}
              </li>
            ))}
          </Result>
        </div>
      ) : null}

      <section className="mt-8 border border-slate-300 bg-white p-5">
        <h2 className="text-sm font-semibold text-navy">Data correction</h2>
        <p className="mt-2 text-sm text-slate-600">Does not allow arbitrary database edits. Status changes use the existing Users / Institutes / Students screens.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onCorrect(event)}>
          <label className="text-sm">
            Entity
            <select className="mt-1 w-full border border-slate-300 px-3 py-2" value={correction.entity} onChange={(event) => setCorrection({ ...correction, entity: event.target.value as 'Student' | 'Institute' | 'User' })}>
              <option value="Student">Student</option>
              <option value="Institute">Institute</option>
              <option value="User">User</option>
            </select>
          </label>
          <label className="text-sm">
            Record ID
            <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={correction.entityId} onChange={(event) => setCorrection({ ...correction, entityId: event.target.value })} required />
          </label>
          <label className="text-sm">
            Field
            <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={correction.field} onChange={(event) => setCorrection({ ...correction, field: event.target.value })} required />
          </label>
          <label className="text-sm">
            New value
            <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={correction.value} onChange={(event) => setCorrection({ ...correction, value: event.target.value })} required />
          </label>
          <label className="text-sm sm:col-span-2">
            Reason
            <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={correction.reason} onChange={(event) => setCorrection({ ...correction, reason: event.target.value })} required minLength={8} />
          </label>
          <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Save correction</button>
        </form>
        {correctionMsg ? <p className="mt-3 text-sm text-green-800">{correctionMsg}</p> : null}
      </section>
    </>
  );
}

function Result({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className="border border-slate-300 bg-white p-4">
      <h2 className="font-semibold text-navy">{title}</h2>
      {items.filter(Boolean).length === 0 ? <p className="mt-2 text-slate-600">{empty}</p> : <ul className="mt-2 space-y-2">{children}</ul>}
    </div>
  );
}
