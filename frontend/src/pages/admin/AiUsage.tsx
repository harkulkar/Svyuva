import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { fetchAiAnalytics, getApiErrorMessage } from '../../services/api';
import type { AiAnalytics } from '../../types/ai';

export function AdminAiUsagePage() {
  const [data, setData] = useState<AiAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAiAnalytics()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  return (
    <>
      <Seo title="AI usage" path="/admin/ai-usage" />
      <h1 className="text-2xl font-semibold text-navy">AI usage</h1>
      <p className="mt-2 text-sm text-slate-700">Counts only. Cost is not estimated because provider pricing is not configured.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {!data && !error ? <div className="mt-4"><Loading /></div> : null}
      {data ? (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Stat label="Queries (30 days)" value={data.queries} />
          <Stat label="Successful events" value={data.successfulResponses} />
          <Stat label="Failed events" value={data.failedResponses} />
          <Stat label="Documents processed" value={data.documentProcessingCount} />
          <Stat label="OCR events" value={data.ocrProcessingCount} />
          <Stat label="Helpful" value={data.feedback.helpful} />
          <Stat label="Not helpful" value={data.feedback.notHelpful} />
          <Stat label="Recorded tokens" value={data.tokenUsage ?? 'Not reported'} />
        </dl>
      ) : null}
      {data?.note ? <p className="mt-4 text-xs text-slate-600">{data.note}</p> : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-slate-300 bg-white p-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-navy">{value}</dd>
    </div>
  );
}
