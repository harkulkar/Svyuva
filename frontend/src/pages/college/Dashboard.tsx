import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { StatCard } from '../../components/common/StatCard';
import { QuickActions } from '../../components/common/QuickActions';
import { SimpleBars } from '../../components/common/AdminUi';
import { PageError, SkeletonGrid } from '../../components/common/PageState';
import { fetchCollegeDashboard, fetchCollegeInsights, fetchUnreadNotifications, getApiErrorMessage } from '../../services/api';
import { COLLEGE_QUICK_ACTIONS } from '../../data/portalNav';
import { ActionCenter } from '../../components/common/ActionCenter';
import type { CollegeDashboard } from '../../types/auth';
import type { NotificationItem } from '../../types/notifications';

export function CollegeDashboardPage() {
  const [data, setData] = useState<CollegeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<{ attention: string[]; aiUsed: boolean } | null>(null);
  const [recent, setRecent] = useState<NotificationItem[]>([]);

  function load() {
    setError(null);
    void fetchCollegeDashboard()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err, 'We couldn\'t load the dashboard. Please try again.')));
    void fetchCollegeInsights().then(setInsights).catch(() => undefined);
    void fetchUnreadNotifications()
      .then((result) => setRecent(result.recent.slice(0, 5)))
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="College dashboard" path="/college" />
      <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
      {error ? <PageError message={error} onRetry={load} /> : null}
      {!data && !error ? <SkeletonGrid label="Loading dashboard…" /> : null}
      {data ? (
        <>
          <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total students" value={data.students.total} to="/college/students" />
            <StatCard title="My submissions" value={data.submissions?.total ?? 0} to="/college/submissions" />
            <StatCard title="Pending documents" value={data.documents?.pending ?? 0} to="/college/documents" />
            <StatCard title="Insurance records" value={data.insurance?.total ?? 0} to="/college/insurance" />
            <StatCard title="Pending payments" value={data.payments?.pending ?? 0} to="/college/payment-status" />
            <StatCard title="Generated e-cards" value={data.ecards?.generated ?? 0} to="/college/ecard" />
            <StatCard title="Institute status" value={data.instituteStatus} to="/college/profile" />
          </div>
          {data.actionItems?.length || data.pendingActions?.length ? (
            <ActionCenter
              data={{
                count: data.actionItems?.length || data.pendingActions?.length || 0,
                headline: data.actionHeadline || `${data.actionItems?.length || data.pendingActions?.length || 0} actions require your attention`,
                items:
                  data.actionItems?.length
                    ? data.actionItems
                    : (data.pendingActions || []).map((item, index) => ({
                        id: `pending-${index}`,
                        title: item,
                        detail: item,
                        href: '/college/profile',
                        kind: 'pending'
                      }))
              }}
            />
          ) : (
            <ActionCenter data={{ count: 0, headline: 'No pending actions', items: [] }} />
          )}
          <QuickActions actions={COLLEGE_QUICK_ACTIONS} />
          <section className="mt-6 border border-slate-300 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-navy">My submissions</h2>
              <Link to="/college/submissions/new" className="bg-navy px-3 py-2 font-semibold text-white">New submission</Link>
            </div>
            <p className="mt-2 text-slate-600">
              {data.submissions
                ? `${data.submissions.total} total · ${data.submissions.byStatus.DRAFT || 0} draft · ${data.submissions.byStatus.SUBMITTED || 0} submitted · ${data.submissions.byStatus.CORRECTION_REQUIRED || 0} correction required`
                : 'Open My submissions to continue an Excel upload, premium review, and submit.'}
            </p>
            <Link to="/college/submissions" className="mt-2 inline-block underline">View all submissions</Link>
          </section>
          {recent.length ? (
            <section className="mt-6 border border-slate-300 bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-navy">Recent notifications</h2>
                <Link to="/college/notifications" className="font-semibold text-navy underline">
                  View details
                </Link>
              </div>
              <ul className="mt-3 divide-y">
                {recent.map((item) => (
                  <li key={item.id} className="py-2">
                    <Link to={item.actionUrl || '/college/notifications'} className="block">
                      <span className="font-medium text-navy">{item.title}</span>
                      <span className="mt-1 block text-xs text-slate-600">{item.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {insights ? (
            <section className="mt-4 border border-slate-300 bg-white p-4 text-sm">
              <h2 className="font-semibold text-navy">What requires attention</h2>
              <p className="text-xs text-slate-500">Your institute only. {insights.aiUsed ? 'AI restated these counts.' : 'AI not used.'}</p>
              <ul className="mt-2 list-disc pl-5">
                {insights.attention.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-2">
            <SimpleBars title="Students by status" items={data.charts?.studentsByStatus || []} />
            <SimpleBars title="Insurance status (stored values)" items={data.charts?.insuranceByStatus || []} />
          </div>
        </>
      ) : null}
    </>
  );
}

export function CollegeComingSoon({ title }: { title: string }) {
  return (
    <>
      <Seo title={title} />
      <h1 className="text-2xl font-semibold text-navy">{title}</h1>
      <p className="mt-4 text-sm text-slate-700">This module will be available in a future phase.</p>
    </>
  );
}
