import { useEffect, useState } from 'react';
import { ButtonSpinner } from '../common/Loading';
import {
  createPaymentOrder,
  fetchPayment,
  fetchPaymentAvailability,
  getApiErrorMessage,
  proceedStudentUploadPayment,
  quoteStudentUploadPremium,
  uploadPolicyDocument,
  verifyPayment
} from '../../services/api';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import type { PaymentAvailability, PaymentRecord } from '../../types/payment';
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

export const POLICY_DOCUMENT_FIELDS = [
  { key: 'GPA_PROPOSAL', label: 'GPA Proposal Form', formatHref: '/assets/documents/formats/GPA-Proposal-Form.pdf', formatName: 'GPA-Proposal-Form.pdf' },
  { key: 'STUDENT_DATA_SHEET', label: 'Student Data Sheet (Annexure)' },
  { key: 'PEP_KYC', label: 'Signed & Stamped PEP–KYC', formatHref: '/assets/documents/formats/Signed-Stamped-PEP-KYC.pdf', formatName: 'Signed-Stamped-PEP-KYC.pdf' },
  { key: 'AADHAAR_PAN_SIGNATORY', label: 'Aadhaar & PAN of Authorized Signatory' },
  { key: 'BML', label: 'BML', formatHref: '/assets/documents/formats/BML.pdf', formatName: 'BML.pdf' },
  { key: 'COLLEGE_PAN_GST', label: 'College PAN & GST Certificate / NON‑GST Declaration' },
  { key: 'NOT_NPO_DECLARATION', label: 'College Not‑NPO/NGO Declaration' },
  { key: 'DCM_MATRIX', label: 'DCM Matrix' }
] as const;

