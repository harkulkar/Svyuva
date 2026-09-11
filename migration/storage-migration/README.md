# Storage file migration

This folder is the operator entry point for legacy file copy. Implementation lives in `backend/src/migration/storage.ts`.

## Commands

```bash
npm run migration:storage
```

`DRY_RUN` is implied unless you run staging/storage with a destination. The default CLI `storage` command inventories and, only when `dryRun` is false, copies files.

Phase 8 does **not** enable a production copy. Use:

- `STORAGE_SOURCE` — local read-only copy of `/uploads1/` (or equivalent export)
- `STORAGE_DESTINATION` — staging object-store mount or local staging directory

## Behaviour

1. Walk `STORAGE_SOURCE` (no live scrape of admin.svyuvasuraksha.org)
2. SHA-256 each file
3. If not dry-run, copy to `STORAGE_DESTINATION` preserving relative paths
4. Re-hash destination and compare
5. Failures are `FILE_MIGRATION_FAILED` with a reason

Identical checksums can later be de-duplicated in object storage; Phase 8 records checksums rather than silently dropping files.
