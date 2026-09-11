# Scheduled tasks

Do not add cron jobs that are not required. Current tasks:

| Name | Purpose | Frequency | Failure behaviour |
| --- | --- | --- | --- |
| MongoDB TTL `uploads.expiresAt` | Expire Excel preview jobs | MongoDB TTL monitor | Job disappears; college re-uploads |
| MongoDB TTL `refreshTokens.expiresAt` | Expire refresh tokens | MongoDB TTL monitor | User signs in again |
| Backup verification (operator) | `npm run maintenance:verify-backup` | Weekly (runbook) | Exit 2 if not configured; do not delete backups |
| Storage consistency (operator) | `npm run maintenance:check-storage` | Weekly | Report only; **no deletes** |
| Index review (operator) | `npm run maintenance:check-indexes` | Monthly | Report missing expected index names |

There is no in-app notification processor or report-generation worker. Email transport is not implemented; failed sends are counted in memory on the API process only (lost on restart).
