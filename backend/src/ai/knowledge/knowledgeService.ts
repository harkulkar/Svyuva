import crypto from 'node:crypto';
import { KnowledgeChunk } from '../../models/KnowledgeChunk.js';
import { KnowledgeDocument } from '../../models/KnowledgeDocument.js';
import { AppError } from '../../middleware/errorHandler.js';
import { checksumBuffer, saveKnowledgeFile } from '../document/storage.js';
import { processKnowledgeDocument } from '../document/pipeline.js';
import { SEED_KNOWLEDGE } from './seedCorpus.js';
import type { AuthUser } from '../../types/auth.js';
import type { AccessScope } from '../ai.types.js';

export async function ensureSeedKnowledge(): Promise<void> {
  for (const item of SEED_KNOWLEDGE) {
    const existing = await KnowledgeDocument.findOne({ seedKey: item.seedKey });
    const buffer = Buffer.from(item.text, 'utf8');
    const checksum = checksumBuffer(buffer);
    if (existing?.status === 'ACTIVE' && existing.embeddingStatus === 'COMPLETE' && existing.checksum === checksum) {
      continue;
    }
    let doc = existing;
    if (!doc) {
      doc = await KnowledgeDocument.create({
        title: item.title,
        description: 'Seeded from published portal content for RAG. Not a new Government Resolution.',
        documentType: 'txt',
        source: item.source,
        sourceUrl: item.sourceUrl,
        version: '1',
        status: 'PROCESSING',
        accessScope: item.accessScope,
        seedKey: item.seedKey,
        originalFilename: `${item.seedKey}.txt`,
        mimeType: 'text/plain',
        sizeBytes: buffer.length,
        checksum
      });
    }
    const fileReference = await saveKnowledgeFile(String(doc._id), `${item.seedKey}.txt`, buffer);
    doc.fileReference = fileReference;
    doc.checksum = checksum;
    doc.sizeBytes = buffer.length;
    doc.title = item.title;
    doc.source = item.source;
    doc.sourceUrl = item.sourceUrl;
    doc.status = 'PROCESSING';
    await doc.save();
    await processKnowledgeDocument(String(doc._id));
  }
}

export async function createKnowledgeUpload(input: {
  title: string;
  description?: string;
  source?: string;
  sourceUrl?: string;
  version?: string;
  accessScope: AccessScope;
  instituteId?: string;
  file: Express.Multer.File;
  admin: AuthUser;
}): Promise<{ id: string; status: string }> {
  const id = crypto.randomBytes(12).toString('hex');
  const fileReference = await saveKnowledgeFile(id, input.file.originalname, input.file.buffer);
  const doc = await KnowledgeDocument.create({
    title: input.title.trim(),
    description: input.description || '',
    documentType: input.file.originalname.split('.').pop() || 'bin',
    source: input.source || '',
    sourceUrl: input.sourceUrl || '',
    version: input.version || '1',
    uploadedBy: input.admin.id,
    status: 'PROCESSING',
    accessScope: input.accessScope,
    instituteId: input.instituteId || null,
    fileReference,
    originalFilename: input.file.originalname,
    mimeType: input.file.mimetype,
    sizeBytes: input.file.size,
    checksum: checksumBuffer(input.file.buffer)
  });
  void processKnowledgeDocument(String(doc._id));
  return { id: String(doc._id), status: doc.status };
}

export async function listKnowledgeDocuments(query: { page: number; limit: number; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [total, rows] = await Promise.all([
    KnowledgeDocument.countDocuments(filter),
    KnowledgeDocument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit)
  ]);
  return {
    items: rows.map((row) => ({
      id: String(row._id),
      title: row.title,
      source: row.source,
      version: row.version,
      status: row.status,
      accessScope: row.accessScope,
      ocrStatus: row.ocrStatus,
      chunkingStatus: row.chunkingStatus,
      embeddingStatus: row.embeddingStatus,
      processingError: row.processingError,
      uploadedAt: row.uploadedAt,
      sourceUrl: row.sourceUrl
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit) || 1)
    }
  };
}

export async function setKnowledgeStatus(id: string, status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT') {
  const doc = await KnowledgeDocument.findById(id);
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
  if (status === 'ARCHIVED') {
    doc.status = 'ARCHIVED';
  } else if (status === 'ACTIVE') {
    if (doc.embeddingStatus !== 'COMPLETE') {
      throw new AppError('Document is not processed yet.', 409, 'NOT_READY');
    }
    doc.status = 'ACTIVE';
  } else {
    doc.status = 'DRAFT';
  }
  await doc.save();
  return { id: String(doc._id), status: doc.status };
}

export async function reprocessKnowledge(id: string) {
  const doc = await KnowledgeDocument.findById(id);
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
  await processKnowledgeDocument(id);
  const fresh = await KnowledgeDocument.findById(id);
  return { id, status: fresh?.status };
}

export async function getKnowledgeDocument(id: string) {
  const doc = await KnowledgeDocument.findById(id);
  if (!doc) throw new AppError('Document not found', 404, 'NOT_FOUND');
  const chunks = await KnowledgeChunk.countDocuments({ knowledgeDocumentId: doc._id });
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    source: doc.source,
    sourceUrl: doc.sourceUrl,
    version: doc.version,
    status: doc.status,
    accessScope: doc.accessScope,
    ocrStatus: doc.ocrStatus,
    processingError: doc.processingError,
    chunkCount: chunks,
    extractedTextPreview: doc.extractedTextPreview,
    metadata: doc.metadata
  };
}
