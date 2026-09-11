# Phase 8 data migration

Migrate **authorized, read-only** exports from the old SV Yuva Suraksha production estate into the new MongoDB application.

This phase prepares dry-run, staging, validation, and reconciliation. It does **not** cut over production. It does **not** write to the old system.

## 1. What this does

- Reads a local JSON export directory (`LEGACY_EXPORT_DIR`)
- Transforms records using `migration/DATA_MAPPING.md`
- Validates, classifies (`VALID` / `WARNING` / `REVIEW_REQUIRED` / `SKIPPED` / `FAILED`)
- Detects duplicates and orphans
- Writes reports under `migration/reports/`
- Optionally upserts into **staging** MongoDB (`MONGODB_URI_MIGRATION_STAGING`)
- Preserves `legacyId` / `legacySource` / `legacySystem` on new documents
- Inventories files from `STORAGE_SOURCE` and checksums them (SHA-256)

It never:

- Calls live production APIs unless `LEGACY_API_AUTHORIZED=true`, and even then Phase 8 **refuses** to pull live data (export directory only)
- Writes to `LEGACY_DATABASE_URL`
- Writes to `MONGODB_URI_PRODUCTION`
- Uses the app `MONGODB_URI` as staging unless `MIGRATION_ALLOW_APP_DB=true`
- Stores plaintext passwords, card numbers, CVV, PIN, or OTPs

## 2. Legacy sources

Inspected in this workspace (see `LEGACY_DATA_ANALYSIS.md`):

| Source | Status |
|--------|--------|
| Recovered PHP source | **Not present** |
| Database dump | **Not present** |
| `/uploads1/` file archive | **Not present** |
| Live hosts (reference only) | svyuvasuraksha.org, app.svyuvasuraksha.org, admin.svyuvasuraksha.org |

Until an official export is provided, dry-run counts are zero and source note is `NOT_AVAILABLE_IN_LEGACY_SOURCE`.

Place an authorized export using `migration/export.example/` as the file layout.

## 3. Target database

- Application DB name: `SVYSY` (never use this for first-time staging unless explicitly allowed)
- Staging URI: `MONGODB_URI_MIGRATION_STAGING`
- Production URI env (`MONGODB_URI_PRODUCTION`) is documented only so scripts can **refuse** to use it

Migrated collections include existing Phase 3–5 collections plus persistence models for documents, enrollments, insurance, payments, reviews, e-cards, notifications, and migration maps.

## 4. Data mapping

See [DATA_MAPPING.md](./DATA_MAPPING.md). Unmapped or ambiguous fields are `MIGRATION_REVIEW_REQUIRED`. Official values are never invented.

## 5. Environment variables

Copy from root `.env.example`. Never commit `.env`.

| Variable | Purpose |
|----------|---------|
| `LEGACY_EXPORT_DIR` | Path to authorized JSON export |
| `LEGACY_DATABASE_URL` | Documented only; not written; schema unknown |
| `LEGACY_API_URL` | Documented only; live pull is refused |
| `LEGACY_API_AUTHORIZED` | Must be `true` to even consider an API (still refused in Phase 8) |
| `LEGACY_SYSTEM_NAME` | Default `svyuvasuraksha-legacy` |
| `MONGODB_URI_MIGRATION_STAGING` | Staging target |
| `MONGODB_URI_PRODUCTION` | Refuse-list |
| `STORAGE_SOURCE` / `STORAGE_DESTINATION` | File inventory / staging copy |
| `DRY_RUN` | Safety default |
| `MIGRATION_BATCH_SIZE` | Default 500 |
| `MIGRATION_SAMPLE_SIZE` | Verify sample size |
| `MIGRATION_ADMIN_EMAIL` | Map existing admin; **do not** put a password in git |
| `MIGRATION_ADMIN_PASSWORD` | Staging/dev only via env; never logged |
| `MIGRATION_ALLOW_APP_DB` | Local experiments only |

## 6. Commands

From the repository root:

```bash
npm run migration:dry-run
npm run migration:inventory
npm run migration:staging
npm run migration:verify
npm run migration:reconcile
npm run migration:storage
```

Synthetic **test fixtures** (not production data):

```bash
npm run migration:dry-run -- --fixture
```

## 7. Dry-run

Reads the export, transforms, validates, writes reports, **does not insert** into MongoDB or copy files.

## 8. Staging

Requires `MONGODB_URI_MIGRATION_STAGING`. Idempotent upserts on `{ legacySystem, legacyId }`. A second run updates existing mapped rows instead of duplicating them.

## 9. Verification

`npm run migration:verify` samples migrated staging rows and checks:

University → Institute → User / Student → Insurance / Documents / E-Card, Payment → Insurance, Review metadata.

## 10. Reports

Written to `migration/reports/`. See that folder’s README.

## 11. Error handling

One bad record does not stop the run. Each failure stores `legacyId`, code, and message. Sensitive values are redacted.

## 12. Retry

Fix the export or mapping, then re-run staging. Mapped `legacyId`s are updated in place.

## 13. Rollback

See [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md). Rollback restores the **new** database from backup. The old production system is left untouched.

## 14. Production prerequisites

See [PRODUCTION_CUTOVER_CHECKLIST.md](./PRODUCTION_CUTOVER_CHECKLIST.md). Phase 8 does not perform cutover.
