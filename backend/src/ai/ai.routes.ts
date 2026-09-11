import { Router } from 'express';
import multer from 'multer';
import { optionalAuthenticate, authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { env } from '../config/env.js';
import {
  aiAnalytics,
  aiChat,
  aiClassify,
  aiExtract,
  aiConversation,
  aiFeedback,
  aiKnowledgeDetail,
  aiKnowledgeList,
  aiKnowledgeReprocess,
  aiKnowledgeSource,
  aiKnowledgeStatus,
  aiKnowledgeUpload,
  aiStatus
} from './ai.controller.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: () => env.AI_MAX_REQUESTS_PER_MINUTE,
  skip: () => Boolean(process.env.NODE_TEST_CONTEXT),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(fail('Too many AI requests. Please try again later.', 'RATE_LIMITED'));
  }
});

const knowledgeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.AI_MAX_DOCUMENT_SIZE_MB * 1024 * 1024, files: 1 }
});

const chatSchema = z
  .object({
    question: z.string().trim().min(2).max(4000),
    conversationId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
    language: z.enum(['en', 'hi', 'mr']).optional()
  })
  .strict();

const feedbackSchema = z
  .object({
    conversationId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    messageId: z.string().min(8).max(80),
    rating: z.enum(['helpful', 'not_helpful']),
    comment: z.string().trim().max(500).optional()
  })
  .strict();

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']) }).strict();

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional()
});

export const aiRouter = Router();
aiRouter.use(aiLimiter);
aiRouter.get('/status', aiStatus);
aiRouter.post('/chat', optionalAuthenticate, validateBody(chatSchema), aiChat);
aiRouter.get('/conversations/:id', optionalAuthenticate, aiConversation);
aiRouter.post('/feedback', optionalAuthenticate, validateBody(feedbackSchema), aiFeedback);
aiRouter.post('/classify', authenticate, knowledgeUpload.single('file'), aiClassify);
aiRouter.post('/extract', authenticate, knowledgeUpload.single('file'), aiExtract);
aiRouter.get('/knowledge/:id/source', optionalAuthenticate, aiKnowledgeSource);
aiRouter.get('/knowledge/:id', authenticate, requireRole('ADMIN'), aiKnowledgeDetail);
aiRouter.get('/knowledge', authenticate, requireRole('ADMIN'), validateQuery(listQuery), aiKnowledgeList);
aiRouter.post('/knowledge', authenticate, requireRole('ADMIN'), knowledgeUpload.single('file'), aiKnowledgeUpload);
aiRouter.patch('/knowledge/:id/status', authenticate, requireRole('ADMIN'), validateBody(statusSchema), aiKnowledgeStatus);
aiRouter.post('/knowledge/:id/reprocess', authenticate, requireRole('ADMIN'), aiKnowledgeReprocess);
aiRouter.get('/analytics', authenticate, requireRole('ADMIN'), aiAnalytics);
