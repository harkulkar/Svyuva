import type { PremiumDto } from '../../types/submission';

export function PremiumBreakdown({ premium }: { premium: PremiumDto | null }) {
  if (!premium) {
    return <p className="text-sm text-slate-600">Premium has not been calculated yet.</p>;
  }
  return (
    <section className="border border-slate-300 bg-white p-4 text-sm">
      <h2 className="font-semibold text-navy">Premium calculation</h2>
      {premium.incompleteBanner ? (
        <p className="mt-2 border border-saffron bg-white px-3 py-2" role="status">
          {premium.incompleteBanner}
        </p>
      ) : null}
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt className="text-slate-500">Student count</dt><dd>{premium.studentCount.toLocaleString()}</dd></div>
        <div><dt className="text-slate-500">Rule version</dt><dd>{premium.ruleVersion || '—'}</dd></div>
        <div><dt className="text-slate-500">Base amount</dt><dd>{premium.basePremium == null ? '—' : `${premium.currency} ${premium.basePremium.toLocaleString()}`}</dd></div>
        <div><dt className="text-slate-500">Adjustments</dt><dd>{premium.adjustments.length ? 'See calculation' : 'None (not applied)'}</dd></div>
        <div><dt className="text-slate-500">Tax / fees</dt><dd>{premium.taxes.length ? 'See calculation' : 'None (not applied)'}</dd></div>
        <div><dt className="text-slate-500">Total premium</dt><dd className="font-semibold">{premium.totalPremium == null ? '—' : `${premium.currency} ${premium.totalPremium.toLocaleString()}`}</dd></div>
        <div className="sm:col-span-2"><dt className="text-slate-500">Calculated</dt><dd>{premium.calculatedAt ? new Date(premium.calculatedAt).toLocaleString() : '—'}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">{premium.verificationNote}</p>
    </section>
  );
}

export function PremiumSummary({ premium }: { premium: PremiumDto | null }) {
  return <PremiumBreakdown premium={premium} />;
}
