import { useEffect, useState } from 'react';
import { fetchTimeline, getApiErrorMessage } from '../../services/api';
import type { TimelineItem } from '../../types/notifications';

export function ActivityTimeline({
  role,
  kind,
  id
}: {
  role: 'ADMIN' | 'COLLEGE';
  kind: 'institutes' | 'students';
  id: string;
}) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTimeline(role, kind, id)
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [role, kind, id]);

  return (
    <section className="mt-6 border border-slate-300 bg-white p-5">
      <h2 className="text-sm font-semibold text-navy">Activity timeline</h2>
      <p className="mt-1 text-xs text-slate-500">From audit records only. History is not invented.</p>
      {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}
      {items.length === 0 && !error ? <p className="mt-3 text-sm text-slate-600">No recorded events yet.</p> : (
        <ol className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="border-l-2 border-saffron pl-3">
              <p className="font-medium text-navy">{item.action}</p>
              <p className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
