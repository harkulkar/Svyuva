export type AiLanguage = 'en' | 'hi' | 'mr';

export type SourceQuality = 'VERIFIED_FROM_KNOWLEDGE_BASE' | 'PARTIALLY_SUPPORTED' | 'NOT_VERIFIED' | 'FROM_AUTHORIZED_RECORDS';

export type AiCitation = {
  knowledgeDocumentId: string;
  title: string;
  page?: number | null;
  section?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  version?: string | null;
  href?: string | null;
};

export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AiCitation[];
  sourceQuality?: SourceQuality | '';
};

export type AiChatResponse = {
  conversationId: string;
  message: AiChatMessage;
  citations: AiCitation[];
  sourceQuality: SourceQuality;
  disclosure: string;
  language: AiLanguage;
  provider: string;
};

export type AiStatus = {
  available: boolean;
  provider: string;
  model: string;
  externalLlm: boolean;
};

export type KnowledgeListItem = {
  id: string;
  title: string;
  source: string;
  version: string;
  status: string;
  accessScope: string;
  ocrStatus: string;
  chunkingStatus: string;
  embeddingStatus: string;
  processingError: string;
  uploadedAt?: string;
  sourceUrl?: string;
};

export type AiAnalytics = {
  windowDays: number;
  queries: number;
  successfulResponses: number;
  failedResponses: number;
  documentProcessingCount: number;
  ocrProcessingCount: number;
  totalEvents: number;
  operations: Array<{ _id: string; count: number }>;
  questionCategories: Array<{ _id: string; count: number }>;
  feedback: { helpful: number; notHelpful: number };
  tokenUsage: number | null;
  estimatedCost: null;
  note: string;
};
