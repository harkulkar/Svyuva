import { INSURERS } from '../../data/schemeContent';
import { SITE } from '../../data/site';
import { PublicPage } from './PublicPage';

export function Contact() {
  return (
    <PublicPage
      title="Contact"
      subtitle="Details published on svyuvasuraksha.org"
      path="/contact"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Contact' }
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="border border-slate-300 bg-white p-8 text-center lg:col-span-1">
          <h2 className="text-lg font-semibold text-navy">Nodel Agency</h2>
          <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-saffron text-white" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 12a7.5 7.5 0 0 1 15 0" />
              <path d="M4.5 12v3.2A1.8 1.8 0 0 0 6.3 17H8v-5H6.3A1.8 1.8 0 0 0 4.5 13.8" />
              <path d="M19.5 12v3.2a1.8 1.8 0 0 1-1.8 1.8H16v-5h1.7a1.8 1.8 0 0 1 1.8 1.8" />
              <circle cx="12" cy="13.2" r="2.1" fill="currentColor" stroke="none" />
              <path d="M8.8 19.2a4.2 4.2 0 0 1 6.4 0" />
            </svg>
          </div>
          <h3 className="mt-6 text-base font-semibold text-navy">Primary Helpline Number</h3>
          <p className="mt-1 text-sm text-slate-600">
            <a href={SITE.contact.phoneHref} className="hover:underline">
              {SITE.contact.phoneDisplay}
            </a>
          </p>
          <h3 className="mt-6 text-base font-semibold text-navy">Primary Email</h3>
          <p className="mt-1 text-sm text-slate-600">
            <a href={`mailto:${SITE.contact.displayEmail}`} className="hover:underline">
              {SITE.contact.displayEmail}
            </a>
          </p>
        </section>
        <section className="border-t-4 border-saffron bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy">{INSURERS.icici.title}</h2>
          <p className="mt-3 text-sm font-medium">{INSURERS.icici.person}</p>
          <p className="mt-2 text-sm">{INSURERS.icici.address}</p>
          <p className="mt-2 text-sm">
            <a href={`tel:${INSURERS.icici.mobile}`} className="text-navy underline">
              {INSURERS.icici.mobile}
            </a>
          </p>
          <p className="mt-2 text-sm">
            <a href={`mailto:${INSURERS.icici.email}`} className="text-navy underline">
              {INSURERS.icici.email}
            </a>
          </p>
        </section>
        <section className="border-t-4 border-indiaGreen bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy">{INSURERS.national.title}</h2>
          <p className="mt-3 text-sm font-medium">
            {INSURERS.national.person}, {INSURERS.national.role}
          </p>
          <p className="mt-2 text-sm">
            {INSURERS.national.office}
            <br />
            {INSURERS.national.address}
          </p>
          <p className="mt-2 text-sm">
            <a href={`tel:${INSURERS.national.mobile}`} className="text-navy underline">
              {INSURERS.national.mobile}
            </a>
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {INSURERS.national.emails.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}`} className="text-navy underline">
                  {email}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicPage>
  );
}
