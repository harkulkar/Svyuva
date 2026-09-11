export function WorkflowStatusBadge({ status }: { status: string }) {
  const tone =
    /approved|verified|completed|generated|active/i.test(status)
      ? 'bg-indiaGreen text-white'
      : /reject|fail/i.test(status)
        ? 'bg-red-800 text-white'
        : /correction|replacement|overdue/i.test(status)
          ? 'bg-saffron text-navy'
          : 'bg-slate-200 text-navy';
  return (
    <span className={`inline-flex min-h-8 items-center px-2 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
