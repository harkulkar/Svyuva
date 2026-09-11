import { PublicPage } from './PublicPage';
import { AssistantChat } from '../../components/ai/AssistantChat';

export function AiAssistantPage() {
  return (
    <PublicPage
      title="AI assistant"
      subtitle="Answers from approved portal knowledge. Not an official decision."
      path="/ai-assistant"
      crumbs={[
        { label: 'Home', to: '/' },
        { label: 'AI assistant' }
      ]}
    >
      <AssistantChat />
    </PublicPage>
  );
}
