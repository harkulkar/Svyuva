import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AiConversation } from '../models/AiConversation.js';
import { AiFeedback } from '../models/AiFeedback.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { generateAssistantReply } from './providers/generate.js';
import { detectLanguage } from './rag/embed.js';
import { retrieveChunks, type RetrievalScope } from './rag/retrieve.js';
import {
  isCredentialProbe,
  isCrossInstituteProbe,
  isWriteRequest,
  looksLikeInjection,
  runAuthorizedTool,
  selectTools
} from './tools/registry.js';
import { recordAiUsage } from './usage.js';
import { ensureSeedKnowledge } from './knowledge/knowledgeService.js';
import type { AiLanguage } from './ai.types.js';

function roleOf(user?: AuthUser): RetrievalScope['role'] {
  if (user?.role === 'ADMIN') return 'ADMIN';
  if (user?.role === 'COLLEGE') return 'COLLEGE';
  return 'GUEST';
}

export async function chatWithAssistant(input: {
  question: string;
  conversationId?: string;
  language?: AiLanguage;
  user?: AuthUser;
  req?: Request;
}) {
  const started = Date.now();
  const question = input.question.trim().slice(0, env.AI_MAX_PROMPT_CHARS);
  if (question.length < 2) throw new AppError('Enter a question.', 400, 'VALIDATION_ERROR');
  await ensureSeedKnowledge();
  const role = roleOf(input.user);
  const language = input.language || detectLanguage(question);

  let conversation = input.conversationId
    ? await AiConversation.findById(input.conversationId)
    : null;
  if (conversation && input.user && conversation.userId && String(conversation.userId) !== input.user.id) {
    throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  }
  if (!conversation) {
    conversation = await AiConversation.create({
      userId: input.user?.id || null,
      role,
      language,
      messages: []
    });
  }

  const refuseWrite = isWriteRequest(question);
  const refuseSecrets = isCredentialProbe(question);
  const refuseCross = role === 'COLLEGE' && isCrossInstituteProbe(question);
  const injection = looksLikeInjection(question);

  const tools = refuseWrite || refuseSecrets || refuseCross || injection ? [] : selectTools(question, role);
  const toolResults = [];
  for (const name of tools) {
    toolResults.push(await runAuthorizedTool(name, input.user, input.req));
  }

  const retrieved =
    refuseSecrets || refuseWrite || refuseCross || injection
      ? []
      : await retrieveChunks(question, { role, instituteId: input.user?.instituteId }, 5);

  let reply;
  try {
    reply = await generateAssistantReply({
      language,
      question,
      retrieved,
      tools: toolResults,
      refuseWrite,
      refuseSecrets,
      refuseCrossInstitute: refuseCross,
      injectionAttempt: injection
    });
  } catch {
    await recordAiUsage({
      userId: input.user?.id,
      role,
      operation: 'AI_QUERY',
      success: false,
      provider: env.AI_PROVIDER,
      latencyMs: Date.now() - started,
      requestId: input.req?.requestId
    });
    throw new AppError('The AI assistant is temporarily unavailable. The rest of the portal still works.', 503, 'AI_UNAVAILABLE');
  }

  const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: question, citations: [], sourceQuality: '' };
  const assistantMsg = {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    content: reply.answer,
    citations: retrieved.map((hit) => hit.citation),
    sourceQuality: reply.sourceQuality
  };
  conversation.messages.push(userMsg, assistantMsg);
  conversation.language = language;
  await conversation.save();

  await writeAudit({
    userId: input.user?.id,
    action: 'AI_QUERY',
    entity: 'AiConversation',
    entityId: String(conversation._id),
    req: input.req,
    metadata: {
      sourceCount: retrieved.length,
      tools: toolResults.map((item) => item.name),
      sourceQuality: reply.sourceQuality,
      success: true
    }
  });
  await recordAiUsage({
    userId: input.user?.id,
    role,
    operation: 'AI_QUERY',
    success: true,
    provider: reply.provider,
    latencyMs: Date.now() - started,
    category: retrieved.length ? 'rag' : toolResults.length ? 'tools' : 'unverified',
    tokenUsage: reply.tokenUsage,
    requestId: input.req?.requestId
  });

  return {
    conversationId: String(conversation._id),
    message: assistantMsg,
    citations: retrieved.map((hit) => ({
      ...hit.citation,
      href: hit.citation.sourceUrl || `/api/ai/knowledge/${hit.citation.knowledgeDocumentId}/source`
    })),
    sourceQuality: reply.sourceQuality,
    disclosure: 'AI-generated assistance. Not an official approval or government order.',
    language,
    provider: reply.provider
  };
}

export async function getConversation(id: string, user?: AuthUser) {
  const row = await AiConversation.findById(id);
  if (!row) throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  if (row.userId) {
    if (user && String(row.userId) === user.id) return row;
    throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
  }
  if (!user) return row;
  throw new AppError('Conversation not found.', 404, 'NOT_FOUND');
}

export async function submitFeedback(input: {
  conversationId: string;
  messageId: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  user?: AuthUser;
}) {
  await getConversation(input.conversationId, input.user);
  const row = await AiFeedback.create({
    userId: input.user?.id || null,
    conversationId: input.conversationId,
    messageId: input.messageId,
    rating: input.rating,
    comment: (input.comment || '').slice(0, 500)
  });
  return { id: String(row._id) };
}

export async function classifyUpload(filename: string, text: string) {
  const { classifyDocument } = await import('./document/classify.js');
  return classifyDocument(filename, text);
}
