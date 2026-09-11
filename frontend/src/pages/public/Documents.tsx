import { DocumentCard, DocumentsEmpty } from '../../components/common/DocumentCard';
import { PUBLIC_DOCUMENTS } from '../../data/documents';
import { PublicPage } from './PublicPage';

export function Documents() {
  return (
    <PublicPage
      title="Documents"
      subtitle="Official files published on the existing SV Yuva Suraksha Yojana website"
      path="/documents"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Documents' }
      ]}
    >
      {PUBLIC_DOCUMENTS.length === 0 ? (
        <DocumentsEmpty />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_DOCUMENTS.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </PublicPage>
  );
}
