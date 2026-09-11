# Security

This portal will hold institute, student, and insurance-related data. Treat it as a government/education system.

## Secrets

- Store MongoDB URI, JWT secret, admin password, and storage keys in environment variables only.
- Never put secrets in React (`VITE_*` is visible to the browser — only `VITE_API_URL` belongs there).
- Never commit `.env`.
- If credentials were pasted into chat or email, **rotate them** before production.

## Authentication and authorization (Phase 3)

- Hash passwords with bcryptjs (no plaintext). Argon2 is not used (not in the project dependencies; Windows-safe bcryptjs was already present).
- Short-lived access JWT (`JWT_ACCESS_SECRET`) plus hashed refresh tokens (`JWT_REFRESH_SECRET` is reserved; refresh values are opaque and stored hashed).
- HttpOnly cookies; `Secure` in production; `SameSite=strict` in production (`COOKIE_SAMESITE` / `none` in local cross-origin development).
- Roles: `ADMIN`, `COLLEGE`. Authorization is enforced with `authenticate` + `requireRole` on the API. Frontend route guards are extra, not a substitute.
- College users cannot set `role` to `ADMIN` on signup.
- Rate limits on login, signup, forgot-password, and reset-password.
- Audit log of login, logout, signup, and password-reset events (no passwords or reset tokens in metadata).
- College queries must be scoped by `req.authUser.instituteId` from the server. Ignore client-supplied institute IDs. Phase 5 student APIs enforce this and return 404 for another institute’s student.

## Already in Phase 1–3

- Helmet
- CORS allowlist (`FRONTEND_ORIGIN` / `CLIENT_URL`), credentials enabled, no `origin: *`
- Zod env and request validation
- Structured errors without stack traces in API responses
- Log redaction for password/secret/token/URI fields
- Rate limiting on authentication endpoints
- Audit log foundation
- Secure cookie flags

## Required in later phases / production decisions

- Object storage for student documents (no large files in MongoDB)
- Production email delivery for password reset (**BLOCKED — PRODUCTION DECISION REQUIRED**)
- Browser E2E runner (**BLOCKED — PRODUCTION DECISION REQUIRED**)
- SPA Content-Security-Policy on the static host / reverse proxy (**BLOCKED — PRODUCTION DECISION REQUIRED**)

## Phase 9 additions

- Global and tighter auth/upload/export rate limits
- Access tokens invalidated after password change (`passwordChangedAt`)
- Slim health endpoints (no collection inventory)
- Request IDs on error responses; HTTP access logs without query strings or secrets
- Excel magic-byte check, formula neutralization on export, escaped admin institute search


## Content

Do not invent government orders, coverage amounts, or legal text. Use `TODO: VERIFY OFFICIAL CONTENT` when source material is missing.

## Old production frontend

Do not copy compiled JavaScript from svyuvasuraksha.org. The old bundle also contains an unrelated third-party media URL; it must not be carried forward.
