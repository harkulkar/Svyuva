# Production cutover plan

The **old** SV Yuva Suraksha system stays available until every gate below is signed. This repository does **not** change DNS, the old database, or the old application.

Hostnames of the old system (fallback during transition):

- https://svyuvasuraksha.org/
- https://app.svyuvasuraksha.org/
- https://admin.svyuvasuraksha.org/

New SPA/API hostnames: **TODO: CONFIGURE**

---

## T-24 HOURS

- [ ] UAT approved (`UAT_CHECKLIST.md`) for the in-scope modules
- [ ] Production environment ready (compute, secrets, `NODE_ENV=production`)
- [ ] New MongoDB Atlas backup / snapshot verified (`BACKUP_RESTORE.md`)
- [ ] Authorized export/backup of the **old** system verified (operator-held; not in git)
- [ ] Storage ready **or** documented N/A until document APIs exist
- [ ] DNS plan ready (not applied)
- [ ] SSL plan ready (not applied)
- [ ] Monitoring ready (`MONITORING.md`)
- [ ] Rollback plan ready (`PRODUCTION_ROLLBACK_PLAN.md`)
- [ ] SMTP decided **or** password-reset marked PRODUCTION CONFIGURATION REQUIRED
- [ ] Phase 7 gaps accepted in writing if insurance/payment/e-card are in-scope for users

## T-1 HOUR

- [ ] Old system verified still serving users
- [ ] Final data export prepared (read-only)
- [ ] New database backup completed (timestamp recorded)
- [ ] `npm run migration:dry-run` on that export
- [ ] Staging migration + `npm run migration:verify` + reconcile reports reviewed
- [ ] Production application healthy on the **new** stack (`GET /api/health`)
- [ ] `ALLOW_ADMIN_SEED=false`

## CUTOVER

Do not start this section without written authorization.

- [ ] Final authorized legacy export
- [ ] Final migration into the **new** production database only (never into the old DB)
- [ ] Reconciliation (universities, institutes, users, students, and Phase 7 collections if present in the export)
- [ ] Document/file verification if storage migration was authorized
- [ ] Admin login test (staging/production credentials from the secret store — not from git)
- [ ] College login test
- [ ] Student sample test
- [ ] Insurance test — **blocked if APIs absent**
- [ ] Payment test — **blocked if APIs absent**
- [ ] E-card test — **blocked if APIs absent**
- [ ] Audit log test

Unexplained count mismatches **stop** cutover.

## GO LIVE

- [ ] Production frontend active (new hostname or, only after approval, cutover of an existing name)
- [ ] Production API active
- [ ] DNS active
- [ ] HTTPS verified
- [ ] CORS matches the live frontend origin
- [ ] Smoke tests passed (`PRODUCTION_RUNBOOK.md`)

## POST GO-LIVE

- [ ] Monitor 5xx, auth failures, DB, latency
- [ ] Keep the old system online for the agreed transition window
- [ ] Do not retire the old system until `OLD_SYSTEM_RETIREMENT_CHECKLIST.md` is signed

`npm run migration:production` exits with an error on purpose so this plan cannot be skipped by a script.
