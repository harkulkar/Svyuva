import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Loading, ButtonSpinner } from '../../components/common/Loading';
import {
  fetchKnowledgeDocuments,
  getApiErrorMessage,
  reprocessKnowledgeDocument,
  updateKnowledgeStatus,
  uploadKnowledgeDocument
} from '../../services/api';
import type { KnowledgeListItem } from '../../types/ai';

export function AdminKnowledgePage() {
  const [items, setItems] = useState<KnowledgeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('1');
  const [accessScope, setAccessScope] = useState('GLOBAL_OFFICIAL_KNOWLEDGE');
  const [file, setFile] = useState<File | null>(null);

  function load() {
    setError(null);
    void fetchKnowledgeDocuments()
      .then((result) => setItems(result.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Select a document.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadKnowledgeDocument({
        file,
        title: title || file.name,
        source,
        version,
        accessScope
      });
      setStatus('Upload accepted. Processing runs in the background.');
      setFile(null);
      setTitle('');
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(id: string, next: 'ACTIVE' | 'ARCHIVED' | 'DRAFT') {
    try {
      await updateKnowledgeStatus(id, next);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Seo title="Knowledge repository" path="/admin/knowledge" />
      <h1 className="text-2xl font-semibold text-navy">Knowledge repository</h1>
      <p className="mt-2 text-sm text-slate-700">
        Only administrators may add official knowledge. A new file creates a new record; archive the previous version yourself.
        Only ACTIVE documents are used for official RAG answers.
      </p>
      {error ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
      {status ? <p className="mt-3 text-sm text-navy" role="status">{status}</p> : null}
      <form className="mt-6 space-y-3 border border-slate-300 bg-white p-5" onSubmit={(event) => void onUpload(event)}>
        <label className="block text-sm">
          Title
          <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="block text-sm">
          Source (as published)
          <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={source} onChange={(event) => setSource(event.target.value)} />
        </label>
        <label className="block text-sm">
          Version
          <input className="mt-1 w-full border border-slate-300 px-3 py-2" value={version} onChange={(event) => setVersion(event.target.value)} />
        </label>
        <label className="block text-sm">
          Access scope
          <select className="mt-1 w-full border border-slate-300 px-3 py-2" value={accessScope} onChange={(event) => setAccessScope(event.target.value)}>
            <option value="GLOBAL_OFFICIAL_KNOWLEDGE">Global official knowledge</option>
            <option value="ADMIN_ONLY">Admin only</option>
            <option value="INSTITUTE_SPECIFIC">Institute specific</option>
          </select>
        </label>
        <input type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="submit" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy}>
          {busy ? <ButtonSpinner /> : null}
          Upload
        </button>
      </form>
      {!loaded && !error ? <div className="mt-4"><Loading /></div> : null}
      <div className="mt-6 overflow-x-auto border border-slate-300 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">OCR</th>
              <th className="px-3 py-2">Scope</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{item.title}</td>
                <td className="px-3 py-2">{item.version}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.ocrStatus}</td>
                <td className="px-3 py-2">{item.accessScope}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="border border-navy px-2 py-1 text-xs" onClick={() => void changeStatus(item.id, 'ACTIVE')}>Activate</button>
                    <button type="button" className="border border-navy px-2 py-1 text-xs" onClick={() => void changeStatus(item.id, 'ARCHIVED')}>Archive</button>
                    <button type="button" className="border border-navy px-2 py-1 text-xs" onClick={() => void reprocessKnowledgeDocument(item.id).then(load)}>Reprocess</button>
                  </div>
                  {item.processingError ? <p className="mt-1 text-xs text-red-800">{item.processingError}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
