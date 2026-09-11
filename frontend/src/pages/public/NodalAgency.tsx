import { NODAL_AGENCY } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function NodalAgency() {
  const person = NODAL_AGENCY.person;
  return (
    <PublicPage
      title={NODAL_AGENCY.title}
      subtitle="About the Nodal Agency"
      path="/nodal-agency"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'About Us', to: '/about' },
        { label: 'Nodal Agency' }
      ]}
    >
      <div className="overflow-hidden border border-slate-300 bg-white lg:grid lg:grid-cols-[1fr_280px]">
        <article className="p-6">
          <h2 className="text-xl font-semibold text-navy">Integrated Risk Insurance Brokers Limited</h2>
          {NODAL_AGENCY.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-4 text-justify text-sm leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
        </article>
        <aside className="bg-navy p-5 text-center text-white">
          <img src={person.photo} alt={person.photoAlt} className="mx-auto h-52 w-full object-cover" loading="lazy" />
          <h3 className="mt-4 font-semibold">{person.name}</h3>
          <p className="mt-1 text-sm text-blue-100">{person.role}</p>
        </aside>
      </div>
    </PublicPage>
  );
}
