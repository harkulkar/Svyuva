# PHASE 8 STATUS

- **Legacy source inspected:** Workspace models, `PROJECT_ANALYSIS.md`, `docs/DATA_MIGRATION.md`, live PHP **filenames** and signup **labels** only. No recovered PHP source, no database dump, no `/uploads1/` archive.
- **Data entities identified:** University, Institute, User, Student (medium confidence). Payment, document, e-card, enrollment, insurance, review (low confidence / `NOT_AVAILABLE_IN_LEGACY_SOURCE` until export).
- **Migration scripts created:** `backend/src/migration/*` plus `migration/scripts/` wrappers; npm scripts `migration:dry-run`, `inventory`, `staging`, `verify`, `reconcile`, `storage`.
- **Dry run:** Implemented. Without `LEGACY_EXPORT_DIR` counts are zero. `--fixture` exercises synthetic test data only.
- **Staging migration:** Implemented against `MONGODB_URI_MIGRATION_STAGING` only; refuses production URI and app URI unless `MIGRATION_ALLOW_APP_DB=true`.
- **Reconciliation:** JSON + CSV reports generated on each pipeline run.
- **Files migration:** Inventory + SHA-256 + optional copy; no live scrape.
- **Verification:** `npm run migration:verify` samples staging relationships.
- **Tests:** `backend/src/migration/migration.test.ts` (mapping, duplicates, orphans, checksum, password behaviour, payment secret stripping, dry-run fixture pipeline).
- **Known issues:** Official student Excel columns, password algorithm, insurance/payment/e-card schemas, and legacy PK names remain unverified. Phase 7 UI is still placeholder.
- **Records requiring manual review:** Any row missing `legacyId` or required fields; duplicate emails/`studentId`; orphans; missing files; non-bcrypt passwords; unmapped roles/statuses.
- **Production migration readiness:** **Not ready.** Export + staging + UAT + checklist required. Old system untouched. No cutover in this phase.
