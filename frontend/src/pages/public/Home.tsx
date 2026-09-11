import { Link } from 'react-router-dom';
import { Hero } from '../../components/common/Hero';
import { SectionTitle } from '../../components/common/SectionTitle';
import { Seo } from '../../components/common/Seo';
import { PUBLIC_DOCUMENTS } from '../../data/documents';
import { ABOUT_SCHEME } from '../../data/schemeContent';
import { QUOTES, SITE, USEFUL_LINKS } from '../../data/site';

export function Home() {
  const featuredDocs = PUBLIC_DOCUMENTS.filter((doc) => doc.category === 'scheme' || doc.category === 'gr').slice(0, 4);

  return (
    <>
      <Seo title={SITE.fullName} description={SITE.description} path="/" />
      <main id="main-content">
        <Hero />
        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionTitle eyebrow="Introduction" title={ABOUT_SCHEME.title} />
          {ABOUT_SCHEME.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="max-w-4xl text-justify text-sm leading-relaxed text-slate-700 sm:text-base">
              {paragraph}
            </p>
          ))}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/scheme" className="bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-light">
              Scheme information
            </Link>
            <Link to="/personal-accidents" className="border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white">
              Personal Accident
            </Link>
            <Link to="/mediclaim-coverage" className="border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white">
              Mediclaim
            </Link>
          </div>
        </section>

        <section className="bg-navy py-10 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle title="Words of Swami Vivekananda" />
            <ul className="grid gap-4 sm:grid-cols-2">
              {QUOTES.map((quote) => (
                <li key={quote} className="border border-white/20 bg-navy-light/40 p-4 text-sm italic text-blue-50">
                  “{quote}”
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionTitle eyebrow="Insurance Scheme" title="Coverage described on the portal" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Link to="/personal-accidents" className="overflow-hidden border border-slate-300 bg-white shadow-sm hover:border-navy">
              <img src="/assets/images/personal-accident.jpg" alt="" className="h-48 w-full object-cover" loading="lazy" />
              <div className="p-5">
                <h3 className="text-xl font-semibold text-navy">Personal Accident</h3>
                <p className="mt-2 text-sm text-slate-700">Benefit descriptions published on the existing website, with the official PA PDF for complete wording.</p>
              </div>
            </Link>
            <Link to="/mediclaim-coverage" className="overflow-hidden border border-slate-300 bg-white shadow-sm hover:border-navy">
              <img src="/assets/images/plans.jpg" alt="" className="h-48 w-full object-cover" loading="lazy" />
              <div className="p-5">
                <h3 className="text-xl font-semibold text-navy">Mediclaim</h3>
                <p className="mt-2 text-sm text-slate-700">Mediclaim items published on the existing website, with the official mediclaim PDF for complete wording.</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="bg-[#efe6d6] py-10">
          <div className="mx-auto max-w-6xl px-4">
            <SectionTitle eyebrow="Downloads" title="Official documents on this portal" />
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredDocs.map((doc) => (
                <a key={doc.id} href={doc.href} className="border border-slate-300 bg-white px-4 py-3 text-sm hover:border-navy" target="_blank" rel="noopener noreferrer">
                  <span className="font-semibold text-navy">{doc.name}</span>
                  <span className="mt-1 block text-slate-600">{doc.type}</span>
                </a>
              ))}
            </div>
            <Link to="/downloads" className="mt-4 inline-block text-sm font-semibold text-navy underline">
              All downloads
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <SectionTitle title="Useful links" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {USEFUL_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer" className="block border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-navy hover:bg-navy hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t-4 border-saffron bg-white py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy">Contact</h2>
              <p className="text-sm text-slate-700">{SITE.contact.note}</p>
            </div>
            <div className="text-sm">
              <a href={SITE.contact.mailto} className="block font-semibold text-navy hover:underline">
                {SITE.contact.displayEmail}
              </a>
              <a href={SITE.contact.phoneHref} className="mt-1 block font-semibold text-navy hover:underline">
                {SITE.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
