import { INSURERS } from '../../data/schemeContent';
import { SITE, TODO_VERIFY } from '../../data/site';
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
        <section className="border border-slate-300 bg-white p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-navy">Scheme portal</h2>
          <p className="mt-3 text-sm text-slate-700">{SITE.contact.note}</p>
          <p className="mt-4">
            <a href={SITE.contact.mailto} className="font-semibold text-navy underline">
              {SITE.contact.displayEmail}
            </a>
          </p>
          <p className="mt-2">
            <a href={SITE.contact.phoneHref} className="font-semibold text-navy underline">
              {SITE.contact.phoneDisplay}
            </a>
          </p>
          <p className="mt-6 text-xs text-slate-500">{TODO_VERIFY}: A full DHE office postal address was not published in the live contact block recovered for this rebuild.</p>
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
