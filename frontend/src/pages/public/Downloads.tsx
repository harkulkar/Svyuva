import { DocumentCard, DocumentsEmpty } from '../../components/common/DocumentCard';
import { SectionTitle } from '../../components/common/SectionTitle';
import { documentsByCategory } from '../../data/documents';
import { PublicPage } from './PublicPage';

export function Downloads() {
  const groups = [
    { title: "G.R'S", items: documentsByCategory('gr') },
    { title: 'Scheme PDFs', items: documentsByCategory('scheme') },
    { title: 'Excel format', items: documentsByCategory('template') },
    { title: 'National Insurance Company', items: documentsByCategory('national') },
    { title: 'ICICI Lombard GIC', items: documentsByCategory('icici') }
  ];

  const hasAny = groups.some((group) => group.items.length > 0);

  return (
    <PublicPage
      title="Downloads"
      subtitle="G.R'S, scheme documents, and insurer files from the existing portal"
      path="/downloads"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Downloads' }
      ]}
    >
      {!hasAny ? (
        <DocumentsEmpty />
      ) : (
        groups.map((group) => (
          <section key={group.title} className="mb-10">
            <SectionTitle title={group.title} as="h2" />
            {group.items.length === 0 ? (
              <DocumentsEmpty />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {group.items.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </PublicPage>
  );
}
