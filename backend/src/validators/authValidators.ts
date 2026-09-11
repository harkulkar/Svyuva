import { z } from 'zod';
import { isStrongPassword } from '../utils/password.js';
import {
  COLLEGE_TYPES,
  DISTRICTS,
  EXCLUSIVE_TYPES,
  JD_REGIONS,
  LINGUISTIC_TYPES,
  LOCATION_TYPES,
  MINORITY_TYPES
} from '../data/masterData.js';

const indianMobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

function enumField<T extends string>(values: readonly T[], message: string) {
  return z.string().trim().refine((value): value is T => (values as readonly string[]).includes(value), {
    message
  });
}

export const loginSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false)
  })
  .strict();

export const signupSchema = z
  .object({
    universityId: objectId,
    instituteName: z.string().trim().min(2, 'Institute name is required').max(200),
    exclusiveType: enumField(EXCLUSIVE_TYPES, 'Select a valid exclusive type'),
    locationType: enumField(LOCATION_TYPES, 'Select a valid location type'),
    minorityType: enumField(MINORITY_TYPES, 'Select a valid minority type'),
    linguisticType: enumField(LINGUISTIC_TYPES, 'Select a valid linguistic type'),
    address: z.string().trim().min(5, 'Address is required').max(500),
    district: enumField(DISTRICTS, 'Select a valid district'),
    taluka: z.string().trim().min(2, 'Taluka is required').max(100),
    jdRegion: enumField(JD_REGIONS, 'Select a valid JD Region'),
    email: z.string().trim().email('Enter a valid email address'),
    mobile: indianMobile,
    contactNumber1: z.string().trim().max(20).optional().default(''),
    contactNumber2: z.string().trim().max(20).optional().default(''),
    principalName: z.string().trim().min(2, 'Principal name is required').max(120),
    collegeType: enumField(COLLEGE_TYPES, 'Select a valid college type'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    role: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.role && value.role.toUpperCase() === 'ADMIN') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid request', path: ['role'] });
    }
    if (!isStrongPassword(value.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include uppercase, lowercase, and a number',
        path: ['password']
      });
    }
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  });

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address')
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16, 'Reset token is invalid'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isStrongPassword(value.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password must include uppercase, lowercase, and a number',
        path: ['password']
      });
    }
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
    }
  });

export const collegeProfileUpdateSchema = z
  .object({
    address: z.string().trim().min(5).max(500).optional(),
    mobile: indianMobile.optional(),
    contactNumber1: z.string().trim().max(20).optional(),
    contactNumber2: z.string().trim().max(20).optional(),
    principalName: z.string().trim().min(2).max(120).optional()
  })
  .strict();

export const rejectInstituteSchema = z
  .object({
    reason: z.string().trim().min(8, 'Provide a rejection reason').max(500)
  })
  .strict();

export const createUniversitySchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    code: z.string().trim().max(40).optional(),
    shortName: z.string().trim().max(80).optional()
  })
  .strict();

export const adminInstituteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  universityId: objectId.optional(),
  district: z.string().trim().optional(),
  q: z.string().trim().max(120).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CollegeProfileUpdate = z.infer<typeof collegeProfileUpdateSchema>;
export type RejectInstituteInput = z.infer<typeof rejectInstituteSchema>;
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type AdminInstituteQuery = z.infer<typeof adminInstituteQuerySchema>;
