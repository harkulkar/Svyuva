import { useEffect, useState } from 'react';
import { ButtonSpinner } from '../common/Loading';
import { getApiErrorMessage, proceedStudentUploadPayment, quoteStudentUploadPremium } from '../../services/api';
import type { InsurerCode, InsurerPremiumQuote, PolicyType } from '../../types/student';

export const INSURERS: Array<{ code: InsurerCode; name: string }> = [
  { code: 'NATIONAL', name: 'National Insurance Co. Ltd.' },
  { code: 'ICICI', name: 'ICICI Lombard General Insurance Co. Ltd.' }
];

export const POLICIES: Record<InsurerCode, Array<{ type: PolicyType; label: string }>> = {
  NATIONAL: [{ type: 'GPA', label: 'Group personal accident (GPA)' }],
  ICICI: [
    { type: 'GPA', label: 'Group personal accident (GPA)' },
    { type: 'GMC', label: 'Group Mediclaim (GMC)' }
  ]
};

function money(currency: string, value: number) {
  return `${currency} ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InsurerPremiumStep({ jobId, studentCount }: { jobId: string; studentCount: number }) {
  const [insurer, setInsurer] = useState<InsurerCode | ''>('');
  const [policyType, setPolicyType] = useState<PolicyType | ''>('');
  const [quote, setQuote] = useState<InsurerPremiumQuote | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'quote' | 'pay' | null>(null);

  useEffect(() => {
    setPolicyType('');
    setQuote(null);
    setPaymentMessage(null);
  }, [insurer]);

  useEffect(() => {
    if (!insurer || !policyType) return;
    let cancelled = false;
    setBusy('quote');
    setError(null);
    void quoteStudentUploadPremium({ jobId, insurer, policyType })
      .then((result) => {
        if (!cancelled) setQuote(result.quote);
      })
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          setError(getApiErrorMessage(err, 'Premium could not be calculated.'));
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, insurer, policyType]);

  async function onProceed() {
    if (!insurer || !policyType) return;
    setBusy('pay');
    setError(null);
    try {
      const result = await proceedStudentUploadPayment({ jobId, insurer, policyType });
      setQuote(result.quote);
      setPaymentMessage(result.message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not proceed to payment.'));
    } finally {
      setBusy(null);
    }
  }

  if (studentCount < 1) {
    return null;
  }

  const policies = insurer ? POLICIES[insurer] : [];

  return (
    <section className="mt-6 border border-slate-300 bg-white p-5">
      <h2 className="text-lg font-semibold text-navy">Select insurer</h2>
      <p className="mt-1 text-sm text-slate-700">Premium is calculated for {studentCount.toLocaleString()} valid student{studentCount === 1 ? '' : 's'}.</p>
      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Insurer</legend>
        {INSURERS.map((item) => (
          <label key={item.code} className="flex min-h-11 cursor-pointer items-start gap-2 border border-slate-200 px-3 py-2 text-sm">
            <input
              type="radio"
              name="insurer"
              value={item.code}
              checked={insurer === item.code}
              onChange={() => setInsurer(item.code)}
            />
            <span>{item.name}</span>
          </label>
        ))}
      </fieldset>

      {insurer ? (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-navy">Policy type</h3>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Policy type</legend>
            {policies.map((item) => (
              <label key={item.type} className="flex min-h-11 cursor-pointer items-start gap-2 border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="policyType"
                  value={item.type}
                  checked={policyType === item.type}
                  onChange={() => setPolicyType(item.type)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-800" role="alert">{error}</p> : null}

      {quote ? (
        <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm">
          <h3 className="font-semibold text-navy">Premium calculation</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Insurer</dt>
              <dd>{quote.insurerName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Policy</dt>
              <dd>{quote.policyLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Students</dt>
              <dd>{quote.studentCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rate per student</dt>
              <dd>{money(quote.currency, quote.ratePerStudent)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Base premium</dt>
              <dd>{money(quote.currency, quote.basePremium)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">GST ({Math.round(quote.gstRate * 100)}%)</dt>
              <dd>{money(quote.currency, quote.gstAmount)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Total premium</dt>
              <dd className="text-lg font-semibold text-navy">{money(quote.currency, quote.totalPremium)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">{quote.formula}</p>
          {paymentMessage ? (
            <p className="mt-4 border border-saffron bg-white px-3 py-2" role="status">
              {paymentMessage}
            </p>
          ) : (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={busy !== null}
              onClick={() => void onProceed()}
            >
              {busy === 'pay' ? <ButtonSpinner /> : null}
              Proceed to payment
            </button>
          )}
        </div>
      ) : busy === 'quote' ? (
        <p className="mt-4 text-sm text-slate-600">Calculating premium…</p>
      ) : null}
    </section>
  );
}
