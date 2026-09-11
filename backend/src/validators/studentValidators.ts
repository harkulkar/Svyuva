import { z } from 'zod';
import {
  PARENT_RELATIONS,
  STUDENT_CATEGORIES,
  STUDENT_GENDERS,
  STUDENT_SEMESTERS,
  STUDENT_STATUSES,
  STUDENT_YEARS
} from '../data/studentMaster.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

const indianMobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const optionalMobile = z
  .string()
  .trim()
  .optional()
  .transform((value) => value ?? '')
  .refine((value) => value === '' || /^[6-9]\d{9}$/.test(value), 'Enter a valid 10-digit Indian mobile number');

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ?? '').toLowerCase())
  .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address');

const identifier = z.string().trim().min(1, 'This field is required').max(64);
const personName = z.string().trim().min(1, 'This field is required').max(80);
const optionalName = z.string().trim().max(80).optional().transform((value) => value ?? '');
const academicYear = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Academic year must look like 2025-26');

function enumField<T extends string>(values: readonly T[], message: string) {
  return z.string().trim().refine((value): value is T => (values as readonly string[]).includes(value), {
    message
  });
}

function optionalEnum<T extends string>(values: readonly T[], message: string) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine((value) => value === '' || (values as readonly string[]).includes(value), { message });
}

const dateOfBirth = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value : new Date(value)))
  .refine((value) => !Number.isNaN(value.getTime()), 'Enter a valid date of birth')
  .refine((value) => value.getTime() < Date.now(), 'Date of birth cannot be in the future')
  .refine((value) => value.getUTCFullYear() >= 1940 && value.getUTCFullYear() <= new Date().getFullYear() - 10, 'Enter a valid date of birth');

const optionalText = z.string().trim().max(500).optional().transform((value) => value ?? '');

export const studentWriteSchema = z
  .object({
    studentId: identifier,
    enrollmentNumber: identifier,
    rollNumber: identifier,
    firstName: personName,
    middleName: optionalName,
    lastName: personName,
    gender: enumField(STUDENT_GENDERS, 'Select a valid gender'),
    dateOfBirth,
    mobile: indianMobile,
    email: optionalEmail,
    course: z.string().trim().min(1, 'Course is required').max(120),
    stream: optionalText,
    year: enumField(STUDENT_YEARS, 'Select a valid year'),
    semester: optionalEnum(STUDENT_SEMESTERS, 'Select a valid semester'),
    academicYear,
    address: optionalText,
    parentName: optionalName,
    parentMobile: optionalMobile,
    parentRelation: optionalEnum(PARENT_RELATIONS, 'Select Father or Mother'),
    parentDateOfBirth: z
      .union([z.string(), z.date(), z.literal('')])
      .optional()
      .transform((value) => {
        if (value == null || value === '') return undefined;
        return value instanceof Date ? value : new Date(value);
      })
      .refine((value) => value == null || !Number.isNaN(value.getTime()), 'Enter a valid parent date of birth')
      .refine((value) => value == null || value.getTime() < Date.now(), 'Parent date of birth cannot be in the future')
      .refine(
        (value) => value == null || value.getUTCFullYear() >= 1930,
        'Enter a valid parent date of birth'
      ),
    serialNumber: optionalText,
    age: z.number().int().min(0).max(120).optional().nullable(),
    parentAge: z.number().int().min(0).max(120).optional().nullable(),
    category: optionalEnum(STUDENT_CATEGORIES, 'Select a valid category'),
    status: enumField(STUDENT_STATUSES, 'Select a valid status').optional()
  })
  .strict();

export const studentCreateSchema = studentWriteSchema
  .extend({
    status: enumField(STUDENT_STATUSES, 'Select a valid status').optional().default('ACTIVE')
  })
  .strict();

export const studentUpdateSchema = studentWriteSchema
  .partial()
  .omit({ status: true })
  .extend({
    status: enumField(STUDENT_STATUSES, 'Select a valid status').optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'No fields to update');

export const studentStatusSchema = z
  .object({
    status: enumField(STUDENT_STATUSES, 'Select a valid status')
  })
  .strict();

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  q: z.string().trim().max(120).optional(),
  academicYear: z.string().trim().max(16).optional(),
  course: z.string().trim().max(120).optional(),
  stream: z.string().trim().max(120).optional(),
  year: enumField(STUDENT_YEARS, 'Select a valid year').optional(),
  semester: enumField(STUDENT_SEMESTERS, 'Select a valid semester').optional(),
  gender: enumField(STUDENT_GENDERS, 'Select a valid gender').optional(),
  status: enumField(STUDENT_STATUSES, 'Select a valid status').optional(),
  submissionId: objectId.optional()
});

export const adminStudentListQuerySchema = studentListQuerySchema.extend({
  instituteId: objectId.optional(),
  universityId: objectId.optional(),
  submissionId: objectId.optional()
});

export const importJobSchema = z
  .object({
    jobId: objectId
  })
  .strict();

export type StudentWriteInput = z.infer<typeof studentWriteSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type AdminStudentListQuery = z.infer<typeof adminStudentListQuerySchema>;
