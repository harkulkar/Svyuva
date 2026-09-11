import { useEffect, useState } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { fetchTemplates, getApiErrorMessage, saveTemplate } from '../../services/api';

export function AdminTemplatesPage() {
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string; type: string; channel: string; language: string; subject: string; body: string; active: boolean }>>([]);
  const [name, setName] = useState('custom_en');
  const [type, setType] = useState('ANNOUNCEMENT');
  const [channel, setChannel] = useState('IN_APP');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Hello {{recipientName}}');

  function load() {
    void fetchTemplates()
      .then((data) => {
        setItems(data.items);
        setAllowed(data.allowedVariables);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Seo title="Notification templates" path="/admin/notification-templates" />
      <h1 className="text-2xl font-semibold text-navy">Notification templates</h1>
      <p className="mt-2 text-sm text-slate-700">Only allow-listed variables are replaced. Official/legal wording: TODO: VERIFY OFFICIAL CONTENT. Languages: English, Hindi, Marathi.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      <p className="mt-3 text-xs text-slate-600">Allowed: {allowed.map((item) => `{{${item}}}`).join(' ')}</p>
      <form
        className="mt-4 max-w-xl space-y-3 border border-slate-300 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void saveTemplate({ name, type, channel, language: 'en', subject, body, active: true })
            .then(load)
            .catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        <label className="block text-sm">Name<input className="mt-1 w-full border px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="block text-sm">Type<input className="mt-1 w-full border px-3 py-2" value={type} onChange={(event) => setType(event.target.value)} /></label>
        <label className="block text-sm">
          Channel
          <select className="mt-1 w-full border px-3 py-2" value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="IN_APP">IN_APP</option>
            <option value="EMAIL">EMAIL</option>
          </select>
        </label>
        <label className="block text-sm">Subject<input className="mt-1 w-full border px-3 py-2" value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label className="block text-sm">Body<textarea className="mt-1 w-full border px-3 py-2" rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Save template</button>
      </form>
      <div className="mt-6 overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Language</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t"><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.type}</td><td className="px-3 py-2">{item.channel}</td><td className="px-3 py-2">{item.language}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
