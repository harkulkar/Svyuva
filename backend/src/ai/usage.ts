import { AiFeedback } from '../models/AiFeedback.js';
import { AiUsage } from '../models/AiUsage.js';

export async function recordAiUsage(input: {
  userId?: string | null;
  role?: string;
  operation: string;
  success: boolean;
  provider?: string;
  latencyMs?: number;
  category?: string;
  tokenUsage?: number | null;
  requestId?: string;
}): Promise<void> {
  await AiUsage.create({
    userId: input.userId || null,
    role: input.role || 'GUEST',
    operation: input.operation,
    success: input.success,
    provider: input.provider || 'none',
    latencyMs: input.latencyMs || 0,
    category: input.category || '',
    tokenUsage: input.tokenUsage ?? null,
    requestId: input.requestId || ''
  });
}

export async function getAiAnalytics() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, success, failed, ops, feedback, tokens] = await Promise.all([
    AiUsage.countDocuments({ createdAt: { $gte: since } }),
    AiUsage.countDocuments({ createdAt: { $gte: since }, success: true }),
    AiUsage.countDocuments({ createdAt: { $gte: since }, success: false }),
    AiUsage.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$operation', count: { $sum: 1 } } }
    ]),
    AiFeedback.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]),
    AiUsage.aggregate<{ _id: null; total: number }>([
      { $match: { createdAt: { $gte: since }, tokenUsage: { $ne: null } } },
      { $group: { _id: null, total: { $sum: '$tokenUsage' } } }
    ])
  ]);
  const processed = ops.find((row: { _id: string; count: number }) => row._id === 'AI_DOCUMENT_PROCESSED')?.count ?? 0;
  const ocr = ops.find((row: { _id: string; count: number }) => row._id === 'AI_OCR')?.count ?? 0;
  const queries = ops.find((row: { _id: string; count: number }) => row._id === 'AI_QUERY')?.count ?? 0;
  const categories = await AiUsage.aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: since }, category: { $nin: [null, ''] } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  const recordedTokens = tokens[0]?.total ?? null;
  return {
    windowDays: 30,
    queries,
    successfulResponses: success,
    failedResponses: failed,
    documentProcessingCount: processed,
    ocrProcessingCount: ocr,
    totalEvents: total,
    operations: ops,
    questionCategories: categories,
    feedback: {
      helpful: feedback.find((row: { _id: string; count: number }) => row._id === 'helpful')?.count ?? 0,
      notHelpful: feedback.find((row: { _id: string; count: number }) => row._id === 'not_helpful')?.count ?? 0
    },
    tokenUsage: recordedTokens,
    estimatedCost: null,
    note: 'Usage counts only. Provider pricing is not configured, so cost is not calculated.'
  };
}
