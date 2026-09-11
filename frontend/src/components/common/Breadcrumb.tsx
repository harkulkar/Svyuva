import { Link } from 'react-router-dom';

export type Crumb = { label: string; to?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-slate-600">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              )}
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-navy' : ''}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="underline-offset-2 hover:text-navy hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
