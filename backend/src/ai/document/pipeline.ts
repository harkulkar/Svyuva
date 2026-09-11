import { KnowledgeChunk } from '../../models/KnowledgeChunk.js';
import { KnowledgeDocument } from '../../models/KnowledgeDocument.js';
import { writeAudit } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';
import { classifyDocument } from './classify.js';
import { extractDocumentText } from './extract.js';
import { readKnowledgeFile } from './storage.js';
import { chunkText } from '../rag/chunk.js';
import { embedText } from '../rag/embed.js';
import { recordAiUsage } from '../usage.js';

export async function processKnowledgeDocument(id: string): Promise<void> {
  const started = Date.now();
  const doc = await KnowledgeDocument.findById(id);
  if (!doc || !doc.fileReference) {
    throw new Error('Knowledge document not found');
  }
  doc.status = 'PROCESSING';
  await doc.save();
  try {
    const buffer = await readKnowledgeFile(doc.fileReference);
    const extracted = await extractDocumentText(buffer, doc.originalFilename || 'file', doc.mimeType || '');
    const classification = classifyDocument(doc.originalFilename || '', extracted.text);
    const chunks = chunkText(extracted.text);
    await KnowledgeChunk.deleteMany({ knowledgeDocumentId: doc._id });
    if (chunks.length) {
      await KnowledgeChunk.insertMany(
        chunks.map((chunk) => ({
          knowledgeDocumentId: doc._id,
          title: doc.title,
          page: chunk.page,
          section: chunk.section,
          source: doc.source,
          sourceUrl: doc.sourceUrl,
          version: doc.version,
          accessScope: doc.accessScope,
          instituteId: doc.instituteId,
          text: chunk.text,
          embedding: embedText(`${doc.title}\n${chunk.section}\n${chunk.text}`)
        }))
      );
    }
    doc.ocrStatus = extracted.ocrStatus;
    doc.ocrConfidence = extracted.ocrConfidence;
    doc.extractedTextPreview = extracted.text.slice(0, 1500);
    doc.chunkingStatus = chunks.length ? 'COMPLETE' : 'EMPTY';
    doc.embeddingStatus = chunks.length ? 'COMPLETE' : 'EMPTY';
    doc.processingError = '';
    doc.metadata = { ...(doc.metadata as object), suggestedCategory: classification.category, classificationMethod: classification.method };
    if (extracted.ocrStatus === 'OCR_REVIEW_REQUIRED' && !extracted.text) {
      doc.status = 'REVIEW_REQUIRED';
    } else if (chunks.length === 0) {
      doc.status = 'FAILED';
      doc.processingError = 'No extractable text';
    } else {
      doc.status = 'ACTIVE';
    }
    await doc.save();
    await writeAudit({
      action: 'AI_DOCUMENT_PROCESSED',
      entity: 'KnowledgeDocument',
      entityId: String(doc._id),
      metadata: { status: doc.status, chunks: chunks.length, ocrStatus: extracted.ocrStatus }
    });
    await recordAiUsage({
      operation: 'AI_DOCUMENT_PROCESSED',
      success: true,
      latencyMs: Date.now() - started,
      category: classification.category
    });
    if (extracted.ocrStatus === 'OCR_REVIEW_REQUIRED' || extracted.ocrStatus === 'COMPLETED') {
      await recordAiUsage({
        operation: 'AI_OCR',
        success: true,
        latencyMs: Date.now() - started,
        category: extracted.ocrStatus
      });
    }
  } catch (error) {
    doc.status = 'FAILED';
    doc.processingError = error instanceof Error ? error.message : 'Processing failed';
    await doc.save();
    logger.error('knowledge_process_failed', { message: doc.processingError });
    await recordAiUsage({ operation: 'AI_DOCUMENT_PROCESSED', success: false, latencyMs: Date.now() - started });
  }
}
