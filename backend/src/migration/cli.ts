import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrationConfig, type MigrationConfig } from './config.js';
import { runPipeline } from './pipeline.js';
import { runStorageMigration } from './storage.js';
import { verifyMigration } from './verify.js';
import type { MigrationMode } from './types.js';

const FIXTURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/test-export');

function parseMode(argv: string[]): { mode: MigrationMode; fixture: boolean } {
  const args = argv.filter((item) => item !== '--');
  const fixture = args.includes('--fixture');
  const token = args.find((item) => !item.startsWith('--')) || 'dry-run';
  const allowed: MigrationMode[] = ['dry-run', 'staging', 'verify', 'inventory', 'reconcile', 'storage'];
  if (!allowed.includes(token as MigrationMode)) {
    throw new Error(`Unknown migration command "${token}". Use dry-run | staging | verify | inventory | reconcile | storage`);
  }
  if (token === 'production') {
    throw new Error(
      'Production cutover is not auto-run. Complete PRODUCTION_CUTOVER_PLAN.md. The old live database must not be modified from this CLI.'
    );
  }
  return { mode: token as MigrationMode, fixture };
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const { mode, fixture } = parseMode(argv);
  const extra = fixture ? { fixtureDir: FIXTURE_DIR } : {};
  const config: MigrationConfig = migrationConfig(mode, extra);

  if (mode === 'storage') {
    await runStorageMigration(config);
    return;
  }
  if (mode === 'verify') {
    await verifyMigration(config);
    return;
  }
  if (mode === 'inventory') {
    config.dryRun = true;
    config.mode = 'inventory';
    await runPipeline(config);
    await runStorageMigration({ ...config, dryRun: true, mode: 'storage' });
    return;
  }
  if (mode === 'reconcile' || mode === 'dry-run') {
    config.dryRun = true;
    await runPipeline(config);
    return;
  }
  if (mode === 'staging') {
    config.dryRun = false;
    await runPipeline(config);
    return;
  }
}

runCli().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exit(1);
});
