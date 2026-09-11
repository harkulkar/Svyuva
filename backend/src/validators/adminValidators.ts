import { z } from 'zod';
import { isStrongPassword } from '../utils/password.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const paginationQuery = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
};

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isStrongPassword(value.newPassword)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include uppercase, lowercase, and a number',
        path: ['newPassword']
      });
    }
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
    if (value.currentPassword === value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New password must be different from the current password',
        path: ['newPassword']
      });
    }
  });

export const adminProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^[6-9]\d{9}$/.test(value), 'Enter a valid 10-digit Indian mobile number')
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const updateUniversitySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    code: z.string().trim().max(40).optional(),
    shortName: z.string().trim().max(80).optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const statusToggleSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE'])
  })
  .strict();

export const adminUniversityQuerySchema = z.object({
  ...paginationQuery,
  q: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

export const adminUserQuerySchema = z.object({
  ...paginationQuery,
  q: z.string().trim().max(120).optional(),
  role: z.enum(['ADMIN', 'COLLEGE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional()
});

export const adminAuditQuerySchema = z.object({
  ...paginationQuery,
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(80).optional(),
  entityId: z.string().trim().max(80).optional(),
  userId: objectId.optional(),
  actor: z.string().trim().max(120).optional(),
  result: z.enum(['success', 'failure', 'info']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const adminSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least two characters').max(120)
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED']).optional(),
  universityId: objectId.optional(),
  instituteId: objectId.optional(),
  district: z.string().trim().max(80).optional(),
  academicYear: z.string().trim().max(16).optional(),
  course: z.string().trim().max(120).optional()
});

export const adminStudentStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE'])
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminProfileUpdate = z.infer<typeof adminProfileUpdateSchema>;
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;
export type AdminUniversityQuery = z.infer<typeof adminUniversityQuerySchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
