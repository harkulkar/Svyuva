const DATE_RANGES = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'previous_month', label: 'Previous month' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom range' }
];

export function DateRangeFilters({
  range,
  from,
  to,
  onChange
}: {
  range: string;
  from: string;
  to: string;
  onChange: (next: { range: string; from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <label>
        Date range
        <select
          className="ml-2 border border-slate-300 px-2 py-1"
          value={range}
          onChange={(event) => onChange({ range: event.target.value, from, to })}
        >
          {DATE_RANGES.map((item) => (
            <option key={item.value || 'all'} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>
      {range === 'custom' ? (
        <>
          <label>
            From
            <input type="date" className="ml-2 border px-2 py-1" value={from} onChange={(event) => onChange({ range, from: event.target.value, to })} />
          </label>
          <label>
            To
            <input type="date" className="ml-2 border px-2 py-1" value={to} onChange={(event) => onChange({ range, from, to: event.target.value })} />
          </label>
        </>
      ) : null}
    </div>
  );
}
