import type { PublicDocument } from '../../data/documents';

type DocumentCardProps = {
  document: PublicDocument;
};

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <article className="flex h-full flex-col border border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy">{document.type}</p>
      <h3 className="mt-1 text-base font-semibold text-navy-dark">{document.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">{document.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={document.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          View
        </a>
        <a
          href={document.href}
          download
          className="inline-flex items-center border border-navy px-3 py-2 text-sm font-medium text-navy hover:bg-navy hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        >
          Download
        </a>
      </div>
    </article>
  );
}

export function DocumentsEmpty() {
  return <p className="rounded border border-slate-300 bg-white px-4 py-6 text-sm text-slate-700">No documents available.</p>;
}
