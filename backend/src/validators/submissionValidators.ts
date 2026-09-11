import { z } from 'zod';
import { DATA_SUBMISSION_STATUSES } from '../models/DataSubmission.js';
import { ACADEMIC_YEAR_PATTERN } from '../config/academicYear.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');
const academicYear = z.string().trim().regex(ACADEMIC_YEAR_PATTERN, 'Academic year must look like 2025-26');

export const createSubmissionSchema = z
  .object({
    academicYear
  })
  .strict();

export const submitSubmissionSchema = z
  .object({
    declarationAccepted: z.literal(true)
  })
  .strict();

export const adminReviewSchema = z
  .object({
    action: z.enum(['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_CORRECTION']),
    reason: z.string().trim().max(2000).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.action === 'REJECT' || value.action === 'REQUEST_CORRECTION') && !value.reason) {
      ctx.addIssue({ code: 'custom', message: 'A reason is required.', path: ['reason'] });
    }
  });

export const premiumRuleUpsertSchema = z
  .object({
    academicYear,
    version: z.string().trim().min(1).max(40),
    ratePerStudent: z.number().min(0).max(1_000_000).nullable().optional(),
    minimumStudents: z.number().int().min(0).max(1_000_000).nullable().optional(),
    maximumStudents: z.number().int().min(0).max(1_000_000).nullable().optional(),
    currency: z.string().trim().max(8).optional(),
    active: z.boolean().optional(),
    officialVerified: z.boolean().optional()
  })
  .strict();

export const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  q: z.string().trim().max(120).optional(),
  academicYear: z.string().trim().max(16).optional(),
  status: z.enum(DATA_SUBMISSION_STATUSES).optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  district: z.string().trim().max(80).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z.enum(['submittedAt', 'createdAt', 'studentCount', 'submissionNumber', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

export const submissionStudentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  q: z.string().trim().max(120).optional(),
  validity: z.enum(['all', 'valid', 'invalid']).optional()
});

export const submissionPreviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  q: z.string().trim().max(120).optional(),
  validity: z.enum(['all', 'valid', 'invalid']).optional()
});

export const submissionExportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).optional(),
  academicYear: z.string().trim().max(16).optional(),
  status: z.enum(DATA_SUBMISSION_STATUSES).optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  q: z.string().trim().max(120).optional()
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type SubmitSubmissionInput = z.infer<typeof submitSubmissionSchema>;
export type AdminReviewInput = z.infer<typeof adminReviewSchema>;
export type PremiumRuleUpsertInput = z.infer<typeof premiumRuleUpsertSchema>;
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
export type SubmissionStudentQuery = z.infer<typeof submissionStudentQuerySchema>;
export type SubmissionPreviewQuery = z.infer<typeof submissionPreviewQuerySchema>;
