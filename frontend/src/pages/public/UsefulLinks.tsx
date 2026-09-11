import { LinkCard } from '../../components/common/LinkCard';
import { USEFUL_LINKS } from '../../data/site';
import { PublicPage } from './PublicPage';

export function UsefulLinks() {
  return (
    <PublicPage
      title="Useful Links"
      subtitle="Government websites listed on the existing portal"
      path="/useful-links"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Useful Links' }
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
          {USEFUL_LINKS.map((link) => (
            <LinkCard key={link.href} title={link.label} href={link.href} description={link.href} external />
          ))}
        </div>
    </PublicPage>
  );
}
