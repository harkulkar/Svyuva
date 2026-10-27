import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { TextField } from '../../components/auth/FormField';
import {
  clearPaymentGatewaySettings,
  fetchPaymentGatewaySettings,
  getApiErrorMessage,
  savePaymentGatewaySettings,
  testPaymentGateway
} from '../../services/api';
import type { PaymentGatewayAdminView } from '../../types/payment';

const KEY_ID_PATTERN = /^rzp_(test|live)_[A-Za-z0-9]{8,}$/;
const WEBHOOK_EVENTS = ['payment.captured', 'payment.failed', 'order.paid', 'refund.processed'];

type FormState = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mid: string;
  pfMid: string;
  enabled: boolean;
  currentPassword: string;
};

const EMPTY: FormState = { keyId: '', keySecret: '', webhookSecret: '', mid: '', pfMid: '', enabled: false, currentPassword: '' };

export function AdminPaymentGatewayPage() {
  const [view, setView] = useState<PaymentGatewayAdminView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | null>(null);
  const [copied, setCopied] = useState(false);

  function apply(next: PaymentGatewayAdminView) {
    setView(next);
    setForm({ ...EMPTY, keyId: next.keyId, mid: next.mid, pfMid: next.pfMid, enabled: next.enabled });
  }

  useEffect(() => {
    void fetchPaymentGatewaySettings()
      .then(apply)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load payment gateway settings.')));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const keyIdValid = KEY_ID_PATTERN.test(form.keyId.trim());
  const keyChanged = !view || view.keyId !== form.keyId.trim();
  const secretRequired = keyChanged || !view?.keySecretSet;

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!keyIdValid) {
      setError('Enter a valid Razorpay Key ID (it starts with rzp_test_ or rzp_live_).');
      return;
    }
    if (secretRequired && !form.keySecret.trim()) {
      setError('Enter the Key Secret that belongs to this Key ID.');
      return;
    }
    if (!form.currentPassword) {
      setError('Enter your admin password to confirm this change.');
      return;
    }
    setBusy('save');
    try {
      apply(
        await savePaymentGatewaySettings({
          keyId: form.keyId.trim(),
          keySecret: form.keySecret.trim() || undefined,
          webhookSecret: form.webhookSecret.trim() || undefined,
          mid: form.mid.trim(),
          pfMid: form.pfMid.trim(),
          enabled: form.enabled,
          currentPassword: form.currentPassword
        })
      );
      setSuccess('Payment gateway settings saved. The Key Secret is stored encrypted and will not be shown again.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onTest() {
    setError(null);
    setSuccess(null);
    setBusy('test');
    try {
      setSuccess((await testPaymentGateway()).message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onClear() {
    setError(null);
    setSuccess(null);
    if (!form.currentPassword) {
      setError('Enter your admin password to remove the credentials.');
      return;
    }
    if (!window.confirm('Remove the saved Razorpay credentials? Colleges will no longer be able to pay online.')) return;
    setBusy('clear');
    try {
      apply(await clearPaymentGatewaySettings(form.currentPassword));
      setSuccess('Payment gateway credentials removed.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function copyWebhookUrl() {
    if (!view?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(view.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Seo title="Payment gateway" path="/admin/payment-gateway" />
      <p className="text-sm"><Link to="/admin/settings" className="text-navy underline">Settings</Link></p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Payment gateway</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-700">
        Razorpay credentials used when colleges pay their insurance premium online. The Key Secret is encrypted before it is stored and is never shown again.
      </p>

      {error ? <div className="mt-4 max-w-2xl"><ErrorMessage message={error} /></div> : null}
      {success ? <p className="mt-4 max-w-2xl rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{success}</p> : null}

      {view && !view.encryptionKeyConfigured ? (
        <p className="mt-4 max-w-2xl rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          The server has no <code>PAYMENT_ENCRYPTION_KEY</code> (at least 32 characters). Set it in the server environment and restart before saving credentials.
        </p>
      ) : null}
      {view?.credentialsUnreadable ? (
        <p className="mt-4 max-w-2xl rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          Saved credentials cannot be decrypted (the encryption key changed). Enter the Key ID and Key Secret again to replace them.
        </p>
      ) : null}

      {view ? (
        <dl className="mt-6 grid max-w-2xl gap-3 border border-slate-300 bg-white p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-navy">{view.configured ? (view.enabled ? 'Enabled' : 'Configured, switched off') : 'Not configured'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Mode</dt>
            <dd className="font-medium text-navy">{view.mode ? (view.mode === 'live' ? 'Live (real money)' : 'Test (no real money)') : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Credentials from</dt>
            <dd className="font-medium text-navy">{view.source === 'database' ? 'Saved here' : view.source === 'environment' ? 'Server environment' : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Last updated</dt>
            <dd className="font-medium text-navy">{view.updatedAt ? new Date(view.updatedAt).toLocaleString() : '—'}</dd>
          </div>
        </dl>
      ) : null}

      <form className="mt-6 max-w-2xl space-y-4 border border-slate-300 bg-white p-5" onSubmit={(event) => void onSave(event)} noValidate autoComplete="off">
        <h2 className="text-sm font-semibold text-navy">Razorpay credentials</h2>
        <TextField
          label="Key ID"
          name="rzpKeyId"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="rzp_test_xxxxxxxxxxxxxx"
          value={form.keyId}
          onChange={(event) => set('keyId', event.target.value)}
          error={form.keyId && !keyIdValid ? 'Must start with rzp_test_ or rzp_live_.' : undefined}
        />
        <TextField
          label="Key Secret"
          name="rzpKeySecret"
          type="password"
          required={secretRequired}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={view?.keySecretSet && !keyChanged ? 'Saved — leave blank to keep the current secret' : ''}
          value={form.keySecret}
          onChange={(event) => set('keySecret', event.target.value)}
        />
        <TextField
          label="Webhook secret"
          name="rzpWebhookSecret"
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          placeholder={view?.webhookSecretSet && !keyChanged ? 'Saved — leave blank to keep the current secret' : ''}
          value={form.webhookSecret}
          onChange={(event) => set('webhookSecret', event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="MID" name="rzpMid" autoComplete="off" value={form.mid} onChange={(event) => set('mid', event.target.value)} />
          <TextField label="PF MID" name="rzpPfMid" autoComplete="off" value={form.pfMid} onChange={(event) => set('pfMid', event.target.value)} />
        </div>
        <p className="text-xs text-slate-500">MID and PF MID are stored for reference and reconciliation only; Razorpay does not need them to take payments.</p>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(event) => set('enabled', event.target.checked)} />
          <span>Enable online payment for colleges</span>
        </label>
        <TextField
          label="Your admin password"
          name="rzpConfirmPassword"
          type="password"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) => set('currentPassword', event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy !== null || (view !== null && !view.encryptionKeyConfigured)}>
            {busy === 'save' ? <ButtonSpinner /> : null}
            Save settings
          </button>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 border border-navy px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60" disabled={busy !== null || !view?.configured} onClick={() => void onTest()}>
            {busy === 'test' ? <ButtonSpinner /> : null}
            Test connection
          </button>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 border border-red-700 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-60" disabled={busy !== null || view?.source !== 'database'} onClick={() => void onClear()}>
            {busy === 'clear' ? <ButtonSpinner /> : null}
            Remove credentials
          </button>
        </div>
      </form>

      <section className="mt-6 max-w-2xl border border-slate-300 bg-white p-5 text-sm">
        <h2 className="text-sm font-semibold text-navy">Webhook (recommended)</h2>
        <p className="mt-2 text-slate-700">
          In the Razorpay Dashboard go to Settings → Webhooks, add this URL, choose a webhook secret, paste the same secret above, and tick these events:
        </p>
        <p className="mt-2 break-all rounded bg-slate-50 px-3 py-2 font-mono text-xs">{view?.webhookUrl ?? 'Save settings to see the URL.'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="border border-navy px-3 py-1 text-xs font-semibold text-navy disabled:opacity-60" disabled={!view?.webhookUrl} onClick={() => void copyWebhookUrl()}>
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <span className="text-xs text-slate-600">{WEBHOOK_EVENTS.join(', ')}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Without the webhook, payments are still confirmed when the college returns from checkout and by a background check, but the webhook makes it instant and covers closed browser tabs.
        </p>
        <p className="mt-3"><Link className="font-semibold text-navy underline" to="/admin/payments">View payment records</Link></p>
      </section>
    </>
  );
}
