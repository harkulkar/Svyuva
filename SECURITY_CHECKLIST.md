# Security checklist

Use this before UAT and again before any production go-live (Phase 10). Items that cannot be completed yet are marked with the blocker.

- [x] Authentication secure (login, logout, refresh rotation)
- [x] Password hashing secure (bcryptjs; no plaintext)
- [ ] Password reset secure in production — **BLOCKED — PRODUCTION DECISION REQUIRED** (SMTP transport). Token expiry and single-use are implemented.
- [x] JWT/session security verified (HttpOnly cookies; expired/malformed/missing tokens rejected; password change invalidates old access JWTs)
- [x] RBAC verified (ADMIN vs COLLEGE on the API)
- [x] College data isolation verified (students; institute id from `req.authUser`)
- [x] IDOR testing completed for implemented resources (students, institutes via RBAC)
- [ ] IDOR testing for insurance/documents/payments/reviews/e-cards — not applicable until Phase 7 APIs exist
- [x] Input validation verified (Zod; pagination caps; strict bodies)
- [x] NoSQL injection reviewed (no `Model.find(req.query)`; regex escaped)
- [x] XSS reviewed (no `dangerouslySetInnerHTML`)
- [x] CSRF/session security reviewed (cookie auth + SameSite; CORS credentials allowlist)
- [x] CORS restricted (not `*`; localhost not allowed in production)
- [x] Rate limiting enabled (auth, refresh, upload, export, global API)
- [x] File upload security verified for Excel (type, size, magic bytes, safe filename)
- [ ] Document authorization verified — **blocked on Phase 7 document APIs**
- [x] Secrets removed from git templates (`.env` ignored; `.env.example` placeholders)
- [x] Dependency audit completed — `npm audit --workspaces` run 2026-09-08; remaining issues listed in `PHASE_9_REPORT.md` (`xlsx` has no fix; Express/qs, Vitest esbuild, React Router 6 not force-upgraded)
- [x] Error handling secured (no stack traces; requestId; generic 500 message)
- [x] Audit logs verified for implemented admin/auth/student/excel/export actions
- [ ] Backup tested — **BLOCKED — PRODUCTION DECISION REQUIRED** (staging cluster)
- [ ] Restore tested — **BLOCKED — PRODUCTION DECISION REQUIRED**
- [x] Health checks available (`/api/health`, `/api/health/db`)
- [x] Monitoring documented (`MONITORING.md`)
- [x] Accessibility reviewed (skip links, labels, focus-visible, dialog Escape, table `scope`)
- [x] Mobile responsiveness reviewed for existing pages (layout utilities; no business-logic change)

Signer / date: TODO: CONFIGURE
