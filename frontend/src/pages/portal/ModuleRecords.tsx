import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { PageEmpty, PageError, SkeletonGrid } from '../../components/common/PageState';
import { Pagination } from '../../components/common/Pagination';
import { ResponsiveTable } from '../../components/common/ResponsiveTable';
import { FileUpload, type UploadUiState } from '../../components/common/FileUpload';
import { fetchSchemeRecords, getApiErrorMessage, requestDocumentUpload, fetchDocumentChecklist } from '../../services/api';
import { DocumentChecklist } from '../../components/common/DocumentChecklist';
import { validateDocumentFile } from '../../utils/fileValidation';
import type { SchemeRecordList } from '../../types/scheme';
import type { DocumentChecklistItem } from '../../types/workflow';

type Kind = 'insurance' | 'documents' | 'payments' | 'ecards';

const COPY: Record<
  Kind,
  { title: string; path: string; empty: string; note: string; downloadNote?: string }
> = {
  insurance: {
    title: 'Insurance',
    path: '/college/insurance',
    empty: 'No insurance records found.',
    note: 'Status values come from stored records for your institute. Insurance enrollment HTTP APIs are not live.'
  },
  documents: {
    title: 'Documents',
    path: '/college/documents',
    empty: 'No document records found.',
    note: 'Metadata only. Private files are not exposed as public URLs. Document upload/download HTTP APIs are not live unless enabled by an administrator.'
  },
  payments: {
    title: 'Payment status',
    path: '/college/payment-status',
    empty: 'No payment records found.',
    note: 'Payment gateway actions are not live. These rows are stored payment statuses for your institute.'
  },
  ecards: {
    title: 'E-card',
    path: '/college/ecard',
    empty: 'No e-card records found.',
    note: 'E-card files are not served until the e-card HTTP API is enabled. Sharing uses authorised access only — permanent public links are not created.'
  }
};

export function CollegeModuleRecordsPage({ kind }: { kind: Kind }) {
  const copy = COPY[kind];
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<SchemeRecordList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<{ note?: string; items: DocumentChecklistItem[] } | null>(null);
  const page = Number(params.get('page') || 1);
  const status = params.get('status') || '';

  function load() {
    setError(null);
    void fetchSchemeRecords('COLLEGE', kind, { page, limit: 20, status: status || undefined })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err, `We couldn't load ${copy.title.toLowerCase()}. Please try again.`)));
    if (kind === 'documents') {
      void fetchDocumentChecklist('COLLEGE').then(setChecklist).catch(() => undefined);
    }
  }

  useEffect(() => {
    load();
  }, [kind, page, status]);

  return (
    <>
      <Seo title={copy.title} path={copy.path} />
      <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-700">{copy.note}</p>
      {data && !data.httpApi ? (
        <p className="mt-2 text-sm text-slate-600" role="status">
          Related file actions are not available yet. You can still review the stored status list.
        </p>
      ) : null}
      {kind === 'documents' ? <DocumentUploadHint httpApi={Boolean(data?.httpApi)} /> : null}
      {kind === 'documents' && checklist ? <DocumentChecklist items={checklist.items} note={checklist.note} /> : null}
      {kind === 'ecards' ? (
        <p className="mt-2 text-sm text-slate-600">
          Print or share will be offered only after authorised PDF access is enabled. Do not circulate private student e-cards.
        </p>
      ) : null}
      {error ? <PageError message={error} onRetry={load} /> : null}
      {!data && !error ? <SkeletonGrid label={`Loading ${copy.title.toLowerCase()}...`} /> : null}
      {data && data.items.length === 0 ? <PageEmpty message={copy.empty} /> : null}
      {data && data.items.length > 0 ? (
        <ResponsiveTable
          caption={copy.title}
          rows={data.items}
          empty={copy.empty}
          cardTitle={(row) => row.title}
          cardLines={(row) => [row.subtitle, row.status, row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : ''].filter(Boolean)}
          columns={[
            { key: 'title', header: 'Record', sticky: true, render: (row) => row.title },
            { key: 'subtitle', header: 'Detail', render: (row) => row.subtitle },
            { key: 'status', header: 'Status', render: (row) => row.status },
            { key: 'updated', header: 'Updated', render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—') }
          ]}
        />
      ) : null}
      {data ? (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPage={(next) => {
            const merged = new URLSearchParams(params);
            merged.set('page', String(next));
            setParams(merged);
          }}
        />
      ) : null}
    </>
  );
}

