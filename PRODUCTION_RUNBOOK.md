# Production runbook

Infrastructure-specific binaries and hostnames are **TODO: CONFIGURE**. Secrets stay in the operator secret store.

Health: `GET https://TODO-CONFIGURE-API-HOST/api/health`  
Expected: HTTP 200, `data.status` is `ok`, no URIs or secrets in the body.

---

## Application restart

1. Confirm health endpoint
2. Restart the API process (**TODO: CONFIGURE** — systemd / container / PaaS)
3. Confirm `GET /api/health` and `GET /api/health/db`
4. Confirm frontend still loads static assets

Local equivalent after `npm run build`: `NODE_ENV=production npm start`

---

## Database issue

1. Check Atlas status and `GET /api/health/db`
2. Confirm IP allowlist includes the API hosts only
3. Do not expose MongoDB to browsers
4. Restore from snapshot onto a **new** cluster first (`BACKUP_RESTORE.md`)

---

## Storage issue

Document APIs are not live. If object storage is configured for a later module:

1. Verify bucket credentials in the secret store (not in git)
2. Confirm the API never logs `STORAGE_SECRET_KEY`

---

## Failed deployment

1. Stop rolling forward
2. Redeploy last known good tag (**TODO: CONFIGURE**)
3. `PRODUCTION_ROLLBACK_PLAN.md`

CI (`npm run ci` / GitHub Actions) does not deploy production.

---

## Password reset issue

Email transport is **PRODUCTION CONFIGURATION REQUIRED**. If SMTP is unset, production logs that mail was not sent and does not include the reset URL. Users cannot receive reset mail until a provider is implemented.

Workaround (break-glass): **TODO: CONFIGURE** (never paste passwords into tickets).

---

## Failed Excel upload

1. Confirm file is `.xlsx` under `MAX_EXCEL_FILE_SIZE_MB`
2. Confirm college institute is `ACTIVE`
3. Use the import error workbook from the college portal
4. API returns 429 if upload rate limit is hit

---

## Failed E-card generation

There is **no** E-card HTTP API. Treat reports of “e-card broken on the new portal” as expected until Phase 7 APIs exist. The old system remains the fallback.

---

## API outage

1. Health checks
2. Process logs (requestId, status, durationMs — no JWTs)
3. Reverse proxy / TLS terminator (**TODO: CONFIGURE**)
4. Rate-limit 429 vs 5xx

---

## Database restore

Follow `BACKUP_RESTORE.md`. Never restore over the old production database as part of new-stack recovery.

---

## Security smoke (post-deploy)

| Call | Expect |
| --- | --- |
| No cookie → `GET /api/admin/dashboard` | 401 |
| No cookie → `GET /api/college/students` | 401 |
| College session → `GET /api/admin/dashboard` | 403 |
| College A → College B `GET /api/college/students/:id` | 404 |
| Malformed `Authorization: Bearer` | 401 |

Insurance/payment/document IDs have **no** HTTP routes to probe until Phase 7.

---

## Background jobs

This application has **no** email queue worker, cron, or e-card job process. Nothing extra needs to be started besides the API and the static frontend. If jobs are added later, list them here.

---

## Rollback

`PRODUCTION_ROLLBACK_PLAN.md`
