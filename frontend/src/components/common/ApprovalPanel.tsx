import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import type { WorkflowRecord } from '../../types/workflow';

const ACTION_LABEL: Record<string, string> = {
  START_REVIEW: 'Start review',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  REQUEST_CORRECTION: 'Request correction',
  RESUBMIT: 'Resubmit',
  VERIFY: 'Verify',
  COMPLETE: 'Complete',
  CANCEL: 'Cancel'
};

export function ApprovalPanel({
  workflow,
  busy,
  onAction
}: {
  workflow: WorkflowRecord | null;
  busy?: boolean;
  onAction: (action: string) => void;
}) {
  if (!workflow) return null;
  const actions = workflow.allowedActions || [];
  return (
    <section className="border border-slate-300 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-navy">Approval</h2>
        <WorkflowStatusBadge status={workflow.currentState} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Only actions allowed for your role and the current state are shown.</p>
      <div className="mt-3 flex flex-col gap-2">
        {actions.length === 0 ? <p className="text-slate-600">No actions available.</p> : null}
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            disabled={busy}
            className={`min-h-11 px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
              action === 'REJECT' || action === 'CANCEL' ? 'border border-red-700 text-red-800' : 'bg-navy text-white'
            }`}
            onClick={() => onAction(action)}
          >
            {ACTION_LABEL[action] || action}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ReviewChecklist({
  items
}: {
  items: Array<{ id: string; name: string; description?: string; required?: boolean; result?: { result?: string; comment?: string } | null }>;
}) {
  if (!items.length) {
    return <p className="text-sm text-slate-600">No active review checklist items are configured.</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className="border border-slate-200 px-3 py-2">
          <p className="font-medium text-navy">{item.name}</p>
          {item.description ? <p className="text-xs text-slate-600">{item.description}</p> : null}
          <p className="mt-1 text-xs uppercase text-slate-500">{item.result?.result || 'Not recorded'}</p>
        </li>
      ))}
    </ul>
  );
}
