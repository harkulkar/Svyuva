import type { ExcelIssue } from '../../types/student';

export function ValidationSummary({
  totalRows,
  valid,
  invalid,
  duplicates,
  issues,
  onDownloadErrors
}: {
  totalRows: number;
  valid: number;
  invalid: number;
  duplicates: number;
  issues?: ExcelIssue[];
  onDownloadErrors?: () => void;
}) {
  return (
    <section className="border border-slate-300 bg-white p-4 text-sm">
      <h2 className="font-semibold text-navy">Validation result</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <li>Total students: {totalRows.toLocaleString()}</li>
        <li>Valid: {valid.toLocaleString()}</li>
        <li>Invalid: {invalid.toLocaleString()}</li>
        <li>Duplicates: {duplicates.toLocaleString()}</li>
      </ul>
      {onDownloadErrors && (invalid > 0 || duplicates > 0) ? (
        <button type="button" className="mt-3 min-h-11 border border-navy px-3 py-2 text-navy" onClick={onDownloadErrors}>
          Download error report
        </button>
      ) : null}
      {issues && issues.length ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
          {issues.slice(0, 50).map((issue) => (
            <li key={`${issue.row}-${issue.identifier}-${issue.message}`} className="border-l-2 border-saffron pl-3">
              <p className="font-medium text-navy">Row {issue.row}</p>
              <p>{issue.field || 'Field'}</p>
              <p className="text-slate-600">{issue.message}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
