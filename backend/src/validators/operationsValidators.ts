import { z } from 'zod';
import { paginationQuery } from './adminValidators.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const adminSupportQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least two characters').max(120)
});

export const loginActivityQuerySchema = z.object({
  ...paginationQuery,
  result: z.enum(['success', 'failure']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const inactiveAccountsQuerySchema = z.object({
  inactiveDays: z.coerce.number().int().positive().max(3650).optional()
});

export const dataCorrectionSchema = z
  .object({
    entity: z.enum(['Student', 'Institute', 'User']),
    entityId: objectId,
    field: z.string().trim().min(1).max(80),
    value: z.string().trim().max(500),
    reason: z.string().trim().min(8, 'Enter a reason of at least 8 characters').max(500)
  })
  .strict();

export type DataCorrectionInput = z.infer<typeof dataCorrectionSchema>;
export type LoginActivityQuery = z.infer<typeof loginActivityQuerySchema>;
