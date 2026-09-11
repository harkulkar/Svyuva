import { useHealthCheck } from '../hooks/useHealthCheck';

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
        ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {label}
    </span>
  );
}

export function PhaseSetupPage() {
  const health = useHealthCheck();

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-slate-900">
      <div className="h-1.5 w-full bg-gradient-to-r from-saffron via-white to-indiaGreen" />
      <header className="border-b-4 border-saffron bg-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <img src="/logo.svg" alt="SV Yuva Suraksha Yojana emblem" className="h-16 w-16 bg-white p-1" />
          <div>
            <p className="text-xs uppercase tracking-wide text-saffron">Government of Maharashtra</p>
            <h1 className="text-xl font-semibold sm:text-2xl">Swami Vivekananda Yuva Suraksha Yojana</h1>
            <p className="text-sm text-blue-100">Directorate of Higher Education — student insurance portal</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy">Phase 1 — Project setup</p>
          <h2 className="mt-1 text-2xl font-semibold text-navy-dark">System foundation check</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
            Public pages, login, and dashboards are not part of this phase. This screen only confirms that the
            React frontend, Express API, and MongoDB Atlas database <strong>SVYSY</strong> are wired together.
          </p>

          {health.status === 'loading' && (
            <p className="mt-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-navy">
              Checking API and database connection…
            </p>
          )}

          {health.status === 'error' && (
            <p className="mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {health.message}
            </p>
          )}

          {health.status === 'success' && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge ok label="Frontend running" />
                <StatusBadge ok label="API reachable" />
                <StatusBadge
                  ok={health.data.database.connected}
                  label={health.data.database.connected ? 'MongoDB connected' : 'MongoDB disconnected'}
                />
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <dt className="text-slate-500">API message</dt>
                  <dd className="font-medium">{health.message}</dd>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium">{health.data.status}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-navy-dark py-4 text-center text-xs text-blue-100">
        Phase 1 setup only. Content and services of SV Yuva Suraksha Yojana will be added in later phases.
      </footer>
    </div>
  );
}
