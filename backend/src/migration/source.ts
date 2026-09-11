import fs from 'node:fs/promises';
import path from 'node:path';
import type { LegacyRecord, LegacySource } from './types.js';
import type { MigrationConfig } from './config.js';

const FILES: Array<{ key: keyof Omit<LegacySource, 'kind' | 'note'>; names: string[] }> = [
  { key: 'universities', names: ['universities.json', 'university.json'] },
  { key: 'institutes', names: ['institutes.json', 'institute.json', 'colleges.json'] },
  { key: 'users', names: ['users.json', 'user.json'] },
  { key: 'students', names: ['students.json', 'student.json'] },
  { key: 'enrollments', names: ['enrollments.json', 'enrollment.json'] },
  { key: 'insurance', names: ['insurance.json', 'insuranceEnrollments.json'] },
  { key: 'documents', names: ['documents.json', 'document.json'] },
  { key: 'payments', names: ['payments.json', 'payment.json', 'paymentLog.json'] },
  { key: 'reviews', names: ['reviews.json', 'review.json'] },
  { key: 'ecards', names: ['ecards.json', 'e-cards.json', 'ecard.json'] },
  { key: 'notifications', names: ['notifications.json'] },
  { key: 'auditLogs', names: ['auditLogs.json', 'audit.json'] },
  { key: 'files', names: ['files.json', 'files-manifest.json'] }
];

function emptySource(kind: LegacySource['kind'], note: string): LegacySource {
  return {
    kind,
    note,
    universities: [],
    institutes: [],
    users: [],
    students: [],
    enrollments: [],
    insurance: [],
    documents: [],
    payments: [],
    reviews: [],
    ecards: [],
    notifications: [],
    auditLogs: [],
    files: []
  };
}

function asRecords(payload: unknown): LegacyRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is LegacyRecord => Boolean(item) && typeof item === 'object');
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['records', 'data', 'rows', 'items']) {
      if (Array.isArray(record[key])) return asRecords(record[key]);
    }
  }
  return [];
}

async function readJsonFile(filePath: string): Promise<LegacyRecord[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  return asRecords(JSON.parse(raw) as unknown);
}

export async function loadLegacySource(config: MigrationConfig): Promise<LegacySource> {
  if (config.legacyApiUrl && !config.legacyApiAuthorized) {
    return emptySource(
      'api-refused',
      'LEGACY_API_URL is set but LEGACY_API_AUTHORIZED is not true. Live production APIs are not called.'
    );
  }
  if (config.legacyApiUrl && config.legacyApiAuthorized) {
    return emptySource(
      'api-refused',
      'Authorized live API pull is not implemented in Phase 8. Provide a read-only export directory instead of calling production.'
    );
  }
  if (config.legacyDatabaseUrl) {
    return emptySource(
      'sql-unconfigured',
      'LEGACY_DATABASE_URL is set but the legacy schema is NOT_AVAILABLE_IN_LEGACY_SOURCE. Export tables to JSON in LEGACY_EXPORT_DIR. The URL is never written to.'
    );
  }
  if (!config.exportDir) {
    return emptySource(
      'none',
      'NOT_AVAILABLE_IN_LEGACY_SOURCE: no LEGACY_EXPORT_DIR / fixture. Dry-run reports empty counts.'
    );
  }

  const source = emptySource('export-dir', `Reading authorized export from ${config.exportDir}`);
  try {
    await fs.access(config.exportDir);
  } catch {
    source.kind = 'none';
    source.note = `Export directory does not exist: ${config.exportDir}`;
    return source;
  }

  for (const file of FILES) {
    for (const name of file.names) {
      const full = path.join(config.exportDir, name);
      try {
        source[file.key] = await readJsonFile(full);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') continue;
        throw error;
      }
    }
  }
  if (config.exportDir.includes(`${path.sep}fixtures${path.sep}`) || config.exportDir.includes('/fixtures/')) {
    source.kind = 'fixture';
    source.note = 'TEST FIXTURE only — not production data';
  }
  return source;
}
