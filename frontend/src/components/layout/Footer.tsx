import { Link } from 'react-router-dom';
import { FOOTER_POLICY_LINKS, FOOTER_QUICK_LINKS } from '../../data/navigation';
import { SITE } from '../../data/site';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-navy-dark text-blue-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-start gap-3">
            <img src={SITE.logoSrc} alt="" className="h-12 w-12 bg-white p-1" />
            <div>
              <p className="font-semibold text-white">{SITE.shortName}</p>
              <p className="mt-1 text-xs leading-relaxed">{SITE.departmentLine}</p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-saffron">Information</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {FOOTER_QUICK_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-saffron">Useful links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {FOOTER_POLICY_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-saffron">Contact</h2>
          <p className="mt-3 text-sm">
            <a href={SITE.contact.mailto} className="hover:text-white hover:underline">
              {SITE.contact.displayEmail}
            </a>
          </p>
          <p className="mt-2 text-sm">
            <a href={SITE.contact.phoneHref} className="hover:text-white hover:underline">
              {SITE.contact.phoneDisplay}
            </a>
          </p>
          
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE.shortName}. All Rights Reserved.
          </p>
          <p>
            <Link to="/disclaimer" className="hover:text-white hover:underline">
              Disclaimer
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
