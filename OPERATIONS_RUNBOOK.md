# Operations runbook

Related: `PRODUCTION_RUNBOOK.md` (cutover-era), `ALERTING.md`, `INCIDENT_RESPONSE.md`.

On-call: **TODO: CONFIGURE**.

## Daily

- [ ] Application health — `GET /api/health` and Admin → System health
- [ ] Database health — `GET /api/health/db`
- [ ] Storage health — Admin → Storage health (metadata; HTTP APIs not live)
- [ ] Error monitoring — dashboard recent errors / log sink
- [ ] Failed jobs — none besides Excel preview TTL; treat “Recent failed jobs” as placeholder
- [ ] Failed uploads — dashboard card / college reports

## Weekly

- [ ] Backup verification — `npm run maintenance:verify-backup` (may exit 2 if `BACKUP_VERIFY_DIR` unset)
- [ ] Error review — 5xx and `LOGIN_FAILED` spikes
- [ ] Audit review — `/admin/audit-logs` (exports, approvals, corrections)
- [ ] Storage review — `npm run maintenance:check-storage` (read-only)
- [ ] Performance review — `slow_query` logs and p95 `durationMs`

## Monthly

- [ ] Restore test where appropriate — staging only; record in `DATABASE_BACKUP_POLICY.md`
- [ ] Dependency review — `DEPENDENCY_MAINTENANCE.md` (`npm audit --workspaces`; do not force-upgrade in production)
- [ ] Security review — RBAC tests (`npm run test:integration`)
- [ ] User/account review — inactive account list; no automatic disable
- [ ] Capacity review — collection growth via `npm run maintenance:check-db`
