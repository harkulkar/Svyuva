import fs from 'node:fs/promises';
import path from 'node:path';
import type { DuplicateHit, EntityCounts, IssueRow, OrphanHit } from './types.js';

export type ReportBundle = {
  generatedAt: string;
  mode: string;
  sourceKind: string;
  sourceNote: string;
  dryRun: boolean;
  counts: Record<string, EntityCounts>;
  issues: IssueRow[];
  duplicates: DuplicateHit[];
  orphans: OrphanHit[];
  missingFiles: Array<{ legacyId: string; path: string; reason: string }>;
};

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function writeReports(reportsDir: string, bundle: ReportBundle): Promise<void> {
  await fs.mkdir(reportsDir, { recursive: true });

  const quality = {
    generatedAt: bundle.generatedAt,
    mode: bundle.mode,
    sourceKind: bundle.sourceKind,
    sourceNote: bundle.sourceNote,
    dryRun: bundle.dryRun,
    counts: bundle.counts,
    issues: bundle.issues
  };
  await fs.writeFile(path.join(reportsDir, 'data-quality-report.json'), JSON.stringify(quality, null, 2));
  await fs.writeFile(path.join(reportsDir, 'duplicate-report.json'), JSON.stringify({ generatedAt: bundle.generatedAt, duplicates: bundle.duplicates }, null, 2));
  await fs.writeFile(path.join(reportsDir, 'orphan-record-report.json'), JSON.stringify({ generatedAt: bundle.generatedAt, orphans: bundle.orphans }, null, 2));
  await fs.writeFile(path.join(reportsDir, 'missing-files-report.json'), JSON.stringify({ generatedAt: bundle.generatedAt, missing: bundle.missingFiles }, null, 2));

  const reconciliation = {
    generatedAt: bundle.generatedAt,
    mode: bundle.mode,
    sourceNote: bundle.sourceNote,
    rows: Object.entries(bundle.counts).map(([entity, counts]) => ({
      entity,
      legacy: counts.legacy,
      migrated: counts.migrated,
      existing: counts.existing,
      failed: counts.failed,
      review: counts.review,
      warning: counts.warning,
      skipped: counts.skipped,
      valid: counts.valid
    }))
  };
  await fs.writeFile(path.join(reportsDir, 'reconciliation-report.json'), JSON.stringify(reconciliation, null, 2));

  const header = 'Entity,Legacy,Migrated,Existing,Failed,Review,Warning,Skipped,Valid';
  const lines = [header, ...reconciliation.rows.map((row) =>
    [row.entity, row.legacy, row.migrated, row.existing, row.failed, row.review, row.warning, row.skipped, row.valid]
      .map(csvEscape)
      .join(',')
  )];
  await fs.writeFile(path.join(reportsDir, 'reconciliation-report.csv'), `${lines.join('\n')}\n`);
}

export function printCounts(counts: Record<string, EntityCounts>): void {
  for (const [entity, row] of Object.entries(counts)) {
    console.info(
      `${entity}:\n  Legacy: ${row.legacy}\n  Valid: ${row.valid}\n  Warning: ${row.warning}\n  Review: ${row.review}\n  Failed: ${row.failed}\n  Skipped: ${row.skipped}\n  Migrated: ${row.migrated}\n  Existing: ${row.existing}`
    );
  }
}
