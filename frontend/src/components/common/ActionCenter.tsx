import { Link } from 'react-router-dom';
import type { ActionCenter } from '../../types/workflow';

export function ActionCenter({ data }: { data: ActionCenter }) {
  if (!data.items.length) {
    return (
      <section className="mt-4 border border-slate-300 bg-white px-4 py-3 text-sm" aria-live="polite">
        <h2 className="font-semibold text-navy">What do I need to do?</h2>
        <p className="mt-2 text-slate-600">No pending actions right now.</p>
      </section>
    );
  }
  return (
    <section className="mt-4 border border-saffron bg-white px-4 py-3 text-sm" aria-live="polite">
      <h2 className="font-semibold text-navy">What do I need to do?</h2>
      <p className="mt-1 text-slate-700">{data.headline}</p>
      <ol className="mt-3 space-y-2">
        {data.items.map((item, index) => (
          <li key={item.id}>
            <Link to={item.href} className="block min-h-11 border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <span className="font-semibold text-navy">
                {index + 1}. {item.title}
              </span>
              <span className="mt-1 block text-xs text-slate-600">{item.detail}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
