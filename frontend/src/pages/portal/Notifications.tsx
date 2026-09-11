import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/AdminUi';
import {
  fetchNotificationPreferences,
  fetchNotifications,
  fetchPushStatus,
  getApiErrorMessage,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences
} from '../../services/api';
import type { NotificationItem } from '../../types/notifications';

const TYPES = ['', 'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'STUDENT_UPLOAD_COMPLETED', 'REMINDER', 'ANNOUNCEMENT', 'SYSTEM_ALERT', 'REVIEW_REQUIRED'];

export function NotificationsPage({ title, path }: { title: string; path: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<{ notifyInApp: boolean; notifyEmail: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushNote, setPushNote] = useState<string | null>(null);

  function load(nextPage = page) {
    setError(null);
    setLoading(true);
    void fetchNotifications({ page: nextPage, limit: 20, type: type || undefined })
      .then((data) => {
        setItems(data.items);
        setUnread(data.unreadCount);
        setTotalPages(data.pagination.totalPages);
        setPage(data.pagination.page);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'We couldn\'t load notifications. Please try again.')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
    void fetchNotificationPreferences().then(setPrefs).catch(() => undefined);
    void fetchPushStatus()
      .then((data) => setPushNote(data.note || null))
      .catch(() => undefined);
    // type is the filter; load reads current type
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <>
      <Seo title={title} path={path} />
      <h1 className="text-2xl font-semibold text-navy">Notifications</h1>
      <p className="mt-2 text-sm text-slate-700">{unread} unread. Critical account notices cannot be turned off.</p>
      {pushNote ? <p className="mt-1 text-xs text-slate-600">{pushNote}</p> : null}
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={() => load()}>Retry</button></div> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="text-sm">
          Type
          <select className="ml-2 min-h-11 border border-slate-300 px-2 py-1" value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type">
            {TYPES.map((value) => (
              <option key={value || 'all'} value={value}>{value || 'All'}</option>
            ))}
          </select>
        </label>
        <button type="button" className="min-h-11 border border-navy px-3 py-1 text-sm text-navy" onClick={() => void markAllNotificationsRead().then(() => load())}>
          Mark all as read
        </button>
      </div>
      {prefs ? (
        <form
          className="mt-4 flex flex-wrap gap-4 border border-slate-300 bg-white p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void updateNotificationPreferences(prefs).catch((err) => setError(getApiErrorMessage(err)));
          }}
        >
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.notifyInApp} onChange={(event) => setPrefs({ ...prefs, notifyInApp: event.target.checked })} />
            In-app (non-critical)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.notifyEmail} onChange={(event) => setPrefs({ ...prefs, notifyEmail: event.target.checked })} />
            Email (non-critical)
          </label>
          <button type="submit" className="bg-navy px-3 py-1 text-white">Save preferences</button>
        </form>
      ) : null}
      {loading ? <div className="mt-4"><Loading /></div> : null}
      {!loading && !items.length && !error ? <EmptyState message="No notifications." /> : null}
      {!loading && items.length ? (
      <ul className="mt-4 divide-y border border-slate-300 bg-white">
        {items.map((item) => (
          <li key={item.id} className={`px-4 py-3 ${item.status === 'UNREAD' ? 'bg-amber-50' : ''}`}>
            <Link
              to={item.actionUrl || path}
              className="block"
              onClick={() => {
                if (item.status === 'UNREAD') void markNotificationRead(item.id).then(() => load(page));
              }}
            >
              <p className="text-sm font-semibold text-navy">{item.title}</p>
              <p className="mt-1 text-sm text-slate-700">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500">{item.type} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
            </Link>
          </li>
        ))}
      </ul>
      ) : null}
      {totalPages > 1 ? (
        <div className="mt-4 flex gap-2">
          <button type="button" className="border px-3 py-1 text-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <button type="button" className="border px-3 py-1 text-sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</button>
        </div>
      ) : null}
    </>
  );
}
