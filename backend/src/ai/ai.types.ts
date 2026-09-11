export type AiLanguage = 'en' | 'hi' | 'mr';

export type AccessScope = 'GLOBAL_OFFICIAL_KNOWLEDGE' | 'ADMIN_ONLY' | 'INSTITUTE_SPECIFIC';

export type SourceQuality = 'VERIFIED_FROM_KNOWLEDGE_BASE' | 'PARTIALLY_SUPPORTED' | 'NOT_VERIFIED' | 'FROM_AUTHORIZED_RECORDS';

export type KnowledgeStatus = 'DRAFT' | 'PROCESSING' | 'ACTIVE' | 'ARCHIVED' | 'FAILED' | 'REVIEW_REQUIRED';

export type OcrStatus = 'NOT_REQUIRED' | 'COMPLETED' | 'OCR_REVIEW_REQUIRED' | 'FAILED';

export type DocumentCategory =
  | 'scheme_faq'
  | 'scheme_information'
  | 'portal_manual'
  | 'student_document'
  | 'insurance_document'
  | 'payment_document'
  | 'ecard'
  | 'institute_document'
  | 'unknown';

export type AiCitation = {
  knowledgeDocumentId: string;
  title: string;
  page?: number | null;
  section?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  version?: string | null;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AiCitation[];
  sourceQuality?: SourceQuality;
  createdAt: string;
};

export type ToolName =
  | 'getDashboardStatistics'
  | 'getMyInstituteSummary'
  | 'searchMyStudents'
  | 'countInsuranceRecords'
  | 'countDocumentMetadata'
  | 'countPaymentRecords'
  | 'getAnalyticsAttention'
  | 'getWorkflowQueueSummary'
  | 'getMyActionCenter';

export type ToolCallResult = {
  name: ToolName;
  ok: boolean;
  data?: unknown;
  error?: string;
};
