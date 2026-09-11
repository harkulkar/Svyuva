import { LinkCard } from '../../components/common/LinkCard';
import { PRESS_ITEMS } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function Press() {
  return (
    <PublicPage
      title="Press"
      subtitle="Items linked from the existing website"
      path="/press"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Press' }
      ]}
    >
      {PRESS_ITEMS.length === 0 ? (
        <p className="rounded border border-slate-300 bg-white px-4 py-6 text-sm">No press releases available.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {PRESS_ITEMS.map((item) => (
            <LinkCard key={item.href} title={item.title} description={item.summary} href={item.href} external />
          ))}
        </div>
      )}
    </PublicPage>
  );
}
