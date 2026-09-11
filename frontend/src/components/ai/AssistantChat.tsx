import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorMessage } from '../common/ErrorMessage';
import { ButtonSpinner } from '../common/Loading';
import { fetchAiStatus, getApiErrorMessage, sendAiChat, sendAiFeedback } from '../../services/api';
import type { AiChatMessage, AiCitation, AiLanguage, SourceQuality } from '../../types/ai';

const DISCLOSURE = 'AI-generated assistance. This is not an official approval, government order, or administrative decision.';

function qualityLabel(quality?: SourceQuality | '') {
  if (quality === 'VERIFIED_FROM_KNOWLEDGE_BASE') return 'Based on approved knowledge documents';
  if (quality === 'PARTIALLY_SUPPORTED') return 'Partially supported by approved documents';
  if (quality === 'FROM_AUTHORIZED_RECORDS') return 'From authorised portal records';
  return 'Could not be verified from available official documents';
}

function sourceHref(citation: AiCitation): string | null {
  if (citation.sourceUrl && citation.sourceUrl.startsWith('/')) return citation.sourceUrl;
  if (citation.href?.startsWith('/')) return citation.href;
  return null;
}

export function AssistantChat() {
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState<AiLanguage | 'auto'>('auto');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerNote, setProviderNote] = useState<string | null>(null);

  useEffect(() => {
    void fetchAiStatus()
      .then((status) => {
        setProviderNote(
          status.externalLlm
            ? 'External model configured. Answers still require approved sources for official facts.'
            : 'Using the portal knowledge base (no external LLM key).'
        );
      })
      .catch(() => {
        setProviderNote('The assistant may be unavailable. Login, students, insurance, and admin still work.');
      });
  }, []);

  function resetConversation() {
    setConversationId(undefined);
    setMessages([]);
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 2) {
      setError('Enter a question.');
      return;
    }
    setBusy(true);
    setError(null);
    const pendingUser: AiChatMessage = { id: `local-${Date.now()}`, role: 'user', content: text };
    setMessages((current) => [...current, pendingUser]);
    setQuestion('');
    try {
      const result = await sendAiChat({
        question: text,
        conversationId,
        language: language === 'auto' ? undefined : language
      });
      setConversationId(result.conversationId);
      setMessages((current) => [
        ...current.filter((item) => item.id !== pendingUser.id),
        { id: `${pendingUser.id}-saved`, role: 'user', content: text },
        { ...result.message, citations: result.citations }
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'The AI assistant is temporarily unavailable. The rest of the portal still works.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError('Could not copy the response.');
    }
  }

  return (
    <div className="max-w-3xl">
      <p className="border border-saffron bg-white px-4 py-3 text-sm text-navy" role="note">
        {DISCLOSURE}
      </p>
      {providerNote ? <p className="mt-2 text-xs text-slate-600">{providerNote}</p> : null}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-navy">Answer language</span>
          <select
            className="mt-1 border border-slate-300 px-2 py-1 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value as AiLanguage | 'auto')}
          >
            <option value="auto">Match the question</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </label>
        <button type="button" className="border border-navy px-3 py-1 text-sm text-navy" onClick={resetConversation}>
          New conversation
        </button>
      </div>
      <div className="mt-4 min-h-[12rem] space-y-3 border border-slate-300 bg-white p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600">Ask about the published scheme pages, portal procedures, or (if signed in) records you are authorised to see.</p>
        ) : (
          messages.map((item) => (
            <article key={item.id} className={item.role === 'user' ? 'text-sm' : 'border-t border-slate-100 pt-3 text-sm'}>
              <p className="font-semibold text-navy">{item.role === 'user' ? 'You' : 'Assistant'}</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-800">{item.content}</p>
              {item.role === 'assistant' ? (
                <>
                  <p className="mt-2 text-xs text-slate-600">{qualityLabel(item.sourceQuality)}</p>
                  {item.citations?.length ? (
                    <ul className="mt-2 text-xs text-slate-700">
                      <li className="font-semibold">Sources</li>
                      {item.citations.map((citation) => {
                        const href = sourceHref(citation);
                        return (
                          <li key={`${citation.knowledgeDocumentId}-${citation.section || citation.page || citation.title}`}>
                            {href ? (
                              <Link className="underline" to={href}>
                                {citation.title}
                                {citation.page ? ` — Page ${citation.page}` : ''}
                                {citation.section ? ` — ${citation.section}` : ''}
                              </Link>
                            ) : (
                              <span>
                                {citation.title}
                                {citation.page ? ` — Page ${citation.page}` : ''}
                                {citation.section ? ` — ${citation.section}` : ''}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="border border-slate-300 px-2 py-1 text-xs" onClick={() => void copyText(item.content)}>
                      Copy response
                    </button>
                    {conversationId ? (
                      <>
                        <button
                          type="button"
                          className="border border-slate-300 px-2 py-1 text-xs"
                          onClick={() => void sendAiFeedback({ conversationId, messageId: item.id, rating: 'helpful' })}
                        >
                          Helpful
                        </button>
                        <button
                          type="button"
                          className="border border-slate-300 px-2 py-1 text-xs"
                          onClick={() => void sendAiFeedback({ conversationId, messageId: item.id, rating: 'not_helpful' })}
                        >
                          Not helpful
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
            </article>
          ))
        )}
        {busy ? (
          <p className="inline-flex items-center gap-2 text-sm text-navy">
            <ButtonSpinner /> Preparing an answer…
          </p>
        ) : null}
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorMessage message={error} />
        </div>
      ) : null}
      <form className="mt-4 space-y-3" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-sm font-medium text-navy" htmlFor="ai-question">
          Question
        </label>
        <textarea
          id="ai-question"
          className="w-full border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={4000}
        />
        <button type="submit" className="inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={busy}>
          {busy ? <ButtonSpinner /> : null}
          Ask
        </button>
      </form>
    </div>
  );
}
