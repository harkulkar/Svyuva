import { useEffect, useState, type FormEvent } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading } from '../../components/common/Loading';
import { ConfirmDialog } from '../../components/common/AdminUi';
import {
  createAnnouncementRequest,
  fetchAnnouncements,
  getApiErrorMessage,
  publishAnnouncementRequest,
  unpublishAnnouncementRequest
} from '../../services/api';
import type { AnnouncementItem } from '../../types/notifications';

export function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState('ALL');
  const [audienceRole, setAudienceRole] = useState('COLLEGE');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function load() {
    void fetchAnnouncements({ page: 1, limit: 20 })
      .then((data) => setItems(data.items))
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createAnnouncementRequest({
        title,
        body,
        audienceType,
        audienceRole: audienceType === 'ROLE' ? audienceRole : undefined,
        language: 'en',
        status: 'DRAFT'
      });
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Announcements" path="/admin/announcements" />
      <h1 className="text-2xl font-semibold text-navy">Announcements</h1>
      <p className="mt-2 text-sm text-slate-700">Audience targeting creates one inbox record per recipient, with duplicate protection. TODO: VERIFY OFFICIAL CONTENT before publishing legal text.</p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      <form className="mt-6 max-w-xl space-y-3 border border-slate-300 bg-white p-5" onSubmit={(event) => void create(event)}>
        <label className="block text-sm">Title<input className="mt-1 w-full border px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label className="block text-sm">Message<textarea className="mt-1 w-full border px-3 py-2" rows={4} value={body} onChange={(event) => setBody(event.target.value)} required /></label>
        <label className="block text-sm">
          Recipients
          <select className="mt-1 w-full border px-3 py-2" value={audienceType} onChange={(event) => setAudienceType(event.target.value)}>
            <option value="ALL">All users</option>
            <option value="ROLE">Selected role</option>
          </select>
        </label>
        {audienceType === 'ROLE' ? (
          <select className="w-full border px-3 py-2" value={audienceRole} onChange={(event) => setAudienceRole(event.target.value)}>
            <option value="COLLEGE">All colleges</option>
            <option value="ADMIN">Administrators</option>
          </select>
        ) : null}
        <button type="submit" className="bg-navy px-4 py-2 text-sm font-semibold text-white">Save draft</button>
      </form>
      {!items.length && !error ? <div className="mt-4"><Loading /></div> : null}
      {items.length > 0 ? (
        <>
          <div className="mt-6 space-y-3 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="border border-slate-300 bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{item.title}</p>
                <p className="mt-1">{item.status} · {item.audienceType}{item.audienceRole ? ` / ${item.audienceRole}` : ''}</p>
                <p className="mt-1 text-slate-600">Fan-out: {item.fanoutStatus}</p>
                <div className="mt-3">
                  {item.status !== 'PUBLISHED' ? (
                    <button type="button" className="font-semibold text-navy underline" onClick={() => setConfirmId(item.id)}>Publish</button>
                  ) : (
                    <button type="button" className="font-semibold text-navy underline" onClick={() => void unpublishAnnouncementRequest(item.id).then(load)}>Unpublish</button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto border border-slate-300 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Audience</th>
              <th className="px-3 py-2">Fan-out</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{item.title}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.audienceType}{item.audienceRole ? ` / ${item.audienceRole}` : ''}</td>
                <td className="px-3 py-2">{item.fanoutStatus}</td>
                <td className="px-3 py-2">
                  {item.status !== 'PUBLISHED' ? (
                    <button type="button" className="text-navy underline" onClick={() => setConfirmId(item.id)}>Publish</button>
                  ) : (
                    <button type="button" className="text-navy underline" onClick={() => void unpublishAnnouncementRequest(item.id).then(load)}>Unpublish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Publish announcement"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!confirmId) return;
          void publishAnnouncementRequest(confirmId).then(() => { setConfirmId(null); load(); }).catch((err) => setError(getApiErrorMessage(err)));
        }}
      >
        This will create in-app notifications for the selected audience and is audited.
      </ConfirmDialog>
    </>
  );
}
