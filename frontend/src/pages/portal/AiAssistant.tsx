import { Seo } from '../../components/common/Seo';
import { AssistantChat } from '../../components/ai/AssistantChat';

export function PortalAiAssistantPage({ title, path }: { title: string; path: string }) {
  return (
    <>
      <Seo title={title} path={path} />
      <h1 className="text-2xl font-semibold text-navy">{title}</h1>
      <p className="mt-2 text-sm text-slate-700">Assistance only. Use the normal portal actions for approvals and record changes.</p>
      <div className="mt-4">
        <AssistantChat />
      </div>
    </>
  );
}
