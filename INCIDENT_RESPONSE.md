# Incident response

## Severity

| Level | Meaning | Examples |
| --- | --- | --- |
| **P1 — Critical** | Complete outage, major data corruption, or critical security incident | API down; confirmed data loss; secret leak in production |
| **P2 — High** | Major feature unavailable | Admin/college login broken; widespread Excel import failure |
| **P3 — Medium** | Limited functionality | Single institute cannot import; isolated 5xx |
| **P4 — Low** | Minor UI issue | Copy/layout defect with a workaround |

On-call roster: **TODO: CONFIGURE**.

## Process

1. **Detect** — health probe, logs, admin System health, user report with Reference ID.
2. **Contain** — enable `MAINTENANCE_MODE=true` if needed; rotate leaked secrets; disable a compromised account (`INACTIVE`); do not shut down the old live portal from this repo.
3. **Investigate** — locate `requestId` in structured logs; review `/admin/audit-logs` and `/admin/login-activity`. Never paste secrets into tickets.
4. **Recover** — restart known-good build; restore **to staging first** (`BACKUP_RESTORE.md`); rollback per `PRODUCTION_ROLLBACK_PLAN.md`.
5. **Verify** — `PRODUCTION_SMOKE_TEST.md` checks that apply to implemented modules.
6. **Document** — date, severity, `requestId`s, actions, data impact. No passwords or tokens in the write-up.
7. **Prevent recurrence** — ticket for tests, alerts, or change-management gaps.

## Security incidents

| Case | Actions |
| --- | --- |
| Compromised account | Set status `INACTIVE`; force password change after re-enable; review login activity |
| Suspicious login activity | Filter `/admin/login-activity` failures; do not lock all users automatically |
| Leaked secret | Rotate it in the secret store; invalidate JWT secrets (all sessions re-login); investigate logs **without** recording the secret |
| Unauthorized document access | Confirm RBAC; document HTTP APIs are not live — treat any unexpected file URL as an incident |
| Suspicious API activity | Rate limits; audit `DATA_EXPORT`; block at edge **TODO: CONFIGURE** |

Never print the compromised secret in logs or reports.
