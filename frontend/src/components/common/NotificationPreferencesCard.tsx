import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchNotificationPreferences, fetchPushStatus, getApiErrorMessage, updateNotificationPreferences } from '../../services/api';

export function NotificationPreferencesCard({ notificationsPath }: { notificationsPath: string }) {
  const [prefs, setPrefs] = useState<{ notifyInApp: boolean; notifyEmail: boolean } | null>(null);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void fetchNotificationPreferences()
      .then((data) => setPrefs({ notifyInApp: data.notifyInApp, notifyEmail: data.notifyEmail }))
      .catch((err) => setError(getApiErrorMessage(err)));
    void fetchPushStatus()
      .then((data) => setPushNote(data.note || (data.enabled ? 'Browser push is optional.' : 'Browser push is not configured. In-app notifications remain available.')))
      .catch(() => setPushNote('Browser push is optional and is never required to use the portal.'));
  }, []);

  if (!prefs) return null;

  return (
    <form
      className="mt-6 max-w-lg space-y-3 border border-slate-300 bg-white p-5 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(null);
        void updateNotificationPreferences(prefs)
          .then(() => setSaved('Notification preferences saved.'))
          .catch((err) => setError(getApiErrorMessage(err)));
      }}
    >
      <h2 className="font-semibold text-navy">Notification preferences</h2>
      <p className="text-xs text-slate-600">Critical account notices cannot be turned off. Email delivery depends on server mail configuration.</p>
      {error ? <p className="text-sm text-red-800" role="alert">{error}</p> : null}
      {saved ? <p className="text-sm text-green-800" role="status">{saved}</p> : null}
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={prefs.notifyInApp} onChange={(event) => setPrefs({ ...prefs, notifyInApp: event.target.checked })} />
        In-app (non-critical)
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={prefs.notifyEmail} onChange={(event) => setPrefs({ ...prefs, notifyEmail: event.target.checked })} />
        Email (non-critical)
      </label>
      {pushNote ? <p className="text-xs text-slate-600">{pushNote} The portal will not enable browser push without an explicit permission prompt.</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 bg-navy px-4 py-2 font-semibold text-white">
          Save preferences
        </button>
        <Link to={notificationsPath} className="inline-flex min-h-11 items-center font-semibold text-navy underline">
          Open notification centre
        </Link>
      </div>
    </form>
  );
}
