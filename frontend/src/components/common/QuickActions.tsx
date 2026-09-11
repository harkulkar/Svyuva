import { Link } from 'react-router-dom';

export type QuickAction = { to: string; label: string };

export function QuickActions({ actions, title = 'Quick actions' }: { actions: QuickAction[]; title?: string }) {
  if (actions.length === 0) return null;
  return (
    <section className="mt-6" aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="text-sm font-semibold text-navy">
        {title}
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((action) => (
          <li key={`${action.to}-${action.label}`}>
            <Link
              to={action.to}
              className="flex min-h-11 items-center justify-center border border-navy bg-white px-2 py-2 text-center text-sm font-semibold text-navy hover:bg-navy hover:text-white"
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
