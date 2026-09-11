import { Loading } from './Loading';
import { EmptyState } from './AdminUi';
import { ErrorMessage } from './ErrorMessage';

export function SkeletonGrid({ count = 4, label = 'Loading…' }: { count?: number; label?: string }) {
  return (
    <div className="mt-4" aria-busy="true" aria-live="polite">
      <Loading label={label} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse border border-slate-200 bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mt-4">
      <ErrorMessage message={message} />
      {onRetry ? (
        <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-navy underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function PageEmpty({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState message={message} onRetry={onRetry} />;
}
