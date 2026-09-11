# Phase 3 analysis — Authentication & user management

**Date:** 7 September 2026  
**Scope:** Login, college signup, JWT sessions, RBAC, password reset. No college/admin dashboards.

This document records the existing system and the decisions for Phase 3. It is not a government order.

---

## 1. Current frontend architecture

| Item | Location / notes |
|------|------------------|
| Stack | React 18, Vite, TypeScript, React Router 6, Tailwind, Axios, React Hook Form, Zod |
| Entry | `frontend/src/main.tsx` → `App.tsx` → `routes/publicRoutes.tsx` |
| Public layout | `components/layout/PublicLayout.tsx` (Header + Footer) |
| Header / Footer | Phase 2 government portal chrome; Login/Sign Up always shown |
| Auth pages | Placeholders only: `pages/auth/AuthPlaceholder.tsx` at `/login` and `/signup` |
| API client | `services/api.ts` Axios instance, `VITE_API_URL`, no credentials yet |
| State | No auth context |

Phase 2 public routes remain unchanged.

---

## 2. Current backend architecture

| Item | Location / notes |
|------|------------------|
| Stack | Express, TypeScript, Mongoose, Helmet, CORS, Zod env, bcryptjs, jsonwebtoken (deps present, unused) |
| Entry | `backend/src/server.ts` builds the app and listens (will split `app.ts` for tests) |
| Routes | `GET /`, `GET /api/health` only |
| Auth middleware | Placeholder file, not wired |
| Errors | `{ success, message, code }` via `apiResponse.ts` |
| Hashing | **bcryptjs** is already a dependency. Argon2 is not. Phase 3 uses bcryptjs (Windows-safe). |

---

## 3. Current database setup

- Atlas database **`SVYSY`** via `MONGODB_URI` / `MONGODB_DB_NAME`
- Collections exist (empty shells) including `users`, `institutes`, `universities`, `auditLogs`
- No Mongoose user schema yet

---

## 4. Current routing

Public Phase 2 routes stay. Auth placeholders at `/login`, `/signup`, `/sign-up` → `/signup`.

Phase 3 adds: `/forgot-password`, `/reset-password/:token`, `/admin`, `/college`.

---

## 5. Existing login/signup UI

Placeholder copy only: “Authentication is not part of Phase 2.” Replaced in this phase with real forms in the same government visual language (navy / saffron, Header/Footer).

---

## 6. What will change

| Change | Why |
|--------|-----|
| Split `app.ts` / `server.ts` | Tests can import the app without listening |
| User, Institute, University, RefreshToken, AuditLog models | Signup + session + audit |
| Auth APIs + middleware + rate limits | Spec |
| Cookie-based tokens + AuthContext | Spec |
| Header shows dashboard + logout when authenticated | Spec |
| `.env.example` JWT access/refresh vars | Spec |
| **Not changed** | Public content pages, Mongo connection helper, Helmet/CORS baseline |

---

## 7. Authentication flow

```
Login form
  → POST /api/auth/login  (rate limited)
  → verify email + bcrypt compare
  → PENDING / INACTIVE rejected after password match
  → access JWT (short) + refresh JWT/random (long) as HttpOnly cookies
  → audit LOGIN_SUCCESS
  → GET /api/auth/me on app load (credentials)
  → redirect ADMIN → /admin, COLLEGE → /college

Logout
  → POST /api/auth/logout
  → delete refresh token record, clear cookies, audit LOGOUT

Access expired
  → POST /api/auth/refresh using refresh cookie
  → new access cookie; 401 if refresh invalid
```

**Token strategy (chosen):**

- **Access token:** JWT in HttpOnly cookie, ~15 minutes (`JWT_ACCESS_EXPIRES_IN`)
- **Refresh token:** opaque random token, SHA-256 stored in `refreshTokens`, HttpOnly cookie, ~7 days
- **Not** stored in `localStorage`
- JWT payload: `{ userId, role }` only
- Cookies: `HttpOnly`, `Secure` in production, `SameSite=strict` in production; development uses `SameSite=none; Secure` so `localhost:5173` can call `localhost:4000` with credentials. Vite proxy remains available if `VITE_API_URL` is empty.

---

## 8. Signup / account status decision

Live workflow for automatic vs pending activation was **not confirmed** from an official operator document.

**Decision:** college signup creates:

- `User.role = COLLEGE` (never ADMIN)
- `User.status = PENDING`
- matching `Institute.status = PENDING`
- University **find-or-create by name** (no invented university master list)

Message: *Registration submitted successfully. Your account is pending approval.*

PENDING users cannot log in. Password-correct pending accounts see a pending/inactive style message. Unknown email / wrong password always: *Invalid email or password.* (no email enumeration on login or forgot-password).

---

## 9. Database collections (Phase 3)

### `users`

`name`, `email` (unique), `passwordHash`, `role` (`ADMIN` \| `COLLEGE`), `phone`, `status` (`ACTIVE` \| `INACTIVE` \| `PENDING`), `instituteId`, `universityId`, `passwordResetTokenHash`, `passwordResetExpires`, `lastLoginAt`, timestamps.

Indexes: unique email; role; status; instituteId; universityId.

### `institutes`

Signup profile fields (universityId, name, exclusiveType, locationType, minorityType, linguisticType, address, district, taluka, jdRegion, email, mobile, contactNumber1, contactNumber2, principalName, collegeType, status). Full institute admin UI is Phase 4.

### `universities`

`name` (unique, case-insensitive), `status`. Created on signup if missing.

### `refreshTokens`

`userId`, `tokenHash`, `expiresAt`.

### `auditLogs`

`userId`, `action`, `entity`, `entityId`, `ipAddress`, `userAgent`, `metadata`, `createdAt`. No passwords or reset tokens in metadata.

---

## 10. API endpoints (Phase 3)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | Public, rate limited |
| POST | `/api/auth/logout` | Auth optional (clears cookies anyway) |
| GET | `/api/auth/me` | Required |
| POST | `/api/auth/signup` | Public, rate limited |
| POST | `/api/auth/forgot-password` | Public, rate limited |
| POST | `/api/auth/reset-password` | Public, rate limited |
| POST | `/api/auth/refresh` | Refresh cookie |
| GET | `/api/auth/universities` | Public (names for signup select) |
| GET | `/api/admin/ping` | ADMIN |
| GET | `/api/college/ping` | COLLEGE |

Response envelope remains Phase 1:

```json
{ "success": true, "message": "…", "data": { "user": { "id", "name", "email", "role", "status" } } }
```

`passwordHash` is never returned.

---

## 11. Security considerations

- bcryptjs cost factor 12
- Zod validation on all auth bodies
- Rate limits on login / signup / forgot / reset
- Helmet + CORS allowlist (`FRONTEND_ORIGIN` / `CLIENT_URL`), credentials true, no `origin: *`
- Role checks only on the server (`requireRole`)
- Seed admin refused unless `ALLOW_ADMIN_SEED=true` and not production (or explicit override)
- EmailService abstraction: development logs reset URL to **server console only**
- Forgot-password response is always generic
- College signup creates institute + user sequentially (not a Mongo multi-document transaction). Implicit collection creation inside a transaction fails on Atlas (`catalog changes`). If user creation fails after institute insert, the institute row is deleted.

---

## 12. Out of scope

College dashboard, students, Excel, insurance, e-card, payments, documents, admin reports, migration, production deploy.
