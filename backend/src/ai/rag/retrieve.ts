import { KnowledgeChunk } from '../../models/KnowledgeChunk.js';
import { KnowledgeDocument } from '../../models/KnowledgeDocument.js';
import type { AccessScope, AiCitation } from '../ai.types.js';
import { cosineSimilarity, distinctiveTokens, embedText, tokenize } from './embed.js';

export type RetrievalHit = {
  text: string;
  score: number;
  citation: AiCitation;
  accessScope: AccessScope;
};

export type RetrievalScope = {
  role: 'GUEST' | 'ADMIN' | 'COLLEGE';
  instituteId?: string | null;
};

export function allowedScopes(scope: RetrievalScope): AccessScope[] {
  if (scope.role === 'ADMIN') return ['GLOBAL_OFFICIAL_KNOWLEDGE', 'ADMIN_ONLY', 'INSTITUTE_SPECIFIC'];
  if (scope.role === 'COLLEGE') return ['GLOBAL_OFFICIAL_KNOWLEDGE', 'INSTITUTE_SPECIFIC'];
  return ['GLOBAL_OFFICIAL_KNOWLEDGE'];
}

export async function retrieveChunks(question: string, scope: RetrievalScope, limit = 5): Promise<RetrievalHit[]> {
  const scopes = allowedScopes(scope);
  const filter: Record<string, unknown> = {
    accessScope: { $in: scopes }
  };
  if (scope.role === 'COLLEGE') {
    filter.$or = [
      { accessScope: 'GLOBAL_OFFICIAL_KNOWLEDGE' },
      { accessScope: 'INSTITUTE_SPECIFIC', instituteId: scope.instituteId || null }
    ];
    delete filter.accessScope;
  }
  const rows = await KnowledgeChunk.find(filter).limit(400).lean();
  const query = embedText(question);
  const needed = distinctiveTokens(question);
  const scored = rows
    .map((row) => ({
      text: row.text,
      score: cosineSimilarity(query, row.embedding || []),
      accessScope: row.accessScope as AccessScope,
      lexical: needed.length
        ? needed.filter((token) => tokenize(`${row.title}\n${row.text}`).includes(token)).length
        : 1,
      citation: {
        knowledgeDocumentId: String(row.knowledgeDocumentId),
        title: row.title,
        page: row.page ?? null,
        section: row.section || null,
        source: row.source || null,
        sourceUrl: row.sourceUrl || null,
        version: row.version || null
      }
    }))
    .filter((row) => {
      if (row.score <= 0.12) return false;
      if (!needed.length) return false;
      return row.lexical >= 1 && row.lexical / needed.length >= 0.45;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const activeIds = new Set(
    (
      await KnowledgeDocument.find({
        _id: { $in: scored.map((item) => item.citation.knowledgeDocumentId) },
        status: 'ACTIVE'
      }).select('_id')
    ).map((doc) => String(doc._id))
  );
  return scored.filter((item) => activeIds.has(item.citation.knowledgeDocumentId));
}
