export function Pagination({
  page,
  totalPages,
  total,
  onPage
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-slate-600">{total} records</p>
      <div className="flex gap-2">
        <button type="button" className="min-h-11 border border-slate-300 px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span className="px-2 py-2">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          className="min-h-11 border border-slate-300 px-3 py-1 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
