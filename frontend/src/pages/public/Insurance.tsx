import { Link } from 'react-router-dom';
import { PublicPage } from './PublicPage';

export function Insurance() {
  return (
    <PublicPage
      title="Insurance Scheme"
      subtitle="Personal Accident and Mediclaim as listed on the existing website"
      path="/insurance"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Insurance Scheme' }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Link to="/personal-accidents" className="group overflow-hidden border border-slate-300 bg-white">
          <img src="/assets/images/personal-accident.jpg" alt="" className="h-52 w-full object-cover" loading="lazy" />
          <div className="p-5">
            <h2 className="text-xl font-semibold text-navy group-hover:underline">Personal Accident</h2>
            <p className="mt-2 text-sm text-slate-700">Death, disability, child education grant, and accidental hospitalisation descriptions published on the live portal.</p>
          </div>
        </Link>
        <Link to="/mediclaim-coverage" className="group overflow-hidden border border-slate-300 bg-white">
          <img src="/assets/images/policy-type.jpg" alt="" className="h-52 w-full object-cover" loading="lazy" />
          <div className="p-5">
            <h2 className="text-xl font-semibold text-navy group-hover:underline">Mediclaim</h2>
            <p className="mt-2 text-sm text-slate-700">Hospitalisation-related items published on the live Mediclaim page, plus the official PDF.</p>
          </div>
        </Link>
      </div>
    </PublicPage>
  );
}
