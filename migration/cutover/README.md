# Cutover artefacts

JSON files in this folder are **status records**, not completed migrations.

`status: NOT_EXECUTED` means Phase 10 prepared the process but did **not** write to production MongoDB, did **not** export the old system, and did **not** invent counts.

After an authorized run, operators should replace these files with the pipeline output from `migration/reports/` (that directory is gitignored because it may contain production identifiers).
