import { Link } from 'react-router-dom';
import { ACCESSIBILITY_FEATURES, getPolicy, WEBSITE_POLICY_INDEX } from '../../data/policies';
import { PublicPage } from './PublicPage';

export function WebsitePolicies() {
  return (
    <PublicPage
      title="Website Policies"
      path="/website-policies"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Website Policies' }
      ]}
    >
      <ul className="divide-y divide-slate-200 border border-slate-300 bg-white">
        {WEBSITE_POLICY_INDEX.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="block px-4 py-3 text-sm font-medium text-navy hover:bg-slate-50">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}

export function PolicyPageView({ slug }: { slug: string }) {
  const page = getPolicy(slug);
  if (!page) {
    return (
      <PublicPage title="Page not found" path={`/${slug}`} crumbs={[{ label: 'Home', to: '/' }, { label: 'Not found' }]}>
        <p>The requested policy page was not found.</p>
      </PublicPage>
    );
  }

  return (
    <PublicPage
      title={page.title}
      path={`/${slug}`}
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Website Policies', to: '/website-policies' },
        { label: page.title }
      ]}
    >
      <article className="border border-slate-300 bg-white p-6">
        {page.paragraphs.length === 0 ? (
          <p className="text-sm text-slate-700">No documents available.</p>
        ) : (
          page.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-4 text-justify text-sm leading-relaxed text-slate-700 first:mt-0">
              {paragraph}
            </p>
          ))
        )}
        {slug === 'accessibility-statement' ? (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-navy">Accessibility Features</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {ACCESSIBILITY_FEATURES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {page.incomplete ? <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">{page.incomplete}</p> : null}
      </article>
    </PublicPage>
  );
}
