# Rollback plan (new system only)

The old production application and its database remain **read-only**. No rollback step may delete, update, or restore-over the old system.

## What can be rolled back

- Documents inserted into the **new** staging or (future) production MongoDB that carry `legacyId` + `legacySystem`
- Files copied into `STORAGE_DESTINATION` / new object storage
- `migrationIdMaps`, `migrationRuns`, `migrationIssues`

## What cannot and must not be rolled back via the old system

- Anything on svyuvasuraksha.org, app.svyuvasuraksha.org, or admin.svyuvasuraksha.org
- Legacy `/uploads1/` originals
- Legacy SQL/PHP data

The old system is **not** the backup of the new system.

## Backup before a target write

1. Atlas snapshot of the **target** cluster/database (staging now; production only after Phase 8 approval).
2. Confirm snapshot completes (`migration/../docs/BACKUP_AND_RESTORE.md`).
3. If object storage is in use, snapshot or version the **destination** bucket, not the legacy source.

Phase 8 staging should use a dedicated database/cluster, so dropping migrated rows there does not touch live `SVYSY` application data.

## How to restore the new database

1. Restore the Atlas snapshot to a new database or the staging cluster.
2. Point `MONGODB_URI_MIGRATION_STAGING` (or the app URI, only after a planned cutover) at the restored data.
3. Re-check `GET /api/health` and sample `legacyId` counts.

Never restore a snapshot onto the old production host.

## How migrated records are identified

```js
db.students.find({ legacySystem: "svyuvasuraksha-legacy", legacyId: { $ne: null } })
```

The same filter applies to universities, institutes, users, insurance, documents, payments, reviews, ecards.

## How a failed migration is retried

1. Keep the legacy export unchanged (still read-only).
2. Fix mapping/export issues listed in `migration/reports/`.
3. Re-run `npm run migration:staging`. Upsert is keyed by `legacyId` (idempotent).
4. Records classified `REVIEW_REQUIRED` / `FAILED` stay in reports until the source row is correct; they are not deleted from legacy.

To wipe **staging only** (never production, never legacy):

```js
// staging database only
db.migrationIdMaps.deleteMany({ legacySystem: "svyuvasuraksha-legacy" })
// then delete target docs with the same legacySystem filter
```

Do this only on the staging URI.

## Failed file copies

Re-run `npm run migration:storage` after placing missing files in `STORAGE_SOURCE`. Checksums must match after copy. Missing files remain `FILE_MIGRATION_FAILED` until a real file exists.

## Admin credentials

Do not roll back by hardcoding passwords. Restore users from backup or run the existing `seed:admin` path on staging with env vars.
