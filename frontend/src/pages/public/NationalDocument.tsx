import { DocumentCard, DocumentsEmpty } from '../../components/common/DocumentCard';
import { documentsByCategory } from '../../data/documents';
import { INSURERS } from '../../data/schemeContent';
import { PublicPage } from './PublicPage';

export function NationalDocument() {
  const docs = documentsByCategory('national');
  const insurer = INSURERS.national;
  return (
    <PublicPage
      title="National Insurance Company"
      subtitle="Contact details and claim document from the existing portal"
      path="/national-document"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'Downloads', to: '/downloads' },
        { label: 'National Insurance Company' }
      ]}
    >
      <div className="mb-8 border border-slate-300 bg-white p-6">
        <h2 className="text-lg font-semibold text-navy">Communication address and contact person</h2>
        <p className="mt-3 text-sm leading-relaxed">
          {insurer.title}
          <br />
          {insurer.office}
          <br />
          {insurer.address}
          <br />
          {insurer.person} / {insurer.role}
        </p>
        <p className="mt-3 text-sm">
          Mobile:{' '}
          <a href={`tel:${insurer.mobile}`} className="text-navy underline">
            {insurer.mobile}
          </a>
        </p>
        <p className="mt-2 text-sm">
          Email:{' '}
          {insurer.emails.map((email, index) => (
            <span key={email}>
              {index > 0 ? ', ' : ''}
              <a href={`mailto:${email}`} className="text-navy underline">
                {email}
              </a>
            </span>
          ))}
        </p>
      </div>
      {docs.length === 0 ? (
        <DocumentsEmpty />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </PublicPage>
  );
}
