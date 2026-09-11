#!/usr/bin/env node
/**
 * Final production migration is not auto-run.
 * Complete UAT, backups, and PRODUCTION_CUTOVER_PLAN.md first.
 * Then use the Phase 8 CLI against a staging URI — never against the old live database.
 */
console.error(
  [
    'Final production migration was not executed.',
    'BLOCKED — PRODUCTION DECISION REQUIRED: authorized legacy export, verified backup, UAT approval, and written cutover authorization.',
    'The old production system was not modified.',
    'Use: npm run migration:dry-run  then  npm run migration:staging (staging URI only).'
  ].join('\n')
);
process.exit(1);