function money(currency: string, value: number) {
  return `${currency} ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CONFIRM_ATTEMPTS = 4;
const CONFIRM_DELAY_MS = 2500;

export function InsurerPremiumStep({
  jobId,
  studentCount,
  onPaidChange
}: {
  jobId: string;
  studentCount: number;
  /** Reports whether online payment is switched on and whether this upload has been paid. */
  onPaidChange?: (state: { required: boolean; paid: boolean }) => void;
}) {
  const [insurer, setInsurer] = useState<InsurerCode | ''>('');
  const [policyType, setPolicyType] = useState<PolicyType | ''>('');
  const [quote, setQuote] = useState<InsurerPremiumQuote | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'quote' | 'pay' | null>(null);
  const [availability, setAvailability] = useState<PaymentAvailability | null>(null);
  const [paid, setPaid] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPaymentAvailability()
      .then((result) => {
        if (!cancelled) setAvailability(result);
      })
      .catch(() => {
        if (!cancelled) setAvailability({ enabled: false, mode: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onPaidChange?.({ required: Boolean(availability?.enabled), paid });
  }, [availability, paid, onPaidChange]);

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

  async function onDocument(key: string, file: File | null) {
    if (!file) return;
    setUploadingKey(key);
    setError(null);
    try {
      const result = await uploadPolicyDocument({ jobId, documentKey: key, file });
      const next: Record<string, string> = {};
      for (const item of result.documents) next[item.key] = item.filename;
      setDocuments(next);
    } catch (err) {
      setError(getApiErrorMessage(err, 'The document could not be uploaded.'));
    } finally {
      setUploadingKey(null);
    }
  }

  async function confirmPayment(paymentRecordId: string, first: PaymentRecord | null): Promise<PaymentRecord | null> {
    let current = first;
    for (let attempt = 0; attempt < CONFIRM_ATTEMPTS && current?.status !== 'VERIFIED'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_DELAY_MS));
      try {
        current = await fetchPayment(paymentRecordId);
      } catch {
        /* keep trying; the final state is reported below */
      }
    }
    return current;
  }

  function markPaid() {
    setPaid(true);
    setPendingPaymentId(null);
    setError(null);
    setPaymentMessage('Payment received. The valid students are being added.');
  }

  async function onCheckStatus() {
    if (!pendingPaymentId) return;
    setBusy('pay');
    setError(null);
    try {
      const payment = await fetchPayment(pendingPaymentId);
      if (payment.status === 'VERIFIED') markPaid();
      else setPaymentMessage('Your payment is still being confirmed. Please check again in a minute.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not check the payment status.'));
    } finally {
      setBusy(null);
    }
  }

  async function onPayOnline() {
    setBusy('pay');
    setError(null);
    setPaymentMessage(null);
    try {
      const order = await createPaymentOrder(jobId);
      const paymentRecordId = order.payment.id;
      const result = await openRazorpayCheckout(order.checkout, (reason) => setError(reason));
      if (result.status === 'dismissed') {
        setPaymentMessage('The payment window was closed. If money was deducted, use "Check payment status" below instead of paying again.');
        setPendingPaymentId(paymentRecordId);
        return;
      }
      setError(null);
      setPendingPaymentId(paymentRecordId);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = result.response;
      let payment: PaymentRecord | null = null;
      let verifyError: unknown = null;
      try {
        payment = await verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
      } catch (err) {
        verifyError = err;
      }
      if (payment?.status !== 'VERIFIED') payment = await confirmPayment(paymentRecordId, payment);
      if (payment?.status === 'VERIFIED') {
        markPaid();
      } else if (verifyError) {
        setError(
          `${getApiErrorMessage(verifyError, 'We could not confirm your payment yet.')} If money was deducted, do not pay again — use "Check payment status" below.`
        );
      } else {
        setPaymentMessage('Your payment is being confirmed. Do not pay again; use "Check payment status" below in a minute.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not start the payment.'));
    } finally {
      setBusy(null);
    }
  }

  async function onProceed() {
    if (!insurer || !policyType) return;
    let ready = availability;
    if (!ready?.enabled) {
      try {
        ready = await fetchPaymentAvailability();
        setAvailability(ready);
      } catch {
        ready = availability;
      }
    }
    if (ready?.enabled) {
      await onPayOnline();
      return;
    }
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
  const documentsReady = POLICY_DOCUMENT_FIELDS.every((item) => documents[item.key]);
  const payable = quote ? quote.amountPayable ?? quote.totalPremium + (quote.stampDuty ?? 3) : 0;

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
              disabled={paid}
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
                  disabled={paid}
                  onChange={() => setPolicyType(item.type)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      {policyType ? (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-navy">Upload documents</h3>
          <p className="mt-1 text-sm text-slate-600">PDF, JPG, or PNG. Each file up to 5 MB.</p>
          <ul className="mt-3 space-y-3">
            {POLICY_DOCUMENT_FIELDS.map((item) => (
              <li key={item.key} className="border border-slate-200 px-3 py-2 text-sm">
                <label className="block font-medium text-navy" htmlFor={`doc-${item.key}`}>
                  {item.label}
                </label>
                {'formatHref' in item ? (
                  <a className="mt-1 inline-block text-sm font-semibold text-navy underline" href={item.formatHref} download={item.formatName}>
                    Download format
                  </a>
                ) : null}
                <input
                  id={`doc-${item.key}`}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="mt-2 block w-full text-sm"
                  disabled={paid || uploadingKey !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void onDocument(item.key, file);
                  }}
                />
                {documents[item.key] ? <p className="mt-1 text-xs text-green-800">Uploaded: {documents[item.key]}</p> : null}
                {uploadingKey === item.key ? <p className="mt-1 text-xs text-slate-600">Uploading…</p> : null}
              </li>
            ))}
          </ul>
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
            <div>
              <dt className="text-slate-500">Total premium</dt>
              <dd className="font-semibold">{money(quote.currency, quote.totalPremium)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Stamp duty</dt>
              <dd>{money(quote.currency, quote.stampDuty ?? 3)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Total premium + stamp duty</dt>
              <dd className="text-lg font-semibold text-navy">{money(quote.currency, payable)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">{quote.formula}</p>
          {paymentMessage ? (
            <p className="mt-4 border border-saffron bg-white px-3 py-2" role="status">
              {paymentMessage}
            </p>
          ) : null}
          {pendingPaymentId && !paid ? (
            <button
              type="button"
              className="mt-3 mr-2 inline-flex min-h-11 items-center gap-2 border border-navy px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
              disabled={busy !== null}
              onClick={() => void onCheckStatus()}
            >
              Check payment status
            </button>
          ) : null}
          {availability?.mode === 'test' && !paid ? (
            <p className="mt-3 text-xs text-slate-600">Test mode: no real money is charged.</p>
          ) : null}
          {!documentsReady && !paid ? (
            <p className="mt-3 text-xs text-slate-600">Upload all documents before payment.</p>
          ) : null}
          {paid ? null : (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={busy !== null || availability === null || !documentsReady}
              onClick={() => void onProceed()}
            >
              {busy === 'pay' ? <ButtonSpinner /> : null}
              {availability?.enabled ? `Pay ${money(quote.currency, payable)} online` : 'Proceed to payment'}
            </button>
          )}
        </div>
      ) : busy === 'quote' ? (
        <p className="mt-4 text-sm text-slate-600">Calculating premium…</p>
      ) : null}
    </section>
  );
}
