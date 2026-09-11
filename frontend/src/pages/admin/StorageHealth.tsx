import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchStorageHealth, getApiErrorMessage } from '../../services/api';
import type { StorageHealth } from '../../types/auth';

export function AdminStorageHealthPage() {
  const [data, setData] = useState<StorageHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    void fetchStorageHealth()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="Storage health" path="/admin/storage-health" />
      <h1 className="text-2xl font-semibold text-navy">Storage health</h1>
      <p className="mt-2 text-sm text-slate-700">Metadata counts only. Private file URLs are not shown.</p>
      {error ? (
        <div className="mt-4">
          <ErrorMessage message={error} />
          <button type="button" className="mt-2 text-sm font-semibold text-navy underline" onClick={load}>
            Retry
          </button>
        </div>
      ) : null}
      {!data && !error ? (
        <div className="mt-4">
          <Loading />
        </div>
      ) : null}
      {data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Storage connectivity" value={data.connectivity.replaceAll('_', ' ')} />
            <Card title="Total documents" value={String(data.totalDocuments)} />
            <Card title="Recent uploads (7 days)" value={String(data.recentUploads7d)} />
            <Card title="Recent failures" value={String(data.recentFailures)} />
            <Card title="Missing files" value={String(data.missingFiles)} />
            <Card title="HTTP API" value={data.httpApi.replaceAll('_', ' ')} />
          </div>
          <p className="mt-4 text-sm text-slate-600">{data.note}</p>
        </>
      ) : null}
    </>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="border border-slate-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-semibold capitalize text-navy">{value}</p>
    </div>
  );
}