export function AdminModuleRecordsPage({ kind }: { kind: Kind }) {
  const titles: Record<Kind, { title: string; path: string; empty: string }> = {
    insurance: { title: 'Insurance', path: '/admin/insurance', empty: 'No insurance records found.' },
    documents: { title: 'Documents', path: '/admin/documents', empty: 'No document records found.' },
    payments: { title: 'Payments', path: '/admin/payments', empty: 'No payment records found.' },
    ecards: { title: 'E-cards', path: '/admin/ecards', empty: 'No e-card records found.' }
  };
  const copy = titles[kind];
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<SchemeRecordList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = Number(params.get('page') || 1);

  function load() {
    setError(null);
    void fetchSchemeRecords('ADMIN', kind, { page, limit: 20 })
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err, `We couldn't load ${copy.title.toLowerCase()}. Please try again.`)));
  }

  useEffect(() => {
    load();
  }, [kind, page]);

  return (
    <>
      <Seo title={copy.title} path={copy.path} />
      <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-700">Stored metadata only. Private files are not returned. HTTP mutation APIs stay feature-flagged.</p>
      {error ? <PageError message={error} onRetry={load} /> : null}
      {!data && !error ? <SkeletonGrid label={`Loading ${copy.title.toLowerCase()}...`} /> : null}
      {data && data.items.length === 0 ? <PageEmpty message={copy.empty} /> : null}
      {data && data.items.length > 0 ? (
        <ResponsiveTable
          caption={copy.title}
          rows={data.items}
          empty={copy.empty}
          href={(row) => (row.studentId ? `/admin/students/${row.studentId}` : `/admin/institutes/${row.instituteId || ''}`)}
          cardTitle={(row) => row.title}
          cardLines={(row) => [row.subtitle, row.instituteName || '', row.status].filter(Boolean)}
          columns={[
            { key: 'title', header: 'Record', sticky: true, render: (row) => row.title },
            { key: 'institute', header: 'Institute', render: (row) => row.instituteName || '—' },
            { key: 'status', header: 'Status', render: (row) => row.status },
            { key: 'updated', header: 'Updated', render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—') },
            {
              key: 'open',
              header: ' ',
              render: (row) =>
                row.studentId ? (
                  <Link className="font-semibold text-navy underline" to={`/admin/students/${row.studentId}`}>
                    Student
                  </Link>
                ) : (
                  '—'
                )
            }
          ]}
        />
      ) : null}
      {data ? (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          onPage={(next) => {
            const merged = new URLSearchParams(params);
            merged.set('page', String(next));
            setParams(merged);
          }}
        />
      ) : null}
    </>
  );
}

function DocumentUploadHint({ httpApi }: { httpApi: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadUiState>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | undefined>();

  async function tryUpload() {
    if (!file) return;
    const check = validateDocumentFile(file, 8 * 1024 * 1024);
    if (!check.ok) {
      setState('FAILED');
      setError(check.message || 'Upload failed. Please try again.');
      return;
    }
    setState('UPLOADING');
    setError(null);
    try {
      await requestDocumentUpload(file);
      setState('SUCCESS');
      setMessage('Document uploaded successfully.');
    } catch (err) {
      setState('FAILED');
      setError(getApiErrorMessage(err, 'Upload failed. Please try again.'));
    }
  }

  return (
    <section className="mt-4 border border-slate-300 bg-white p-4">
      <h2 className="text-sm font-semibold text-navy">Upload a document</h2>
      {!httpApi ? (
        <p className="mt-2 text-sm text-slate-600">
          Camera capture and file picker are available here so staff can prepare a file. The server will not store institute documents until document HTTP APIs are enabled.
        </p>
      ) : null}
      <div className="mt-3">
        <FileUpload
          label="PDF or image"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          capture="environment"
          hint="On a supported phone, you can take a photo. Maximum size is enforced on the server."
          file={file}
          state={file && state === 'IDLE' ? 'SELECTED' : state}
          error={error}
          message={message}
          onSelect={(next) => {
            setFile(next);
            setState(next ? 'SELECTED' : 'IDLE');
            setError(null);
            setMessage(undefined);
          }}
          onRemove={() => {
            setFile(null);
            setState('IDLE');
            setError(null);
          }}
          onRetry={() => void tryUpload()}
          validate={(next) => validateDocumentFile(next, 8 * 1024 * 1024)}
        />
        <button
          type="button"
          className="mt-3 min-h-11 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!file || state === 'UPLOADING'}
          onClick={() => void tryUpload()}
        >
          Upload
        </button>
      </div>
    </section>
  );
}
