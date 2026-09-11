# Security audit — Phase 9

Date: 2026-09-08  
Scope: `sv-yuva-suraksha` frontend, backend, models, routes, auth, uploads, Excel, admin/college isolation, migration tooling, environment, logging, dependencies.

This audit is of the **greenfield** application. Phase 7 insurance/documents/payment/review/e-card **HTTP APIs are not implemented** (persistence models and migration only). Those modules were not treated as production-ready surfaces.

---

## CRITICAL

### C1 — Password-reset email has no production transport
**Where:** `backend/src/services/emailService.ts`  
Forgot-password stores a hashed, single-use, expiring token, but the mailer only logs that SMTP is missing. Production users cannot receive reset links until a provider is chosen and implemented.

**Status:** Documented. Placeholders added to `.env.example`. Production logs an error **without** the reset URL or recipient.  
**BLOCKED — PRODUCTION DECISION REQUIRED** (SMTP/provider + implementation).

### C2 — Phase 7 HTTP APIs are absent
College routes `/college/insurance`, `/documents`, `/ecard`, `/payment-status`, `/review` are UI placeholders. There are no authenticated download, payment, review, or e-card endpoints to lock down.

**Status:** Not invented (no fake gateway or official insurance data).  
UAT of those workflows cannot pass.

---

## HIGH (fixed in Phase 9 unless noted)

| ID | Issue | Status |
| --- | --- | --- |
| H1 | `changePassword` did not revoke refresh tokens | **Fixed** — deletes refresh tokens and issues a new session |
| H2 | Access JWT remained valid after password change | **Fixed** — `User.passwordChangedAt` + `iat` check in `authenticate` |
| H3 | No global `/api` rate limit | **Fixed** — 600 requests / 15 minutes (skipped in automated tests; health excluded) |
| H4 | `/api/auth/refresh` unlimited | **Fixed** |
| H5 | Change-password / Excel upload / admin export unlimited | **Fixed** |
| H6 | Production CORS still allowed localhost | **Fixed** — localhost origins only when `NODE_ENV !== production` |
| H7 | `GET /api/health` listed collection names and environment | **Fixed** — `{ status, database.connected }` only |

---

## MEDIUM (fixed where practical)

| ID | Issue | Status |
| --- | --- | --- |
| M1 | Unescaped `$regex` in admin institute search | **Fixed** (`escapeRegex`) |
| M2 | Inactive/pending institutes could still manage students on the API | **Fixed** — `collegeOwnership` requires `institute.status === 'ACTIVE'` |
| M3 | Excel `fileFilter` was extension-only | **Fixed** — ZIP/OLE magic bytes |
| M4 | Formula injection on CSV/XLSX export | **Fixed** — neutralize `=+-@` prefixes |
| M5 | Admin exports not audit-logged | **Fixed** — `DATA_EXPORT` |
| M6 | Export `status` was a free string | **Fixed** — enum |
| M7 | Upload jobs stored unsanitized original filenames | **Fixed** — `safeUploadFilename` |
| M8 | Portal pages lacked skip-link / `<main>` | **Fixed** |
| M9 | `passwordResetRequired` not enforced in the UI | **Fixed** — redirect to profile + college change-password form |
| M10 | Confirm dialog had no Escape / reject could fire with a short reason | **Fixed** |

---

## LOW (documented; not all code-changed)

| ID | Issue | Notes |
| --- | --- | --- |
| L1 | Access token also accepted from `Authorization: Bearer` | Convenient for tests/API clients; cookies remain primary for the browser |
| L2 | Reset token appears in the frontend URL `/reset-password/:token` | Standard email-link pattern; token is hashed at rest and single-use |
| L3 | CORS allows requests with no `Origin` | Needed for health checks and non-browser clients |
| L4 | Helmet CSP is disabled on the JSON API | SPA CSP belongs on the static host / reverse proxy |
| L5 | `xlsx` package is aging | See dependency audit; replacement is a product decision |
| L6 | No browser E2E runner (Playwright/Cypress) | **BLOCKED — PRODUCTION DECISION REQUIRED** |
| L7 | Audit `result` field is implied by action name (`LOGIN_FAILED`) rather than a separate column | Compatible; no breaking schema change |
| L8 | Regex search still uses case-insensitive `RegExp` | Escaped; prefix indexes would be a later performance pass |

---

## Verified as already sound (Phases 1–6)

- Passwords hashed with bcryptjs (cost 12); plaintext never stored
- JWT access verification; expired/malformed/missing tokens → 401
- Refresh tokens opaque, HMAC-hashed, rotated
- Logout clears cookies and refresh records
- Reset tokens expire (1 hour) and are single-use
- Inactive users cannot log in; pending colleges cannot use the portal
- Router-level RBAC: `adminRouter` / `collegeRouter` use `authenticate` + `requireRole`
- College student APIs scope by `req.authUser.instituteId`; IDOR tests return 404
- Zod `.strict()` on mutating bodies; pagination `limit` max 100
- Helmet, CORS allowlist (not `*`), 1mb JSON, no stack traces in responses
- Logger redacts password/secret/token/URI fields
- Last active administrator cannot be deactivated
- `.env` is gitignored; `.env.example` has placeholders only

---

## IDOR / object access

Tested on students (College A vs College B) in existing `student.api.test.ts` and workflow e2e.

**Not testable on HTTP** until Phase 7: `insuranceId`, `documentId`, `paymentId`, `reviewId`, `ecardId`. Models exist for migration only.

---

## File / document access

Excel uploads: memory storage, size cap, extension + magic bytes, validated rows, no client `instituteId`.

Private document downloads: **no HTTP API yet** (Phase 7). Do not expose public object URLs until that design is implemented (authenticated download or short-lived signed URL).
