import { useEffect, useState, type ReactNode } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchSystemHealth, getApiErrorMessage } from '../../services/api';
import type { SystemHealth } from '../../types/auth';

function Status({ value }: { value: string }) {
  return <span className="font-semibold capitalize text-navy">{value.replaceAll('_', ' ')}</span>;
}

export function AdminSystemHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    void fetchSystemHealth()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="System health" path="/admin/system-health" />
      <h1 className="text-2xl font-semibold text-navy">System health</h1>
      <p className="mt-2 text-sm text-slate-700">Operational status only. Secrets, environment variables, and infrastructure hostnames are not shown.</p>
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
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-navy">Application</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Application status" value={<Status value={data.application.status} />} />
              <Row label="Backend status" value={<Status value={data.application.backend} />} />
              <Row label="Frontend status" value={<Status value={data.application.frontend} />} />
              <Row label="API response status" value={<Status value={data.application.api} />} />
              <Row label="Version / build" value={data.application.version} />
              <Row label="API latency" value={`${data.apiLatencyMs} ms`} />
            </dl>
          </section>
          <section className="border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-navy">Database</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="MongoDB connection" value={data.database.connected ? 'Connected' : 'Disconnected'} />
              <Row label="Database response time" value={`${data.database.responseTimeMs} ms`} />
              <Row label="Database status" value={<Status value={data.database.status} />} />
            </dl>
          </section>
          <section className="border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-navy">Storage</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Object storage status" value={<Status value={data.storage.status} />} />
              <Row label="Upload status" value={<Status value={data.storage.upload} />} />
              <Row label="Download status" value={<Status value={data.storage.download} />} />
            </dl>
          </section>
          <section className="border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-semibold text-navy">System</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Last successful health check" value={data.system.lastSuccessfulHealthCheck ? new Date(data.system.lastSuccessfulHealthCheck).toLocaleString() : 'Not recorded yet'} />
              <Row label="Current environment" value={data.system.environment} />
              <Row label="Application uptime" value={`${data.system.uptimeSeconds} seconds`} />
              <Row label="Maintenance mode" value={data.system.maintenanceMode ? 'On' : 'Off'} />
              <Row label="Email" value={<Status value={data.email.implementation} />} />
              <Row label="Background jobs" value={<Status value={data.jobs.backgroundProcessors} />} />
            </dl>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
