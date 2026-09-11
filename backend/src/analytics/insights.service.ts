import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { attentionSentences, getAttentionStats } from './analytics.service.js';
import { generateAssistantReply } from '../ai/providers/generate.js';
import type { AuthUser } from '../types/auth.js';
import type { ToolCallResult } from '../ai/ai.types.js';

export async function getDashboardInsights(user: AuthUser) {
  if (user.role === 'COLLEGE' && !user.instituteId) {
    throw new AppError('College scope is required.', 403, 'FORBIDDEN');
  }
  const stats =
    user.role === 'ADMIN'
      ? await getAttentionStats()
      : await getAttentionStats({ instituteId: user.instituteId as string });
  const attention = attentionSentences(stats);
  const deterministic = attention.join(' ');
  let summary = deterministic;
  let aiUsed = false;
  if (env.AI_PROVIDER !== 'none') {
    try {
      const tools: ToolCallResult[] = [
        {
          name: user.role === 'ADMIN' ? 'getDashboardStatistics' : 'getMyInstituteSummary',
          ok: true,
          data: stats
        }
      ];
      const ai = await generateAssistantReply({
        language: 'en',
        question: 'Summarise these authorised operational statistics. Do not invent numbers or official scheme facts.',
        retrieved: [],
        tools
      });
      if (ai.answer && !/could not verify/i.test(ai.answer)) {
        summary = `${deterministic} ${ai.answer}`.slice(0, 4000);
        aiUsed = true;
      }
    } catch {
      summary = deterministic;
    }
  }
  return {
    attention,
    summary,
    stats,
    aiUsed,
    aiOptional: true,
    note: 'Statistics are computed on the server. AI only restates those numbers and remains optional.'
  };
}
