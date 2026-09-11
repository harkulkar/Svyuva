import type { SubmissionDetail } from '../../types/submission';

export function SubmissionTimeline({ items }: { items: SubmissionDetail['timeline'] }) {
  if (!items.length) return <p className="text-sm text-slate-600">No recorded events yet.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="border-l-2 border-saffron pl-3">
          <p className="font-medium text-navy">{item.action.replace(/_/g, ' ')}</p>
          <p className="text-xs text-slate-500">
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''} {item.user?.name ? `· ${item.user.name}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}
