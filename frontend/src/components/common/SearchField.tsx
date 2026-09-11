import { useEffect, useId, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ButtonSpinner } from './Loading';

export function SearchField({
  value,
  onChange,
  onSubmit,
  loading = false,
  label = 'Search',
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  loading?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        enterKeyHint="search"
        className="min-h-11 w-full border border-slate-300 px-3 py-2 pr-16 text-sm"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit?.();
          }
        }}
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-1">
        {loading ? <ButtonSpinner /> : null}
        {value ? (
          <button type="button" className="px-2 text-sm text-navy" onClick={() => onChange('')} aria-label="Clear search">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DebouncedSearchField({
  value,
  onDebouncedChange,
  delayMs = 400,
  label,
  placeholder
}: {
  value: string;
  onDebouncedChange: (value: string) => void;
  delayMs?: number;
  label?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, delayMs);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) onDebouncedChange(debounced);
    // Parent commit is intentionally omitted from deps; URL `value` is compared on each debounce tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <SearchField
      value={draft}
      onChange={(next) => {
        setDraft(next);
        if (next === '') onDebouncedChange('');
      }}
      onSubmit={() => onDebouncedChange(draft)}
      loading={draft !== value && draft !== ''}
      label={label}
      placeholder={placeholder}
    />
  );
}

