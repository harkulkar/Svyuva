import { Link } from 'react-router-dom';

export function StatCard({
  title,
  value,
  to,
  hint
}: {
  title: string;
  value: string | number;
  to?: string;
  hint?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-navy sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
      {to ? <p className="mt-2 text-sm font-semibold text-navy">View details</p> : null}
    </>
  );
  const className = 'block min-h-[5.5rem] border border-slate-300 bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron';
  if (to) {
    return (
      <Link to={to} className={`${className} hover:border-navy`}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}
