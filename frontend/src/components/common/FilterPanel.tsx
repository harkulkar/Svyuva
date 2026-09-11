import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useIsDesktopNav } from '../../hooks/useMediaQuery';

export function FilterPanel({
  children,
  open,
  onOpen,
  onClose,
  onSubmit,
  title = 'Filters'
}: {
  children: ReactNode;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
}) {
  const headingId = useId();
  const drawerId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktopNav();

  useEffect(() => {
    if (!open || isDesktop) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, isDesktop]);

  return (
    <>
      {!isDesktop ? (
        <div className="mt-4">
          <button type="button" className="min-h-11 border border-navy px-4 py-2 text-sm font-semibold text-navy" onClick={onOpen} aria-expanded={open} aria-controls={drawerId}>
            {title}
          </button>
        </div>
      ) : null}
      {isDesktop ? <div className="mt-4">{children}</div> : null}
      {!isDesktop && open ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close filters" onClick={onClose} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            id={drawerId}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-slate-300 bg-white p-4 pb-8"
          >
            <div className="flex items-center justify-between">
              <h2 id={headingId} className="text-lg font-semibold text-navy">
                {title}
              </h2>
              <button ref={closeRef} type="button" className="min-h-11 px-3 text-sm font-semibold text-navy" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="mt-4">{children}</div>
            <button
              type="button"
              className="mt-4 min-h-11 w-full bg-navy px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                onSubmit();
                onClose();
              }}
            >
              Apply filters
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
