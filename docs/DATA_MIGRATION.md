# Data migration

**Status:** Phase 8 tooling is in `migration/`. No production cutover. The old system is read-only.

Full operator instructions, mapping, rollback, and the cutover checklist live in:

- [migration/README.md](../migration/README.md)
- [migration/LEGACY_DATA_ANALYSIS.md](../migration/LEGACY_DATA_ANALYSIS.md)
- [migration/DATA_MAPPING.md](../migration/DATA_MAPPING.md)
- [migration/ROLLBACK_PLAN.md](../migration/ROLLBACK_PLAN.md)
- [migration/PRODUCTION_CUTOVER_CHECKLIST.md](../migration/PRODUCTION_CUTOVER_CHECKLIST.md)

## Rules (unchanged)

1. Do not delete or overwrite the old application.
2. Do not run a destructive import into production `SVYSY`.
3. Obtain an official export (database dump and file archive) before expecting non-zero counts.
4. Map old identifiers to new MongoDB `_id` values via `legacyId` + `migrationIdMaps`.
5. Reconcile counts after staging.

Live PHP endpoints on admin.svyuvasuraksha.org are **not** called by the migrator.
