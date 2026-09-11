import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(backendDir, '..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(backendDir, '.env'), override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().optional(),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1).default('SVYSY'),
  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EXPIRES_IN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  ALLOW_ADMIN_SEED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  STORAGE_PROVIDER: z.string().default('s3'),
  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_REGION: z.string().optional().default('ap-south-1'),
  STORAGE_BUCKET: z.string().optional().default(''),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  MAX_EXCEL_FILE_SIZE_MB: z.coerce.number().positive().max(20).default(5),
  MAX_EXCEL_ROWS: z.coerce.number().int().positive().max(20000).default(2000),
  MAX_EXCEL_PARSE_MS: z.coerce.number().int().positive().max(180000).default(60000),
  MAX_EXPORT_ROWS: z.coerce.number().int().positive().max(50000).default(5000),
  LEGACY_DATABASE_URL: z.string().optional().default(''),
  LEGACY_API_URL: z.string().optional().default(''),
  LEGACY_API_TOKEN: z.string().optional().default(''),
  LEGACY_API_AUTHORIZED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  LEGACY_EXPORT_DIR: z.string().optional().default(''),
  LEGACY_SYSTEM_NAME: z.string().optional().default('svyuvasuraksha-legacy'),
  MONGODB_URI_MIGRATION_STAGING: z.string().optional().default(''),
  MONGODB_URI_PRODUCTION: z.string().optional().default(''),
  STORAGE_SOURCE: z.string().optional().default(''),
  STORAGE_DESTINATION: z.string().optional().default(''),
  DRY_RUN: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  MIGRATION_BATCH_SIZE: z.coerce.number().int().positive().max(5000).default(500),
  MIGRATION_SAMPLE_SIZE: z.coerce.number().int().positive().max(500).default(25),
  MIGRATION_ADMIN_EMAIL: z.preprocess((value) => (value === '' ? undefined : value), z.string().email().optional()),
  MIGRATION_ADMIN_PASSWORD: z.string().optional(),
  MIGRATION_ALLOW_APP_DB: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASSWORD: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default(''),
  APP_VERSION: z.string().optional(),
  MAINTENANCE_MODE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  MAINTENANCE_ALLOW_ADMIN: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  INACTIVE_ACCOUNT_DAYS: z.coerce.number().int().positive().max(3650).default(90),
  FEATURE_INSURANCE_HTTP: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  FEATURE_DOCUMENT_HTTP: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  FEATURE_PAYMENT_HTTP: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  FEATURE_REVIEW_HTTP: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  FEATURE_ECARD_HTTP: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  BACKUP_VERIFY_DIR: z.string().optional().default(''),
  SLOW_QUERY_MS: z.coerce.number().int().positive().max(60000).default(500),
  AI_PROVIDER: z.enum(['none', 'local', 'openai']).default('none'),
  AI_MODEL: z.string().optional().default(''),
  AI_API_KEY: z.string().optional().default(''),
  AI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().max(120).default(20),
  AI_MAX_DOCUMENT_SIZE_MB: z.coerce.number().positive().max(25).default(8),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(120000).default(20000),
  AI_MAX_PROMPT_CHARS: z.coerce.number().int().positive().max(100000).default(12000),
  AI_OCR_ENGINE: z.enum(['none', 'placeholder']).default('none'),
  EMAIL_PROVIDER: z.enum(['none', 'smtp']).default('none'),
  EMAIL_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  NOTIFICATION_POLL_SECONDS: z.coerce.number().int().positive().max(600).default(60),
  JOB_TICK_MS: z.coerce.number().int().positive().max(600000).default(60000),
  JOBS_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  REMINDER_PENDING_REGISTRATION_DAYS: z.coerce.number().int().positive().max(365).default(3),
  REMINDER_PENDING_DOCUMENT_DAYS: z.coerce.number().int().positive().max(365).default(7),
  REMINDER_PAYMENT_DAYS: z.coerce.number().int().positive().max(365).default(7),
  REMINDER_REVIEW_DAYS: z.coerce.number().int().positive().max(365).default(7),
  DASHBOARD_CACHE_SECONDS: z.coerce.number().int().min(0).max(600).default(30),
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

const raw = parsed.data;
const accessSecret = raw.JWT_ACCESS_SECRET || raw.JWT_SECRET;
const refreshSecret = raw.JWT_REFRESH_SECRET || raw.JWT_SECRET;
const frontendOrigin = raw.FRONTEND_URL || raw.FRONTEND_ORIGIN;
const smtpHost = raw.SMTP_HOST || raw.EMAIL_HOST || '';
const smtpUser = raw.SMTP_USER || raw.EMAIL_USER || '';
const smtpPass = raw.SMTP_PASS || raw.SMTP_PASSWORD || raw.EMAIL_PASSWORD || '';
const smtpFrom = raw.SMTP_FROM || raw.EMAIL_FROM || '';
const smtpPort = raw.SMTP_PORT ?? raw.EMAIL_PORT;

if (!accessSecret || accessSecret.length < 32) {
  throw new Error('Invalid environment configuration: JWT_ACCESS_SECRET (or JWT_SECRET) must be at least 32 characters');
}
if (!refreshSecret || refreshSecret.length < 32) {
  throw new Error('Invalid environment configuration: JWT_REFRESH_SECRET (or JWT_SECRET) must be at least 32 characters');
}

export const env = {
  ...raw,
  FRONTEND_ORIGIN: frontendOrigin,
  FRONTEND_URL: raw.FRONTEND_URL || frontendOrigin,
  CLIENT_URL: raw.CLIENT_URL || frontendOrigin,
  SMTP_HOST: smtpHost,
  SMTP_USER: smtpUser,
  SMTP_PASS: smtpPass,
  SMTP_FROM: smtpFrom,
  SMTP_PORT: smtpPort,
  JWT_ACCESS_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
  JWT_ACCESS_EXPIRES_IN: raw.JWT_ACCESS_EXPIRES_IN || raw.JWT_EXPIRES_IN || '15m',
  ALLOW_ADMIN_SEED: Boolean(raw.ALLOW_ADMIN_SEED),
  LEGACY_API_AUTHORIZED: Boolean(raw.LEGACY_API_AUTHORIZED),
  DRY_RUN: raw.DRY_RUN !== false,
  MIGRATION_ALLOW_APP_DB: Boolean(raw.MIGRATION_ALLOW_APP_DB),
  MAINTENANCE_MODE: Boolean(raw.MAINTENANCE_MODE),
  MAINTENANCE_ALLOW_ADMIN: Boolean(raw.MAINTENANCE_ALLOW_ADMIN),
  FEATURE_INSURANCE_HTTP: Boolean(raw.FEATURE_INSURANCE_HTTP),
  FEATURE_DOCUMENT_HTTP: Boolean(raw.FEATURE_DOCUMENT_HTTP),
  FEATURE_PAYMENT_HTTP: Boolean(raw.FEATURE_PAYMENT_HTTP),
  FEATURE_REVIEW_HTTP: Boolean(raw.FEATURE_REVIEW_HTTP),
  FEATURE_ECARD_HTTP: Boolean(raw.FEATURE_ECARD_HTTP),
  EMAIL_ENABLED: Boolean(raw.EMAIL_ENABLED),
  JOBS_ENABLED: raw.JOBS_ENABLED !== false && raw.NODE_ENV !== 'test'
};

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
