import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { PageError, PageEmpty, SkeletonGrid } from '../../components/common/PageState';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { TaskCard } from '../../components/common/TaskCard';
import { ConfirmDialog } from '../../components/common/AdminUi';
import {
  assignWorkQueueBulk,
  fetchAdminUsers,
  fetchWorkQueue,
  fetchWorkQueueSummary,
  getApiErrorMessage
} from '../../services/api';
import type { WorkflowRecord, WorkQueueSummary } from '../../types/workflow';

export function AdminWorkQueuePage() {
  const [summary, setSummary] = useState<WorkQueueSummary | null>(null);
  const [items, setItems] = useState<WorkflowRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [workflowType, setWorkflowType] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [preset, setPreset] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState('');
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [confirmAssign, setConfirmAssign] = useState(false);

  function load() {
    setError(null);
    const params: Record<string, string | number | undefined> = { page, limit: 20 };
    if (workflowType) params.workflowType = workflowType;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (preset === 'mine') params.mine = 'true';
    if (preset === 'unassigned') params.unassigned = 'true';
    if (preset === 'overdue') params.overdue = 'true';
    void fetchWorkQueueSummary().then(setSummary).catch((err) => setError(getApiErrorMessage(err)));
    void fetchWorkQueue(params)
      .then((data) => {
        setItems(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, [page, workflowType, status, priority, preset]);

  useEffect(() => {
    void fetchAdminUsers({ role: 'ADMIN', limit: 50 })
      .then((data) => setAdmins(data.items.map((row) => ({ id: row.id, name: row.name }))))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <Seo title="Work queue" path="/admin/work-queue" />
      <h1 className="text-2xl font-semibold text-navy">Work queue</h1>
      <p className="mt-2 text-sm text-slate-700">Operational tasks for the logged-in administrator. Due dates are not official scheme deadlines.</p>
      {error ? <PageError message={error} onRetry={load} /> : null}
      {summary ? (
        <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-5">
          <button type="button" onClick={() => { setPreset('mine'); setPage(1); }}>
            <StatCard title="My tasks" value={summary.myTasks} />
          </button>
          <button type="button" onClick={() => { setPreset('unassigned'); setPage(1); }}>
            <StatCard title="Unassigned" value={summary.unassignedTasks} />
          </button>
          <button type="button" onClick={() => { setPreset('overdue'); setPage(1); }}>
            <StatCard title="Overdue" value={summary.overdueTasks} />
          </button>
          <StatCard title="High priority" value={summary.highPriorityTasks} />
          <StatCard title="Recently completed" value={summary.recentlyCompleted} />
        </div>
      ) : (
        <SkeletonGrid label="Loading work queue…" />
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <label>
          Workflow
          <select className="ml-2 min-h-11 border border-slate-300 px-2" value={workflowType} onChange={(event) => { setWorkflowType(event.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="INSTITUTE_REGISTRATION">Registration</option>
            <option value="DOCUMENT_REVIEW">Documents</option>
            <option value="STUDENT_UPLOAD">Student upload</option>
            <option value="INSURANCE_ENROLLMENT">Insurance</option>
            <option value="PAYMENT_VERIFICATION">Payment</option>
          </select>
        </label>
        <label>
          Status
          <select className="ml-2 min-h-11 border border-slate-300 px-2" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Open</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="CORRECTION_REQUESTED">Correction requested</option>
          </select>
        </label>
        <label>
          Priority
          <select className="ml-2 min-h-11 border border-slate-300 px-2" value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Assign selected to
          <select className="ml-2 min-h-11 border border-slate-300 px-2" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">Select administrator</option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="min-h-11 bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!selected.length || !assignee}
          onClick={() => setConfirmAssign(true)}
        >
          Assign selected
        </button>
      </div>
      {items.length === 0 && !error ? <PageEmpty message="No matching workflow tasks." /> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            selected={selected.includes(item.id)}
            onToggle={(id) => setSelected((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]))}
          />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      <ConfirmDialog
        open={confirmAssign}
        title="Assign selected tasks"
        confirmLabel="Assign"
        onCancel={() => setConfirmAssign(false)}
        onConfirm={() => {
          void assignWorkQueueBulk(selected, assignee)
            .then(() => {
              setSelected([]);
              setConfirmAssign(false);
              load();
            })
            .catch((err) => {
              setError(getApiErrorMessage(err));
              setConfirmAssign(false);
            });
        }}
      >
        Bulk approval and rejection are not available. This only assigns work items.
      </ConfirmDialog>
    </>
  );
}
