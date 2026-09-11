import type { MigrationClassification } from '../models/legacyProvenance.js';
import type { MigrationEntity } from '../models/MigrationIdMap.js';

export type LegacyRecord = Record<string, unknown>;

export type EntityCounts = {
  legacy: number;
  valid: number;
  warning: number;
  review: number;
  skipped: number;
  failed: number;
  migrated: number;
  existing: number;
};

export type IssueRow = {
  entity: MigrationEntity | string;
  legacyId: string | null;
  classification: MigrationClassification;
  code: string;
  message: string;
};

export type TransformResult<T extends object = Record<string, unknown>> = {
  classification: MigrationClassification;
  document: T | null;
  legacyId: string | null;
  issues: IssueRow[];
  usedKeys: string[];
};

export type LegacySource = {
  kind: 'export-dir' | 'fixture' | 'none' | 'api-refused' | 'sql-unconfigured';
  note: string;
  universities: LegacyRecord[];
  institutes: LegacyRecord[];
  users: LegacyRecord[];
  students: LegacyRecord[];
  enrollments: LegacyRecord[];
  insurance: LegacyRecord[];
  documents: LegacyRecord[];
  payments: LegacyRecord[];
  reviews: LegacyRecord[];
  ecards: LegacyRecord[];
  notifications: LegacyRecord[];
  auditLogs: LegacyRecord[];
  files: LegacyRecord[];
};

export type DuplicateHit = {
  entity: string;
  key: string;
  legacyIds: string[];
};

export type OrphanHit = {
  entity: string;
  legacyId: string;
  missing: string;
  parentLegacyId: string;
};

export type MigrationMode = 'dry-run' | 'staging' | 'verify' | 'inventory' | 'reconcile' | 'storage';
