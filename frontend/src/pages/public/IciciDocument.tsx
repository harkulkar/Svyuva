import { DocumentCard, DocumentsEmpty } from '../../components/common/DocumentCard';
import { documentsByCategory } from '../../data/documents';
import { INSURERS } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function IciciDocument() {
  const docs = documentsByCategory('icici');
  const insurer = INSURERS.icici;
  return (
    <PublicPage
      title="ICICI Lombard GIC"
      subtitle="Nodal office contact and claim documents from the existing portal"
      path="/icici-document"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Downloads', to: '/downloads' },
        { label: 'ICICI Lombard GIC' }
      ]}
    >
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <section className="bg-navy p-6 text-white">
          <h2 className="text-lg font-semibold">Communication address</h2>
          <p className="mt-3 text-sm">
            {insurer.person}
            <br />
            {insurer.address}
          </p>
        </section>
        <section className="border border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-navy">Phone and email</h2>
          <p className="mt-3 text-sm">
            <a href={`tel:${insurer.mobile}`} className="text-navy underline">
              {insurer.mobile}
            </a>
            <br />
            <a href={`mailto:${insurer.email}`} className="text-navy underline">
              {insurer.email}
            </a>
          </p>
        </section>
      </div>
      {docs.length === 0 ? (
        <DocumentsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </PublicPage>
  );
}
