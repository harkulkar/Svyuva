# PHASE 9 REPORT

## PHASE 9 STATUS

Security, testing, performance, and production-readiness work is complete for the code that exists. Phase 10 (deployment, DNS, production cutover) was **not** started.

---

## Security

### Critical issues
- **C1 Password-reset email:** hashed, expiring, single-use tokens are implemented. There is **no production mail transport**. SMTP placeholders are in `.env.example`. Production logs that SMTP is missing and never logs the reset URL. **BLOCKED — PRODUCTION DECISION REQUIRED**
- **C2 Phase 7 HTTP APIs:** insurance, documents, payment, review, and e-card have models/migration only. College UI is “Coming soon”. Not invented. UAT of those modules cannot run.

### High issues
Fixed in this phase: refresh revocation and new session on password change; `passwordChangedAt` invalidates old access JWTs; global API rate limit; refresh/change-password/upload/export limits; production CORS no longer allows localhost; health endpoints no longer list collections or environment internals.

### Medium issues
Fixed: escaped institute `$regex`; inactive institutes cannot manage students; Excel magic bytes; export formula neutralization; export audit (`DATA_EXPORT`); enum export status; safe upload filenames; portal skip-link/`<main>`; `passwordResetRequired` UI; confirm-dialog Escape and reject-reason guard.

### Low issues
Bearer header still accepted (tests/API clients); reset token in URL path; no-Origin CORS for non-browser clients; API Helmet CSP off (SPA CSP belongs on the static host); aging `xlsx` package; no browser E2E runner; regex search still not prefix-indexed.

Full write-up: `SECURITY_AUDIT.md`.

---

## Testing

| Suite | Command | Result (2026-09-08) |
| --- | --- | --- |
| Lint | `npm run lint` | Pass |
| Backend unit | `npm run test:unit -w backend` | Included in backend `npm test` |
| Backend integration | `npm run test:integration -w backend` | Included in backend `npm test` |
| Backend E2E (API workflows 1–3) | `npm run test:e2e -w backend` | Pass (5 tests) |
| Backend all | `npm run test -w backend` | **84 pass, 0 fail** |
| Frontend unit | `npm run test -w frontend` | **6 pass** (login schema, reset routing, public content, API base) |
| Production build | `npm run build` | Pass (portal routes code-split) |
| `npm audit --workspaces` | See unresolved list below | **11 findings; not blindly upgraded** |

### Unit tests
Password hashing, Zod auth validators, API envelope, regex/spreadsheet helpers, migration transforms, frontend login validation and password-reset routing.

### Integration tests
Auth (success/failure, reset, tokens, pending/inactive), RBAC, college isolation and student IDOR, Excel import, admin administration including last-admin protection, security hardening (malformed/expired JWT, health payload, college→admin 403).

### E2E tests
API workflows: signup → admin approval → college login → dashboard; student CRUD; Excel upload → preview → import. Workflows 4–6 (insurance/documents/review/e-card) correctly return **404** until Phase 7 APIs exist.

### Frontend tests
Schema and guard unit tests. **Browser E2E (Playwright/Cypress) is not in the project.** **BLOCKED — PRODUCTION DECISION REQUIRED**

---

## Performance

### Findings
- Lists already paginate (`limit` ≤ 100). Exports capped by `MAX_EXPORT_ROWS`.
- Excel parse size/row/timeout caps remain.
- Case-insensitive regex search is escaped but can still scan; prefer `status` / `instituteId` / `academicYear` filters under load.
- Full-volume Atlas load test (hundreds of thousands of students) was **not** run from this environment.

### Optimizations
- Indexes: `createdAt` on students and institutes; existing unique/partial legacy indexes unchanged.
- Admin/college portal pages loaded with `React.lazy`.
- Request logging uses path without query string.
- Health checks are cheap (no collection listing).

---

## Infrastructure readiness

| Item | Status |
| --- | --- |
| Backup procedure | Documented in `BACKUP_RESTORE.md` |
| Restore drill | **BLOCKED — PRODUCTION DECISION REQUIRED** (staging cluster) |
| Health checks | `GET /api/health`, `GET /api/health/db` |
| Monitoring | Placeholders in `MONITORING.md` (no vendor forced) |
| Disaster recovery | `DISASTER_RECOVERY.md` with TODO: CONFIGURE |

---

## Dependency audit (unresolved)

`npm audit --workspaces` reported **11** issues (8 moderate, 2 high, 1 critical). None were force-upgraded (breaking majors or no patch).

| Package | Severity | Action |
| --- | --- | --- |
| `xlsx` | high / critical (prototype pollution, ReDoS); **no fix** | Keep; Excel is parsed server-side with caps. Replacement is a product decision. |
| `esbuild` via Vitest/Vite | moderate (dev server) | Dev-only; do not `audit fix --force` onto Vitest 5 |
| `qs` / Express 4 `body-parser` | moderate | Wait for Express 4 patch or planned Express 5 migration |
| `react-router` 6 | moderate (open redirect / SSR constructor) | App is CSR; do not jump to React Router 7 without a dedicated upgrade |

---

## Known limitations

- Phase 7 modules have no HTTP APIs.
- Password reset cannot be delivered in production until SMTP is implemented.
- No Playwright/Cypress.
- Atlas restore drill not executed here.
- Object storage not live.
- SPA Content-Security-Policy not set on `index.html` (would break Vite/fonts unless tuned at the reverse proxy).
- Legal/privacy retention: **TODO: VERIFY OFFICIAL POLICY**.

---

## Production blockers

1. SMTP / password-reset delivery — **BLOCKED — PRODUCTION DECISION REQUIRED**
2. Phase 7 APIs for insurance, documents, payment, review, e-card (if those are in-scope for UAT)
3. Staging MongoDB restore drill — **BLOCKED — PRODUCTION DECISION REQUIRED**
4. Production `FRONTEND_ORIGIN`, JWT secrets, Atlas backup policy, monitoring vendor — **TODO: CONFIGURE**
5. `xlsx` has no patched release — accept risk or replace later

---

## Overall status

**NOT READY FOR UAT** of the full scheme (insurance, documents, payment, review, e-card).

**READY FOR UAT** of Phases 1–6 (public site, authentication, college registration, students, admin) on a staging database, after operators fill environment-specific values.

Phase 10 was not started.
