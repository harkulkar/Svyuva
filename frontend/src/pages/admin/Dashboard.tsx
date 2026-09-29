import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { EmptyState, SimpleBars } from '../../components/common/AdminUi';
import { OverviewTotals } from '../../components/common/OverviewTotals';
import { StatCard } from '../../components/common/StatCard';
import { QuickActions } from '../../components/common/QuickActions';
import { PageError, SkeletonGrid } from '../../components/common/PageState';
import { ADMIN_QUICK_ACTIONS } from '../../data/portalNav';
import { fetchAdminAnalytics, fetchAdminDashboard, fetchAdminInsights, fetchAdminSearch, getApiErrorMessage } from '../../services/api';
import { DateRangeFilters } from '../../components/common/DateRangeFilters';
import { SearchField } from '../../components/common/SearchField';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { AdminDashboard } from '../../types/auth';

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 400);
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<{ institutes: Array<{ id: string; name: string; university: string }>; students: Array<{ id: string; name: string; studentId: string; institute: string }> } | null>(null);
  const [range, setRange] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [analytics, setAnalytics] = useState<{ charts?: Record<string, Array<{ label: string; count: number }>>; universities?: Record<string, number>; institutes?: Record<string, number>; students?: Record<string, number>; insurance?: Record<string, number>; payments?: Record<string, number>; documents?: Record<string, number>; ecards?: Record<string, number> } | null>(null);
  const [insights, setInsights] = useState<{ attention: string[]; summary: string; aiUsed: boolean } | null>(null);

  function load() {
    setError(null);
    void fetchAdminDashboard()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
    void fetchAdminInsights().then(setInsights).catch(() => undefined);
  }, []);

  useEffect(() => {
    const params: Record<string, string | undefined> = {
      range: range || undefined,
      from: range === 'custom' && from ? new Date(from).toISOString() : undefined,
      to: range === 'custom' && to ? new Date(`${to}T23:59:59.000Z`).toISOString() : undefined
    };
    void fetchAdminAnalytics(params).then(setAnalytics).catch(() => undefined);
  }, [range, from, to]);

  useEffect(() => {
    const term = debouncedQ.trim();
    if (term.length < 2) {
      setHits(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    void fetchAdminSearch(term)
      .then((data) => {
        if (!cancelled) setHits(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  return (
    <>
      <Seo title="Admin dashboard" path="/admin" />
      <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-700">Figures are loaded from the database.</p>
      {error ? <PageError message={error} onRetry={load} /> : null}
      {!data && !error ? <SkeletonGrid label="Loading dashboard…" /> : null}
      {data ? (
        <>
          <OverviewTotals universities={data.universities} institutes={data.institutes} students={data.students} />
          {data.notifications.pendingRegistrations > 0 ? (
            <p className="mt-4 border border-saffron bg-white px-4 py-3 text-sm" role="status">
              {data.notifications.pendingRegistrations} pending college registration{data.notifications.pendingRegistrations === 1 ? '' : 's'}.{' '}
              <Link to="/admin/registrations" className="font-semibold text-navy underline">Review</Link>
              {' · '}
              <Link to="/admin/work-queue" className="font-semibold text-navy underline">Work queue</Link>
            </p>
          ) : null}
          <div className="mt-4">
            <SearchField
              value={q}
              onChange={setQ}
              loading={searching}
              label="Admin search"
              placeholder="Search institutes or students (2+ characters)"
              onSubmit={() => {
                if (q.trim().length >= 2) void fetchAdminSearch(q.trim()).then(setHits).catch((err) => setError(getApiErrorMessage(err)));
              }}
            />
          </div>
          {hits && hits.institutes.length === 0 && hits.students.length === 0 ? (
            <p className="mt-3 border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">No matching institutes or students.</p>
          ) : null}
          {hits ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
              <div className="border border-slate-300 bg-white p-3">
                <p className="font-semibold text-navy">Institutes</p>
                {hits.institutes.length === 0 ? <p className="mt-2 text-slate-600">No matching institutes.</p> : hits.institutes.map((item) => (
                  <Link key={item.id} to={`/admin/institutes/${item.id}`} className="mt-2 block underline">{item.name}</Link>
                ))}
              </div>
              <div className="border border-slate-300 bg-white p-3">
                <p className="font-semibold text-navy">Students</p>
                {hits.students.length === 0 ? <p className="mt-2 text-slate-600">No matching students.</p> : hits.students.map((item) => (
                  <Link key={item.id} to={`/admin/students/${item.id}`} className="mt-2 block underline">{item.name} ({item.studentId})</Link>
                ))}
              </div>
            </div>
          ) : null}
          <QuickActions actions={ADMIN_QUICK_ACTIONS} />
          <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard title="System status" value={data.operations?.systemStatus ?? 'unknown'} to="/admin/system-health" />
            <StatCard title="Pending college approvals" value={data.operations?.pendingCollegeApprovals ?? data.pendingInstitutes} to="/admin/registrations" />
            <StatCard title="College submissions" value={data.submissions?.total ?? 0} to="/admin/submissions" />
            <StatCard title="Submitted packs" value={data.submissions?.byStatus.SUBMITTED ?? 0} to="/admin/submissions" />
            <StatCard title="Under review" value={data.submissions?.byStatus.UNDER_REVIEW ?? 0} to="/admin/submissions" />
            <StatCard title="Correction required" value={data.submissions?.byStatus.CORRECTION_REQUIRED ?? 0} to="/admin/submissions" />
            <StatCard title="Approved submissions" value={data.submissions?.byStatus.APPROVED ?? 0} to="/admin/submissions" />
            <StatCard title="Rejected submissions" value={data.submissions?.byStatus.REJECTED ?? 0} to="/admin/submissions" />
            <StatCard title="Students in submitted packs" value={data.submissions?.totalStudentsSubmitted ?? 0} to="/admin/submissions" />
            <StatCard title="Calculated premium (submitted)" value={data.submissions?.totalCalculatedPremium ?? 0} to="/admin/submissions" />
            <StatCard title="Pending institutes" value={data.pendingInstitutes} to="/admin/institutes" />
            <StatCard title="Insurance records" value={analytics?.insurance?.total ?? '—'} to="/admin/insurance" />
            <StatCard title="Missing documents" value={analytics?.documents?.missing ?? '—'} />
            <StatCard title="Payment records" value={analytics?.payments?.total ?? '—'} />
            <StatCard title="E-card records" value={analytics?.ecards?.total ?? '—'} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Operational cards are separate from scheme statistics. Open <Link to="/admin/system-health" className="underline">System health</Link> for detail. Optional: <Link to="/admin/ai-assistant" className="underline">AI assistant</Link>, <Link to="/admin/knowledge" className="underline">knowledge</Link>, <Link to="/admin/ai-usage" className="underline">AI usage</Link>.</p>
          {data.operations?.recentErrors?.length ? (
            <section className="mt-4 border border-slate-300 bg-white">
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-navy">Recent errors</h2>
              <ul className="px-4 py-3 text-sm">
                {data.operations.recentErrors.map((item) => (
                  <li key={`${item.timestamp}-${item.requestId || item.route}`} className="border-t border-slate-100 py-2">
                    {item.category} {item.status} {item.route} {item.requestId ? `(Reference ID: ${item.requestId})` : ''}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-6 hidden gap-4 md:grid sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Active universities" value={data.activeUniversities ?? '—'} />
            <Card title="Inactive universities" value={data.inactiveUniversities ?? '—'} />
            <Card title="Active institutes" value={data.activeInstitutes} />
            <Card title="Pending institutes" value={data.pendingInstitutes} />
            <Card title="Rejected institutes" value={data.rejectedInstitutes} />
            <Card title="Inactive institutes" value={data.inactiveInstitutes ?? '—'} />
            <Card title="Active students" value={data.activeStudents} />
            <Card title="Inactive students" value={data.inactiveStudents} />
            <Card title="Insurance records" value={analytics?.insurance?.total ?? '—'} />
            <Card title="Payment records" value={analytics?.payments?.total ?? '—'} />
            <Card title="Document records" value={analytics?.documents?.uploaded ?? analytics?.documents?.total ?? '—'} />
            <Card title="Missing documents" value={analytics?.documents?.missing ?? '—'} />
            <Card title="E-card records" value={analytics?.ecards?.total ?? '—'} />
          </div>
          {insights ? (
            <section className="mt-6 border border-slate-300 bg-white p-5 text-sm">
              <h2 className="font-semibold text-navy">What requires attention</h2>
              <p className="mt-1 text-xs text-slate-500">Computed from live counts. Optional AI restates those numbers only ({insights.aiUsed ? 'AI used' : 'AI not used'}).</p>
              <ul className="mt-2 list-disc pl-5">
                {insights.attention.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          ) : null}
          <div className="mt-6">
            <DateRangeFilters range={range} from={from} to={to} onChange={(next) => { setRange(next.range); setFrom(next.from); setTo(next.to); }} />
          </div>
          <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-3">
            <SimpleBars title="Institutes by status" items={data.charts.institutesByStatus} />
            <SimpleBars title="Students by academic year" items={data.charts.studentsByAcademicYear} />
            <SimpleBars title="Institutes by university" items={data.charts.institutesByUniversity} />
            <SimpleBars title="Students by university" items={data.charts.studentsByUniversity || analytics?.charts?.studentsByUniversity || []} />
            <SimpleBars title="Students by district" items={data.charts.studentsByDistrict || analytics?.charts?.studentsByDistrict || []} />
            <SimpleBars title="Insurance status (stored values)" items={data.charts.insuranceByStatus || analytics?.charts?.insuranceByStatus || []} />
            <SimpleBars title="Payment status (stored values)" items={data.charts.paymentsByStatus || analytics?.charts?.paymentsByStatus || []} />
            <SimpleBars title="Document file status" items={data.charts.documentsByStatus || analytics?.charts?.documentsByStatus || []} />
            <SimpleBars title="Monthly registrations" items={analytics?.charts?.monthlyRegistrations || []} />
            <SimpleBars title="Monthly student uploads" items={analytics?.charts?.monthlyStudentUploads || []} />
            <SimpleBars title="Monthly insurance records" items={analytics?.charts?.monthlyInsuranceEnrollments || []} />
            <SimpleBars title="Monthly payment activity" items={analytics?.charts?.monthlyPaymentActivity || []} />
          </div>
          <section className="mt-6 border border-slate-300 bg-white">
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-navy">Recent activity</h2>
            {data.recentActivity.length === 0 ? <p className="px-4 py-6 text-sm text-slate-600">No recent administrative activity.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Date/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{item.action}</td>
                        <td className="px-3 py-2">{item.user.name}</td>
                        <td className="px-3 py-2">{item.entity}</td>
                        <td className="px-3 py-2">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
      {data && data.universities === 0 && data.institutes === 0 ? <EmptyState message="No administrative records yet." /> : null}
    </>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="border border-slate-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}
