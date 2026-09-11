import { Link } from 'react-router-dom';
import { PublicPage } from './PublicPage';

export function Scheme() {
  return (
    <PublicPage
      title="Scheme information"
      subtitle="Swami Vivekananda Yuva Suraksha Yojana"
      path="/scheme"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Scheme information' }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-navy">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            Official narrative is published under About Us. This page does not add new policy language.
          </p>
          <Link to="/about-scheme" className="mt-4 inline-block text-sm font-semibold text-navy underline">
            Parent Department
          </Link>
        </section>
        <section className="border-l-4 border-saffron bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-navy">Insurance covers listed on the portal</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <Link to="/personal-accidents" className="font-semibold text-navy underline">
                Personal Accident
              </Link>
            </li>
            <li>
              <Link to="/mediclaim-coverage" className="font-semibold text-navy underline">
                Mediclaim
              </Link>
            </li>
          </ul>
        </section>
        <section className="bg-[#efe6d6] p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-navy">Documents</h2>
          <p className="mt-2 text-sm text-slate-700">Government Resolutions and scheme PDFs from the existing website are under Downloads.</p>
          <Link to="/downloads" className="mt-3 inline-block text-sm font-semibold text-navy underline">
            Open downloads
          </Link>
        </section>
      </div>
    </PublicPage>
  );
}
