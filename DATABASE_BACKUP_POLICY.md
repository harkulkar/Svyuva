# Database backup policy

**A backup is not valid until restore testing has been performed.**

Database name: `SVYSY`. URI and credentials stay in the secret store, never in git.

| Item | Value |
| --- | --- |
| Frequency | TODO: CONFIGURE (Atlas continuous backup / scheduled snapshots) |
| Retention | TODO: CONFIGURE |
| Verification | `npm run maintenance:verify-backup` (file presence in `BACKUP_VERIFY_DIR` if set; otherwise `NOT_CONFIGURED`) |
| Restore testing | Non-production cluster only — see `BACKUP_RESTORE.md` |
| Responsible administrator | TODO: CONFIGURE |

## Last restore test

| Field | Value |
| --- | --- |
| Last restore test | **NOT_EXECUTED** |
| Result | **NOT_EXECUTED** |
| Issues | Staging cluster not named; Atlas restore drill not run |

Procedure: `BACKUP_RESTORE.md`. Never restore over production without an approved window.
