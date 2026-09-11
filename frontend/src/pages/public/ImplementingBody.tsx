import { IMPLEMENTING_BODY } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function ImplementingBody() {
  const person = IMPLEMENTING_BODY.person;
  return (
    <PublicPage
      title={IMPLEMENTING_BODY.title}
      subtitle="Directorate of Higher Education"
      path="/implementing-body"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'About Us', to: '/about' },
        { label: 'Implementing Body' }
      ]}
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="border border-slate-300 bg-[#F5D5A2] p-4 text-center">
          <img src={person.photo} alt={person.photoAlt} className="mx-auto h-56 w-full object-cover" loading="lazy" />
          <h2 className="mt-4 text-lg font-semibold text-navy-dark">{person.name}</h2>
          <p className="text-sm text-slate-800">{person.role}</p>
        </aside>
        <article className="border border-slate-300 bg-white p-6">
          {IMPLEMENTING_BODY.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-justify text-sm leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </article>
      </div>
    </PublicPage>
  );
}
