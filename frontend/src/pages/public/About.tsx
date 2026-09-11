import { Link } from 'react-router-dom';
import { ABOUT_SCHEME, PARENT_DEPARTMENT } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function About() {
  return (
    <PublicPage
      title={PARENT_DEPARTMENT.title}
      subtitle="About Us — Parent Department"
      path="/about-scheme"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'About Us', to: '/about' },
        { label: 'Parent Department' }
      ]}
    >
      <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="border border-slate-300 bg-white p-6">
          <h2 className="text-xl font-semibold text-navy">{ABOUT_SCHEME.title}</h2>
          {ABOUT_SCHEME.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-4 text-justify text-sm leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
          {PARENT_DEPARTMENT.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-4 text-sm leading-relaxed text-slate-700">
              {paragraph}
            </p>
          ))}
          <p className="mt-6 text-sm">
            Related:{' '}
            <Link to="/implementing-body" className="font-semibold text-navy underline">
              Implementing Body
            </Link>{' '}
            ·{' '}
            <Link to="/nodal-agency" className="font-semibold text-navy underline">
              Nodal Agency
            </Link>
          </p>
        </article>
        <aside>
          <img src={PARENT_DEPARTMENT.image} alt={PARENT_DEPARTMENT.imageAlt} className="w-full border border-slate-300 bg-white object-contain p-4" loading="lazy" />
        </aside>
      </div>
    </PublicPage>
  );
}
