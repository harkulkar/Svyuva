import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { ok } from '../utils/apiResponse.js';
import { chatWithAssistant, getConversation, submitFeedback } from './ai.service.js';
import { getAiAnalytics } from './usage.js';
import {
  createKnowledgeUpload,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  reprocessKnowledge,
  setKnowledgeStatus
} from './knowledge/knowledgeService.js';
import { classifyDocument } from './document/classify.js';
import { extractDocumentText, extractVisibleFields } from './document/extract.js';
import { writeAudit } from '../services/auditService.js';
import { readKnowledgeFile } from './document/storage.js';
import { KnowledgeDocument } from '../models/KnowledgeDocument.js';
import type { AccessScope, AiLanguage } from './ai.types.js';

export async function aiChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await chatWithAssistant({
      question: String(req.body.question || ''),
      conversationId: req.body.conversationId,
      language: req.body.language as AiLanguage | undefined,
      user: req.authUser,
      req
    });
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function aiConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await getConversation(String(req.params.id), req.authUser);
    res.json(
      ok(
        {
          id: String(row._id),
          messages: row.messages,
          language: row.language
        },
        'OK'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function aiFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await submitFeedback({
      conversationId: String(req.body.conversationId),
      messageId: String(req.body.messageId),
      rating: req.body.rating,
      comment: req.body.comment,
      user: req.authUser
    });
    res.json(ok(result, 'Feedback saved'));
  } catch (error) {
    next(error);
  }
}

export async function aiClassify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filename = String(req.body.filename || req.file?.originalname || '');
    const text = req.file ? (await extractDocumentText(req.file.buffer, filename, req.file.mimetype)).text : String(req.body.text || '');
    const result = classifyDocument(filename, text);
    await writeAudit({
      userId: req.authUser?.id,
      action: 'AI_DOCUMENT_CLASSIFIED',
      entity: 'AiDocument',
      entityId: filename.slice(0, 80) || 'inline',
      req,
      metadata: { category: result.category, method: result.method }
    });
    res.json(ok({ ...result, numericConfidence: null, note: 'Rule-based suggestion. Confirm in the portal; this is not an official classification.' }, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function aiExtract(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filename = String(req.body.filename || req.file?.originalname || 'document');
    const extracted = req.file
      ? await extractDocumentText(req.file.buffer, filename, req.file.mimetype)
      : { text: String(req.body.text || ''), ocrStatus: 'NOT_REQUIRED' as const, ocrConfidence: null };
    const classification = classifyDocument(filename, extracted.text);
    const fields = extractVisibleFields(extracted.text);
    await writeAudit({
      userId: req.authUser?.id,
      action: 'AI_EXTRACTION_COMPLETED',
      entity: 'AiDocument',
      entityId: filename.slice(0, 80),
      req,
      metadata: { category: classification.category, ocrStatus: extracted.ocrStatus }
    });
    res.json(
      ok(
        {
          classification: { ...classification, numericConfidence: null },
          ocrStatus: extracted.ocrStatus,
          ocrConfidence: extracted.ocrConfidence,
          fields,
          preview: extracted.text.slice(0, 1500),
          note: 'Human review is required. Extracted values are not official until confirmed.'
        },
        'OK'
      )
    );
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listKnowledgeDocuments({
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      status: req.query.status ? String(req.query.status) : undefined
    });
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.authUser) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    if (!req.file) throw new AppError('Upload a document.', 400, 'NO_FILE');
    const maxBytes = env.AI_MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
    if (req.file.size > maxBytes) throw new AppError('The file is too large.', 400, 'FILE_TOO_LARGE');
    const result = await createKnowledgeUpload({
      title: String(req.body.title || req.file.originalname),
      description: req.body.description,
      source: req.body.source,
      sourceUrl: req.body.sourceUrl,
      version: req.body.version,
      accessScope: (req.body.accessScope || 'GLOBAL_OFFICIAL_KNOWLEDGE') as AccessScope,
      instituteId: req.body.instituteId,
      file: req.file,
      admin: req.authUser
    });
    res.status(202).json(ok(result, 'Processing started'));
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getKnowledgeDocument(String(req.params.id));
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await setKnowledgeStatus(String(req.params.id), req.body.status);
    res.json(ok(result, 'Updated'));
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeReprocess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await reprocessKnowledge(String(req.params.id));
    res.json(ok(result, 'Reprocess started'));
  } catch (error) {
    next(error);
  }
}

export async function aiKnowledgeSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const doc = await KnowledgeDocument.findById(req.params.id);
    if (!doc || doc.status === 'ARCHIVED') throw new AppError('Document not found', 404, 'NOT_FOUND');
    const role = req.authUser?.role;
    if (doc.accessScope === 'ADMIN_ONLY' && role !== 'ADMIN') {
      throw new AppError('You are not allowed to access this document.', 403, 'FORBIDDEN');
    }
    if (doc.accessScope === 'INSTITUTE_SPECIFIC') {
      if (role === 'COLLEGE' && String(doc.instituteId) !== req.authUser?.instituteId) {
        throw new AppError('You are not allowed to access this document.', 403, 'FORBIDDEN');
      }
      if (!role) throw new AppError('You are not allowed to access this document.', 403, 'FORBIDDEN');
    }
    if (doc.sourceUrl && doc.sourceUrl.startsWith('/')) {
      res.json(ok({ title: doc.title, sourceUrl: doc.sourceUrl, file: false }, 'OK'));
      return;
    }
    if (!doc.fileReference) throw new AppError('File not available', 404, 'NOT_FOUND');
    const buffer = await readKnowledgeFile(doc.fileReference);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalFilename || 'document'}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function aiAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    void req;
    const result = await getAiAnalytics();
    res.json(ok(result, 'OK'));
  } catch (error) {
    next(error);
  }
}

export async function aiStatus(_req: Request, res: Response): Promise<void> {
  res.json(
    ok(
      {
        available: true,
        provider: env.AI_PROVIDER,
        model: env.AI_PROVIDER === 'openai' && env.AI_MODEL ? 'configured' : env.AI_PROVIDER,
        externalLlm: Boolean(env.AI_PROVIDER === 'openai' && env.AI_API_KEY)
      },
      'OK'
    )
  );
}
