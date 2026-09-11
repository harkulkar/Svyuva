import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUnreadNotifications, getApiErrorMessage, markNotificationRead } from '../../services/api';
import type { NotificationItem } from '../../types/notifications';

export function NotificationBell({ viewAllTo, compact = false }: { viewAllTo: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function load() {
    void fetchUnreadNotifications()
      .then((data) => {
        setUnread(data.unreadCount);
        setRecent(data.recent);
        setError(null);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        className={`relative min-h-11 border border-navy px-3 py-2 text-sm font-semibold text-navy ${compact ? 'w-11 px-0' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
      >
        {compact ? <span aria-hidden="true">🔔</span> : 'Notifications'}
        {unread > 0 ? (
          <span className="absolute -right-2 -top-2 min-w-[1.25rem] rounded-full bg-saffron px-1 text-center text-xs text-navy-dark">{unread > 99 ? '99+' : unread}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] border border-slate-300 bg-white shadow-lg">
          <p className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-navy">Recent notifications</p>
          {error ? <p className="px-3 py-2 text-sm text-red-800">{error}</p> : null}
          {recent.length === 0 ? <p className="px-3 py-4 text-sm text-slate-600">No notifications yet.</p> : (
            <ul className="max-h-80 overflow-y-auto text-sm">
              {recent.map((item) => (
                <li key={item.id} className="border-t border-slate-100">
                  <Link
                    to={item.actionUrl || viewAllTo}
                    className="block px-3 py-2 hover:bg-slate-50"
                    onClick={() => {
                      if (item.status === 'UNREAD') void markNotificationRead(item.id).then(load);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-navy">{item.title}</span>
                    <span className="mt-1 block text-xs text-slate-600">{item.message}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to={viewAllTo} className="block border-t border-slate-200 px-3 py-2 text-sm font-semibold text-navy" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
