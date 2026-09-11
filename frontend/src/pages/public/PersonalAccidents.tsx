import { PUBLIC_DOCUMENTS } from '../../data/documents';
import { PERSONAL_ACCIDENT } from '../../data/schemeContent';
import { TODO_VERIFY } from '../../data/site';
import { PublicPage } from './PublicPage';

export function PersonalAccidents() {
  const pdf = PUBLIC_DOCUMENTS.find((doc) => doc.id === PERSONAL_ACCIDENT.documentId);
  return (
    <PublicPage
      title={PERSONAL_ACCIDENT.title}
      subtitle="Insurance Scheme"
      path="/personal-accidents"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Insurance Scheme', to: '/insurance' },
        { label: 'Personal Accident' }
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <article className="border border-slate-300 bg-white p-6">
          <p className="text-sm text-slate-700">{PERSONAL_ACCIDENT.intro}</p>
          <ul className="mt-6 space-y-4">
            {PERSONAL_ACCIDENT.benefits.map((item) => (
              <li key={item.title} className="border-l-4 border-saffron pl-4">
                <h2 className="font-semibold text-navy">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-slate-500">{TODO_VERIFY}: Numeric capital sum-insured table referenced on the live page is provided in the PDF, not reconstructed as a new table.</p>
          {pdf ? (
            <a href={pdf.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-saffron px-4 py-2 text-sm font-semibold text-navy-dark">
              Read official PDF
            </a>
          ) : null}
        </article>
        <aside>
          <img src={PERSONAL_ACCIDENT.image} alt={PERSONAL_ACCIDENT.imageAlt} className="w-full border border-slate-300 object-cover" loading="lazy" />
        </aside>
      </div>
    </PublicPage>
  );
}
