import { useEffect, useRef, type ReactNode } from 'react';

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={() => { if (!busy) onCancel(); }} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="relative w-full max-w-md border border-slate-300 bg-white p-5 shadow-lg">
        <h2 id="confirm-title" className="text-lg font-semibold text-navy">{title}</h2>
        <div className="mt-3 text-sm text-slate-700">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="min-h-11 border border-slate-300 px-3 py-2 text-sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`min-h-11 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-red-800' : 'bg-navy'}`}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mt-6 border border-slate-300 bg-white px-4 py-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <button type="button" className="mt-3 text-sm font-semibold text-navy underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SimpleBars({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="border border-slate-300 bg-white p-5">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-slate-600">No data yet.</p> : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex justify-between text-xs text-slate-600">
                <span>{item.label}</span>
                <span>{item.count}</span>
              </div>
              <div className="mt-1 h-2 bg-slate-100">
                <div className="h-2 bg-navy" style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}