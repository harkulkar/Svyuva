# Disaster recovery

Do not invent infrastructure that has not been chosen. Values below that are unset are marked **TODO: CONFIGURE**.

This is not a Phase 10 cutover plan. Do not change DNS, production databases, or the old portal from this document.

---

## Recovery objectives

| Objective | Value |
| --- | --- |
| RPO (maximum acceptable data loss) | TODO: CONFIGURE |
| RTO (maximum acceptable downtime) | TODO: CONFIGURE |

---

## Database

- **Backup frequency:** TODO: CONFIGURE (Atlas continuous backup / snapshot policy)
- **Restore:** `BACKUP_RESTORE.md` — restore to a non-production cluster first
- **Verification:** health check, sample login, sample institute/student read

---

## Document storage

- **Backup:** TODO: CONFIGURE (bucket versioning + replication)
- **Restore:** copy objects to the destination bucket; confirm keys in MongoDB still match
- HTTP document APIs are not live yet; storage DR still matters once Phase 7 ships

---

## Application / compute

- **Runtime:** TODO: CONFIGURE (VM, container platform, or PaaS)
- **Rebuild:** `npm ci` then `npm run build` from a known git tag
- **Process:** TODO: CONFIGURE (systemd, container orchestrator, or platform start command)
- Health: `GET /api/health` and `GET /api/health/db`

---

## Environment variables

Secrets live outside git. Recovery source: **TODO: CONFIGURE** (vault, hoster secret store, sealed envelope).

Minimum variables to recover:

- `MONGODB_URI`, `MONGODB_DB_NAME`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_ORIGIN`, `CLIENT_URL`
- `COOKIE_SAMESITE`
- Storage keys (when used)
- SMTP settings (when implemented)

Rotate JWT secrets after a suspected leak; all sessions will need to log in again.

---

## Emergency administrator

1. If at least one `ADMIN` with `status=ACTIVE` can log in, use the admin portal Users screen. The API refuses to deactivate the last active administrator.
2. If no admin can log in, **TODO: CONFIGURE** a break-glass procedure (for example: restore users collection, or a controlled `ALLOW_ADMIN_SEED=true` run against **staging only**, then disable seed). Never leave `ALLOW_ADMIN_SEED=true` in production.

---

## DNS / domain

- Domain registrar: TODO: CONFIGURE  
- DNS host: TODO: CONFIGURE  
- TLS certificates: TODO: CONFIGURE  

Do not change production DNS as part of Phase 9.

---

## Old portal

The legacy site remains out of scope. Do not shut it down or migrate extra production data from this document.

---

## Communication

Stakeholder contact list: TODO: CONFIGURE  
Public status page: TODO: CONFIGURE (internal system status is Admin → System health; not a public status page)

---

## Disaster recovery test scenarios

Record date, operator, and result when a drill is run. **Drills were not executed in Phase 11.**

### Scenario 1 — Database unavailable

- **Detection:** `GET /api/health/db` 503; System health database status `unavailable`.
- **Response:** P1; do not restore over production; check Atlas.
- **Recovery:** Fail over per Atlas procedure TODO: CONFIGURE; or restore snapshot to **staging** first (`BACKUP_RESTORE.md`).
- **Verification:** Health ok; sample admin login on staging.

### Scenario 2 — Object storage unavailable

- **Detection:** Storage health connectivity; upload/download errors when APIs exist.
- **Response:** P2 today (document HTTP APIs not live); confirm bucket from secret store.
- **Recovery:** Restore objects + confirm `storageKey` metadata.
- **Verification:** `npm run maintenance:check-storage` report; no automatic deletes.

### Scenario 3 — Backend unavailable

- **Detection:** `/api/health` probe fails.
- **Response:** Restart known-good `npm start` / container; public SPA may still render.
- **Recovery:** Redeploy last git tag (`DEPLOYMENT.md`).
- **Verification:** Health + login smoke.

### Scenario 4 — Frontend unavailable

- **Detection:** Static host 5xx / empty site.
- **Response:** Redeploy SPA; API may still be healthy.
- **Recovery:** `npm run build -w frontend` artefact.
- **Verification:** Homepage, policies, downloads without requiring API.

### Scenario 5 — Failed deployment

- **Detection:** Smoke test fails after release.
- **Response:** `PRODUCTION_ROLLBACK_PLAN.md`.
- **Recovery:** Previous artefact; do not change old-portal DNS as a side effect.
- **Verification:** Smoke checklist.

### Scenario 6 — Accidental application configuration failure

- **Detection:** CORS/login failures; maintenance left on; wrong `FRONTEND_ORIGIN`.
- **Response:** Revert env in secret store; `MAINTENANCE_MODE=false` if accidental.
- **Recovery:** Do not commit secrets; rotate if they leaked.
- **Verification:** Login + health; System health shows expected environment name only.

