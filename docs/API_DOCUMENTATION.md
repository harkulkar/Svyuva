# API documentation

Base URL (development): `http://localhost:4000`

All JSON responses use:

```json
{ "success": true, "message": "…", "data": {} }
```

or

```json
{ "success": false, "message": "Readable message", "code": "ERROR_CODE" }
```

## Phase 1

### GET `/`

Returns service name and health path.

### GET `/api/health`

Public liveness. Safe payload only (`status`, `database.connected`). No URIs, env, or collection lists.

### GET `/api/health/db`

Database ping. HTTP 503 when MongoDB is unreachable. Same safe shape.

### GET `/api/admin/system-health`

ADMIN only. Version, DB ping time, storage/email/job summaries, uptime, environment name. Never secrets.

### GET `/api/admin/storage-health`

ADMIN only. Document metadata counts. No private file URLs.

### GET `/api/admin/support`

ADMIN only. Search users/institutes/students plus recent failed operations.

### GET `/api/admin/login-activity`

ADMIN only. Login success/failure from audit logs.

### GET `/api/admin/accounts/inactive`

ADMIN only. Review list; does **not** auto-disable.

### POST `/api/admin/corrections`

ADMIN only. Allow-listed field correction with reason; writes `DATA_CORRECTION` audit.

## Phase 3 — Authentication


See [API_AUTH.md](./API_AUTH.md) for request/response details.

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/login` | Public, rate limited |
| POST | `/api/auth/logout` | Optional |
| GET | `/api/auth/me` | Required |
| POST | `/api/auth/signup` | Public, rate limited |
| POST | `/api/auth/forgot-password` | Public, rate limited |
| POST | `/api/auth/reset-password` | Public, rate limited |
| POST | `/api/auth/refresh` | Refresh cookie |
| GET | `/api/auth/universities` | Public |
| GET | `/api/admin/ping` | ADMIN |
| GET | `/api/college/ping` | COLLEGE |

## Phase 4 — College registration

See [COLLEGE_PORTAL.md](./COLLEGE_PORTAL.md).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/universities` | Public (ACTIVE) |
| GET | `/api/master-data` | Public |
| GET | `/api/college/profile` | COLLEGE |
| PATCH | `/api/college/profile` | COLLEGE |
| GET | `/api/college/dashboard` | COLLEGE |
| GET | `/api/admin/dashboard` | ADMIN |
| GET | `/api/admin/universities` | ADMIN |
| POST | `/api/admin/universities` | ADMIN |
| GET | `/api/admin/institutes` | ADMIN |
| GET | `/api/admin/institutes/pending` | ADMIN |
| GET | `/api/admin/institutes/:id` | ADMIN |
| PATCH | `/api/admin/institutes/:id/approve` | ADMIN |
| PATCH | `/api/admin/institutes/:id/reject` | ADMIN |

## Phase 5 — Students and Excel import

See [STUDENT_API.md](./STUDENT_API.md).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/college/students` | COLLEGE |
| GET | `/api/college/students/meta` | COLLEGE |
| GET | `/api/college/students/template` | COLLEGE |
| POST | `/api/college/students/upload` | COLLEGE |
| POST | `/api/college/students/import` | COLLEGE |
| GET | `/api/college/students/import/:jobId/errors` | COLLEGE |
| POST | `/api/college/students` | COLLEGE |
| GET | `/api/college/students/:id` | COLLEGE |
| PATCH | `/api/college/students/:id` | COLLEGE |
| PATCH | `/api/college/students/:id/status` | COLLEGE |
| GET | `/api/admin/students` | ADMIN |
| GET | `/api/admin/students/:id` | ADMIN |

## Phase 6 — Admin portal

See [ADMIN_PORTAL.md](./ADMIN_PORTAL.md).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/admin/dashboard` | ADMIN |
| GET | `/api/admin/search` | ADMIN |
| GET | `/api/admin/reports` | ADMIN |
| GET | `/api/admin/audit-logs` | ADMIN |
| GET/PATCH | `/api/admin/profile` | ADMIN |
| GET | `/api/admin/users` | ADMIN |
| PATCH | `/api/admin/users/:id/status` | ADMIN |
| GET | `/api/admin/universities/options` | ADMIN |
| GET/POST | `/api/admin/universities` | ADMIN |
| GET/PATCH | `/api/admin/universities/:id` | ADMIN |
| PATCH | `/api/admin/universities/:id/status` | ADMIN |
| GET | `/api/admin/registrations` | ADMIN |
| GET | `/api/admin/institutes/export` | ADMIN |
| PATCH | `/api/admin/institutes/:id/status` | ADMIN |
| GET | `/api/admin/students/export` | ADMIN |
| PATCH | `/api/admin/students/:id/status` | ADMIN |
| POST | `/api/auth/change-password` | Authenticated |

## Later phases (not implemented yet)

Planned routes (do not call them yet):

- Document, enrollment, and insurance routes
- Full payment and e-card workflows (Phase 7)

This file will be updated when each route is implemented.
