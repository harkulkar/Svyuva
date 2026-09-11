import type { WorkflowHistoryItem } from '../../types/workflow';

export function WorkflowTimeline({ items }: { items: WorkflowHistoryItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-600">No workflow events recorded yet.</p>;
  }
  return (
    <ol className="space-y-3" aria-label="Workflow timeline">
      {items.map((item) => (
        <li key={item.id} className="border-l-2 border-saffron pl-3">
          <p className="text-xs text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</p>
          <p className="font-medium text-navy">
            {item.action.replace(/_/g, ' ')}
            <span className="font-normal text-slate-600">
              {' '}
              ({item.fromState.replace(/_/g, ' ')} → {item.toState.replace(/_/g, ' ')})
            </span>
          </p>
          {item.reason ? <p className="text-sm text-slate-700">{item.reason}</p> : null}
          {item.comments ? <p className="text-sm text-slate-600">{item.comments}</p> : null}
        </li>
      ))}
    </ol>
  );
}
