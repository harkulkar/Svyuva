# Architecture

**Phase:** 3 (authentication)  
**Application:** Swami Vivekananda Yuva Suraksha Yojana (SVYSY)

## Overview

The system is a split frontend/backend web application:

- **Public website** — scheme information, policies, contact (Phase 2)
- **College / institute portal** — own students, documents, enrollment (Phases 3, 5–7)
- **Admin portal** — statewide data, review, reports (Phases 3–4, 6–7)

```
Browser (React + Vite)
        |
        | HTTPS / JSON  HttpOnly cookies (access + refresh)
        v
Express API (Node.js + TypeScript)
        |
        +--> MongoDB Atlas  (database: SVYSY)
        +--> Object storage (Phase 6, S3-compatible)
```

## Repositories / packages

| Package | Path | Responsibility |
|---------|------|----------------|
| Frontend | `frontend/` | UI, routing, forms, API client |
| Backend | `backend/` | REST API, authz, persistence, audit |

## Backend layout

```
backend/src/
  config/        env validation, MongoDB connection, collection names
  controllers/   request handlers
  routes/        Express routers
  models/        Mongoose schemas (from Phase 3)
  middleware/    auth, errors
  services/      domain logic
  validators/    Zod request schemas
  utils/         logging, API envelope
  server.ts      bootstrap
```

## Frontend layout

```
frontend/src/
  components/    reusable UI (Phase 2+)
  pages/         route pages
  layouts/       public / admin / college shells (Phase 2–3)
  hooks/
  services/      Axios client
  types/
  utils/
  routes/
  App.tsx
```

## Roles (Phase 3)

| Role | Access |
|------|--------|
| `ADMIN` | All institutes, students, documents, enrollments (authorized data) |
| `COLLEGE` | Only the `instituteId` stored on the authenticated user |

College APIs **must ignore** client-supplied `instituteId` query/body values.

## API envelope

Success:

```json
{ "success": true, "message": "OK", "data": {} }
```

Failure:

```json
{ "success": false, "message": "Readable message", "code": "ERROR_CODE" }
```

Stack traces are not returned in production.

## Current API (Phase 1–3)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | Public | Service name |
| GET | `/api/health` | Public | API + MongoDB + collection list |
| POST | `/api/auth/*` | See `API_AUTH.md` | Login, signup, session, password reset |
| GET | `/api/admin/ping` | ADMIN | Authz probe (dashboard in Phase 6) |
| GET | `/api/college/ping` | COLLEGE | Authz probe (dashboard in Phase 4) |

## Public website (Phase 2)

The React frontend serves the public portal plus `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`, and placeholder `/admin` and `/college` pages. Content lives in `frontend/src/data/`. Auth state is `frontend/src/context/AuthContext.tsx`.

## Database

MongoDB Atlas database **`SVYSY`**. Collections are created on first API start. See `DATABASE_SCHEMA.md`.

## Security baseline already in Phase 1

- Helmet
- CORS limited to `FRONTEND_ORIGIN`
- Secrets via environment variables
- Logger redacts password/secret/token fields
- JSON body size limit 1mb

Rate limiting, JWT cookies, RBAC, and audit logs are implemented in Phase 3. File validation and object storage remain later phases.
