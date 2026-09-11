import { Accordion } from '../../components/common/Accordion';
import { FAQ_ITEMS } from '../../data/faq';
import { PublicPage } from './PublicPage';
import { Link } from 'react-router-dom';

export function FAQ() {
  return (
    <PublicPage
      title="FAQ"
      subtitle="Answers taken only from information already published on the existing website"
      path="/faq"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'FAQ' }
      ]}
    >
      {FAQ_ITEMS.length === 0 ? (
        <p className="rounded border border-slate-300 bg-white px-4 py-6 text-sm">No questions available.</p>
      ) : (
        <Accordion items={FAQ_ITEMS} />
      )}
      <p className="mt-6 text-sm text-slate-700">
        For help finding published portal text you can also use the{' '}
        <Link to="/ai-assistant" className="font-semibold text-navy underline">
          AI assistant
        </Link>
        . It is not an official decision.
      </p>
    </PublicPage>
  );
}
