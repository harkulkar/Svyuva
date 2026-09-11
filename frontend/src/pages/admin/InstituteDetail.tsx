import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading, ButtonSpinner } from '../../components/common/Loading';
import { ConfirmDialog } from '../../components/common/AdminUi';
import { ActivityTimeline } from '../../components/common/ActivityTimeline';
import { ApprovalPanel } from '../../components/common/ApprovalPanel';
import { WorkflowTimeline } from '../../components/common/WorkflowTimeline';
import {
  approveInstituteRequest,
  fetchAdminInstitute,
  fetchEntityWorkflow,
  fetchWorkflowHistory,
  getApiErrorMessage,
  postWorkflowAction,
  rejectInstituteRequest,
  updateInstituteStatusRequest
} from '../../services/api';
import type { InstituteProfile } from '../../types/auth';
import type { WorkflowHistoryItem, WorkflowRecord } from '../../types/workflow';

export function AdminInstituteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState<InstituteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | 'activate' | 'deactivate' | 'START_REVIEW' | 'REQUEST_CORRECTION' | 'APPROVE' | 'REJECT' | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function load() {
    if (!id) return;
    void fetchAdminInstitute(id)
      .then(setInstitute)
      .catch((err) => setError(getApiErrorMessage(err)));
    void fetchEntityWorkflow('ADMIN', 'INSTITUTE_REGISTRATION', id)
      .then(async (row) => {
        setWorkflow(row);
        setHistory(await fetchWorkflowHistory('ADMIN', row.id));
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function run() {
    if (!id || !confirm) return;
    if ((confirm === 'reject' || confirm === 'REJECT' || confirm === 'REQUEST_CORRECTION') && reason.trim().length < 8) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm === 'approve') setInstitute(await approveInstituteRequest(id));
      if (confirm === 'reject') setInstitute(await rejectInstituteRequest(id, reason));
      if (confirm === 'activate') setInstitute(await updateInstituteStatusRequest(id, 'ACTIVE'));
      if (confirm === 'deactivate') setInstitute(await updateInstituteStatusRequest(id, 'INACTIVE'));
      if (workflow && (confirm === 'START_REVIEW' || confirm === 'REQUEST_CORRECTION' || confirm === 'APPROVE' || confirm === 'REJECT')) {
        const updated = await postWorkflowAction('ADMIN', workflow.id, {
          action: confirm,
          reason: reason || undefined,
          expectedRevision: workflow.revision,
          expectedState: workflow.currentState
        });
        setWorkflow(updated);
        setHistory(await fetchWorkflowHistory('ADMIN', updated.id));
        setInstitute(await fetchAdminInstitute(id));
        setStatusMessage('Workflow updated.');
      }
      setConfirm(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Institute details" />
      <p className="text-sm">
        <Link to="/admin/institutes" className="text-navy underline">Back to institutes</Link>
        {' · '}
        <Link to="/admin/registrations" className="text-navy underline">Registrations</Link>
        {' · '}
        <Link to="/admin/work-queue" className="text-navy underline">Work queue</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Institute details</h1>
      {statusMessage ? <p className="mt-2 text-sm text-green-800" role="status">{statusMessage}</p> : null}
      {error ? <div className="mt-4"><ErrorMessage message={error} /><button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>Retry</button></div> : null}
      {!institute && !error ? <div className="mt-4"><Loading /></div> : null}
      {institute ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <dl className="space-y-2 border border-slate-300 bg-white p-5 text-sm lg:col-span-2">
            <Row label="University" value={institute.university.name} />
            <Row label="Institute" value={institute.name} />
            <Row label="Code" value={institute.code || '—'} />
            <Row label="Principal" value={institute.principalName} />
            <Row label="Email" value={institute.email} />
            <Row label="Mobile" value={institute.mobile} />
            <Row label="Contact 1" value={institute.contactNumber1 || '—'} />
            <Row label="Contact 2" value={institute.contactNumber2 || '—'} />
            <Row label="Address" value={institute.address} />
            <Row label="District" value={institute.district} />
            <Row label="Taluka" value={institute.taluka} />
            <Row label="JD Region" value={institute.jdRegion} />
            <Row label="College type" value={institute.collegeType} />
            <Row label="Status" value={institute.status} />
            <Row label="Registered" value={institute.createdAt ? new Date(institute.createdAt).toLocaleString() : '—'} />
            <Row label="Students" value={institute.studentCount ? `${institute.studentCount.total} (active ${institute.studentCount.active}, inactive ${institute.studentCount.inactive})` : '—'} />
            {institute.rejectionReason ? <Row label="Rejection reason" value={institute.rejectionReason} /> : null}
            {institute.correctionReason ? <Row label="Correction requested" value={institute.correctionReason} /> : null}
          </dl>
          <div className="space-y-3">
            <ApprovalPanel
              workflow={workflow}
              busy={busy}
              onAction={(action) => setConfirm(action as 'START_REVIEW' | 'REQUEST_CORRECTION' | 'APPROVE' | 'REJECT')}
            />
            {institute.status === 'PENDING' && !workflow?.allowedActions?.length ? (
              <div className="space-y-3 border border-slate-300 bg-white p-5">
                <button type="button" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 bg-indiaGreen px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => setConfirm('approve')}>
                  {busy ? <ButtonSpinner /> : null}
                  Approve
                </button>
                <label htmlFor="reason" className="block text-sm font-medium text-navy">Rejection reason</label>
                <textarea id="reason" className="w-full border border-slate-300 px-3 py-2 text-sm" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
                <button type="button" disabled={busy} className="w-full border border-red-700 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60" onClick={() => setConfirm('reject')}>
                  Reject
                </button>
              </div>
            ) : null}
            {institute.status === 'ACTIVE' ? (
              <button type="button" className="w-full border border-navy px-4 py-2 text-sm font-semibold text-navy" onClick={() => setConfirm('deactivate')}>Deactivate</button>
            ) : null}
            {institute.status === 'INACTIVE' ? (
              <button type="button" className="w-full bg-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => setConfirm('activate')}>Activate</button>
            ) : null}
            {institute.status === 'REJECTED' ? <p className="text-sm text-slate-600">This registration was rejected and is kept on file.</p> : null}
          </div>
        </div>
      ) : null}
      {history.length ? (
        <section className="mt-6 border border-slate-300 bg-white p-5">
          <h2 className="text-sm font-semibold text-navy">Workflow timeline</h2>
          <div className="mt-3"><WorkflowTimeline items={history} /></div>
        </section>
      ) : null}
      {id ? <ActivityTimeline role="ADMIN" kind="institutes" id={id} /> : null}
      <button type="button" className="mt-4 text-sm text-navy underline" onClick={() => navigate('/admin/institutes')}>
        Return to list
      </button>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm === 'approve' || confirm === 'APPROVE'
            ? 'Approve registration'
            : confirm === 'reject' || confirm === 'REJECT'
              ? 'Reject registration'
              : confirm === 'REQUEST_CORRECTION'
                ? 'Request correction'
                : confirm === 'START_REVIEW'
                  ? 'Start review'
                  : confirm === 'activate'
                    ? 'Activate institute'
                    : 'Deactivate institute'
        }
        confirmLabel="Confirm"
        danger={confirm === 'reject' || confirm === 'REJECT' || confirm === 'deactivate'}
        busy={busy}
        confirmDisabled={(confirm === 'reject' || confirm === 'REJECT' || confirm === 'REQUEST_CORRECTION') && reason.trim().length < 8}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      >
        {(confirm === 'reject' || confirm === 'REJECT' || confirm === 'REQUEST_CORRECTION') ? (
          <label className="block text-sm">
            Reason
            <textarea className="mt-1 w-full border border-slate-300 px-3 py-2" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        ) : (
          'This action will be recorded in the workflow history and audit log.'
        )}
      </ConfirmDialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
