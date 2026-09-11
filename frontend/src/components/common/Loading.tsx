export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy" role="status">
      {label}
    </p>
  );
}

export function ButtonSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}
