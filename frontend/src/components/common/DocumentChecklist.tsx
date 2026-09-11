import type { DocumentChecklistItem } from '../../types/workflow';

export function DocumentChecklist({ items, note }: { items: DocumentChecklistItem[]; note?: string }) {
  if (!items.length) {
    return (
      <section className="mt-4 border border-slate-300 bg-white p-4 text-sm">
        <h2 className="font-semibold text-navy">Required documents</h2>
        <p className="mt-2 text-slate-600">{note || 'No document requirements have been configured.'}</p>
      </section>
    );
  }
  return (
    <section className="mt-4 border border-slate-300 bg-white p-4 text-sm">
      <h2 className="font-semibold text-navy">Required documents</h2>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.documentType} className="flex items-start gap-2">
            <span aria-hidden="true">{item.state === 'approved' || item.state === 'uploaded' ? '✓' : '☐'}</span>
            <span>
              <span className="font-medium text-navy">{item.name}</span>
              {item.required ? <span className="ml-1 text-xs text-red-800">Required</span> : null}
              <span className="mt-1 block text-xs uppercase text-slate-500">{item.state.replace(/_/g, ' ')}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
