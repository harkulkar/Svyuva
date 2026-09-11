# Generated reports

This directory is filled by:

- `npm run migration:dry-run`
- `npm run migration:staging`
- `npm run migration:reconcile`

Files:

| File | Meaning |
|------|---------|
| `data-quality-report.json` | Per-entity counts and issue list |
| `duplicate-report.json` | Duplicate keys in the legacy export |
| `orphan-record-report.json` | Child records whose parent legacy ID is missing |
| `missing-files-report.json` | Document rows with missing paths |
| `reconciliation-report.json` | Legacy vs migrated vs failed vs review |
| `reconciliation-report.csv` | Same table for spreadsheets |

Do not treat empty/zero reports as production totals. Zeros mean no authorized export was loaded.
