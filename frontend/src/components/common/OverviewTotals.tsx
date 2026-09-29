import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type OverviewItem = {
  title: string;
  value: number;
  to: string;
  barClass: string;
  accentClass: string;
  icon: ReactNode;
};

function formatCount(value: number) {
  return value.toLocaleString('en-IN');
}

function UniversityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M12 3 3 8v2h18V8L12 3Zm1 7h7v9h-3v-5h-4v5H4v-9h8Zm-6 2H5v2h2v-2Zm0 3H5v2h2v-2Zm4-3H9v2h2v-2Zm0 3H9v2h2v-2Z" />
    </svg>
  );
}

function InstituteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M4 20V8l8-5 8 5v12h-6v-6H10v6H4Zm2-2h2v-4h8v4h2V9.2L12 5.4 6 9.2V18Z" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0-6a2 2 0 1 1-2 2 2 2 0 0 1 2-2Zm0 8c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Zm-6 4c.5-1.4 3.4-3 6-3s5.5 1.6 6 3H6Z" />
    </svg>
  );
}

export function OverviewTotals({
  universities,
  institutes,
  students
}: {
  universities: number;
  institutes: number;
  students: number;
}) {
  const max = Math.max(1, universities, institutes, students);
  const items: OverviewItem[] = [
    {
      title: 'Total universities',
      value: universities,
      to: '/admin/universities',
      barClass: 'bg-navy',
      accentClass: 'bg-navy text-white',
      icon: <UniversityIcon />
    },
    {
      title: 'Total institutes',
      value: institutes,
      to: '/admin/institutes',
      barClass: 'bg-saffron',
      accentClass: 'bg-saffron text-navy',
      icon: <InstituteIcon />
    },
    {
      title: 'Total students',
      value: students,
      to: '/admin/students',
      barClass: 'bg-indiaGreen',
      accentClass: 'bg-indiaGreen text-white',
      icon: <StudentIcon />
    }
  ];

  return (
    <section className="mt-6" aria-labelledby="admin-overview-heading">
      <h2 id="admin-overview-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Overview
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const width = Math.max(6, Math.round((item.value / max) * 100));
          return (
            <Link
              key={item.title}
              to={item.to}
              className="block overflow-hidden border border-slate-300 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron hover:border-navy"
            >
              <div className={`flex items-center gap-3 px-4 py-3 ${item.accentClass}`}>
                {item.icon}
                <p className="text-sm font-semibold">{item.title}</p>
              </div>
              <div className="p-4">
                <p className="text-4xl font-semibold tabular-nums text-navy sm:text-5xl">{formatCount(item.value)}</p>
                <p className="mt-3 text-xs text-slate-600">View details</p>
                <div className="mt-3 h-3 bg-slate-100" aria-hidden="true">
                  <div className={`h-3 ${item.barClass}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
