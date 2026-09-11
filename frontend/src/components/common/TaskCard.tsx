import { Link } from 'react-router-dom';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import type { WorkflowRecord } from '../../types/workflow';

export function TaskCard({ item, selected, onToggle }: { item: WorkflowRecord; selected?: boolean; onToggle?: (id: string) => void }) {
  return (
    <article className="border border-slate-300 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        {onToggle ? (
          <label className="mt-1 inline-flex items-center gap-2">
            <input type="checkbox" checked={Boolean(selected)} onChange={() => onToggle(item.id)} />
            <span className="sr-only">Select task {item.workflowType}</span>
          </label>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy">{item.workflowType.replace(/_/g, ' ')}</p>
          <p className="text-xs text-slate-500">Priority {item.priority}</p>
        </div>
        <WorkflowStatusBadge status={item.overdue ? 'OVERDUE' : item.currentState} />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Due {item.dueAt ? new Date(item.dueAt).toLocaleString() : 'not set'}
      </p>
      <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-navy underline" to={taskHref(item)}>
        Open
      </Link>
    </article>
  );
}

function taskHref(item: WorkflowRecord) {
  if (item.workflowType === 'INSTITUTE_REGISTRATION') return `/admin/institutes/${item.entityId}`;
  if (item.workflowType === 'DOCUMENT_REVIEW') return `/admin/documents`;
  if (item.workflowType === 'INSURANCE_ENROLLMENT') return `/admin/insurance`;
  if (item.workflowType === 'PAYMENT_VERIFICATION') return `/admin/payments`;
  return `/admin/work-queue`;
}
