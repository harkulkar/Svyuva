import { PUBLIC_DOCUMENTS } from '../../data/documents';
import { MEDICLAIM } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function MediclaimCoverage() {
  const pdf = PUBLIC_DOCUMENTS.find((doc) => doc.id === MEDICLAIM.documentId);
  return (
    <PublicPage
      title={MEDICLAIM.title}
      subtitle="Coverage Benefits"
      path="/mediclaim-coverage"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Insurance Scheme', to: '/insurance' },
        { label: 'Mediclaim' }
      ]}
    >
      <div className="flex flex-col gap-8 lg:flex-row">
        <img src={MEDICLAIM.image} alt={MEDICLAIM.imageAlt} className="h-56 w-full object-cover lg:w-72" loading="lazy" />
        <article className="flex-1 border border-slate-300 bg-white p-6">
          <p className="text-sm text-slate-700">{MEDICLAIM.intro}</p>
          <dl className="mt-5 divide-y divide-slate-200">
            {MEDICLAIM.benefits.map((item) => (
              <div key={item.title} className="py-3">
                <dt className="font-semibold text-navy">{item.title}</dt>
                {item.text ? <dd className="mt-1 text-sm text-slate-700">{item.text}</dd> : null}
              </div>
            ))}
          </dl>
          {pdf ? (
            <a href={pdf.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-navy px-4 py-2 text-sm font-semibold text-white">
              Read More (PDF)
            </a>
          ) : null}
        </article>
      </div>
    </PublicPage>
  );
}
