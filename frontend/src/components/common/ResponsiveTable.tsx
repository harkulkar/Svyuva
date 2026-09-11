import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type TableColumn<T> = {
  key: string;
  header: string;
  hideOnMobile?: boolean;
  sticky?: boolean;
  render: (row: T) => ReactNode;
};

export function ResponsiveTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  empty,
  href,
  cardTitle,
  cardLines
}: {
  caption: string;
  columns: TableColumn<T>[];
  rows: T[];
  empty: string;
  href?: (row: T) => string;
  cardTitle: (row: T) => string;
  cardLines?: (row: T) => string[];
}) {
  return (
    <>
      <div className="mt-6 space-y-3 md:hidden">
        {rows.length === 0 ? <p className="text-sm text-slate-600">{empty}</p> : null}
        {rows.map((row) => {
          const to = href?.(row);
          const inner = (
            <article className="border border-slate-300 bg-white p-4 text-sm">
              <p className="font-semibold text-navy">{cardTitle(row)}</p>
              {(cardLines?.(row) || []).map((line) => (
                <p key={line} className="mt-1 text-slate-700">
                  {line}
                </p>
              ))}
              {to ? <p className="mt-3 font-semibold text-navy">View details</p> : null}
            </article>
          );
          return to ? (
            <Link key={row.id} to={to} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-saffron">
              {inner}
            </Link>
          ) : (
            <div key={row.id}>{inner}</div>
          );
        })}
      </div>
      <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3 py-2 ${col.sticky ? 'sticky left-0 z-10 bg-slate-50' : ''} ${col.hideOnMobile ? '' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2 ${col.sticky ? 'sticky left-0 bg-white' : ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-3 py-4 text-sm text-slate-600">{empty}</p> : null}
      </div>
    </>
  );
}
