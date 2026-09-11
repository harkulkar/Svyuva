# Production readiness — Phase 9

This document records whether the SV Yuva Suraksha Yojana portal can be treated as production-ready. It is **not** a go-live approval.

Phase 10 (deployment, DNS, production cutover) has **not** been started.

---

## What is ready for UAT (Phases 1–6)

- Public website
- Authentication (login, signup, logout, refresh, change password)
- College registration and admin approval/rejection
- College profile and dashboard
- Student CRUD, pagination, filters, Excel validate/preview/import
- Admin dashboard, universities, institutes, users, reports, audit logs, CSV/XLSX export
- College data isolation on student APIs
- Health checks: `GET /api/health`, `GET /api/health/db`
- Structured request logs with request IDs (no secrets)
- Rate limits on auth, refresh, uploads, exports, and global API traffic

## What is not ready

| Area | Reason |
| --- | --- |
| Insurance enrollment HTTP API | Phase 7 UI is “Coming soon”; no API |
| Document upload/download HTTP API | Same |
| Payment status HTTP API | Same; no payment gateway (do not invent one) |
| Review workflow HTTP API | Same |
| E-card generation HTTP API | Same |
| Production password-reset email | SMTP not configured — **BLOCKED — PRODUCTION DECISION REQUIRED** |
| Browser end-to-end tests | No Playwright/Cypress in the project — **BLOCKED — PRODUCTION DECISION REQUIRED** |
| Production CORS / frontend URL | Must be set in environment, not source |
| Atlas backup restore drill | Needs a non-production cluster — **BLOCKED — PRODUCTION DECISION REQUIRED** |
| Object storage | Env placeholders only; documents module not live |
| Third-party monitoring | Documented as placeholders in `MONITORING.md` |

---

## Environments

Configuration is via environment variables only (`NODE_ENV=development|test|production`).

Production **must** use:

- Production MongoDB URI (`MONGODB_URI` / `MONGODB_URI_PRODUCTION` — never committed)
- Production `FRONTEND_ORIGIN` / `CLIENT_URL` (no `*` CORS)
- Distinct JWT secrets (≥ 32 characters)
- `ALLOW_ADMIN_SEED=false`
- SMTP host once a mailer is implemented
- Restricted cookie flags (`Secure`, `SameSite=strict` unless a documented cross-site exception exists)

Never put production values in source, README, tests, or `.env.example`.

---

## Performance snapshot

- List endpoints paginate with `limit` ≤ 100; exports capped by `MAX_EXPORT_ROWS` (default 5000)
- Excel parse timeout and row cap from env
- Indexes on email, instituteId, universityId, student identifiers, status, createdAt, legacyId (partial unique)
- Admin/college portal routes are code-split (`React.lazy`)
- Student lists are server-paginated (default 20); the browser does not load the full collection
- Remaining risk: case-insensitive regex search can still scan; prefer indexed filters (`status`, `instituteId`, `academicYear`) in UAT with large data

Load testing at “hundreds of thousands of students” was **not** executed against Atlas in this phase (would affect shared clusters). Indexes and pagination are in place for that shape of data.

---

## Data privacy

The application stores personal student and institute data. Access is role-based. Logs redact secrets and avoid reset URLs.

Retention, legal notices, and DPDP/IT Act obligations: **TODO: VERIFY OFFICIAL POLICY**.

---

## Overall

See `PHASE_9_REPORT.md`. Full-scheme UAT including insurance/payment/e-card is **not** possible until Phase 7 APIs exist. Phases 1–6 can be UAT’d against a staging database.
