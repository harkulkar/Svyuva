import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import type { MigrationMode } from './types.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REPO_ROOT = path.resolve(backendDir, '..');

export type MigrationConfig = {
  mode: MigrationMode;
  dryRun: boolean;
  batchSize: number;
  sampleSize: number;
  legacySystem: string;
  exportDir: string;
  stagingUri: string;
  productionUri: string;
  appUri: string;
  dbName: string;
  storageSource: string;
  storageDestination: string;
  legacyApiUrl: string;
  legacyApiAuthorized: boolean;
  legacyDatabaseUrl: string;
  allowAppDb: boolean;
  adminEmail: string;
  reportsDir: string;
  mapsDir: string;
};

export function migrationConfig(mode: MigrationMode, extra: { fixtureDir?: string } = {}): MigrationConfig {
  const dryRun = mode === 'staging' ? false : true;
  return {
    mode,
    dryRun,
    batchSize: env.MIGRATION_BATCH_SIZE,
    sampleSize: env.MIGRATION_SAMPLE_SIZE,
    legacySystem: env.LEGACY_SYSTEM_NAME || 'svyuvasuraksha-legacy',
    exportDir: extra.fixtureDir || env.LEGACY_EXPORT_DIR || '',
    stagingUri: env.MONGODB_URI_MIGRATION_STAGING || '',
    productionUri: env.MONGODB_URI_PRODUCTION || '',
    appUri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
    storageSource: env.STORAGE_SOURCE || '',
    storageDestination: env.STORAGE_DESTINATION || '',
    legacyApiUrl: env.LEGACY_API_URL || '',
    legacyApiAuthorized: Boolean(env.LEGACY_API_AUTHORIZED),
    legacyDatabaseUrl: env.LEGACY_DATABASE_URL || '',
    allowAppDb: Boolean(env.MIGRATION_ALLOW_APP_DB),
    adminEmail: (env.MIGRATION_ADMIN_EMAIL || '').toLowerCase(),
    reportsDir: path.join(REPO_ROOT, 'migration', 'reports'),
    mapsDir: path.join(REPO_ROOT, 'migration', 'maps')
  };
}

export function assertStagingTarget(config: MigrationConfig): void {
  if (!config.stagingUri) {
    throw new Error('MONGODB_URI_MIGRATION_STAGING is required for staging migration.');
  }
  if (config.productionUri && config.stagingUri === config.productionUri) {
    throw new Error('Refusing to write staging migration to MONGODB_URI_PRODUCTION.');
  }
  if (!config.allowAppDb && config.stagingUri === config.appUri) {
    throw new Error('Refusing to use application MONGODB_URI as staging. Set MIGRATION_ALLOW_APP_DB=true only for local experiments.');
  }
}

export function assertNotProductionCutover(mode: MigrationMode): void {
  if (mode === 'staging') return;
  if (String(mode) === 'production') {
    throw new Error('Production cutover is not implemented in Phase 8.');
  }
}
