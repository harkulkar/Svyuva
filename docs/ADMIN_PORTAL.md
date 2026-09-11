# Admin portal

Phase 6 administrator portal. This is not a government order.

Only `ADMIN` sessions may use these pages and APIs. Frontend menu hiding is not authorization; the API uses `authenticate` + `requireRole('ADMIN')`.

College users continue to see only their own institute and students (`req.authUser.instituteId`).

---

## Dashboard

`/admin` and `GET /api/admin/dashboard`.

Counts from MongoDB: universities, institutes (total/active/pending/rejected), students (total/active/inactive). Also: pending-registration notice, recent audit activity, operational cards (system/database/storage/errors), and simple bar charts. Search on the dashboard uses `GET /api/admin/search`.

---

## Universities

`/admin/universities`

Paginated list, search, status filter, create, edit, activate/deactivate. Universities are not deleted.

APIs: `GET/POST /api/admin/universities`, `GET /api/admin/universities/options`, `GET/PATCH /api/admin/universities/:id`, `PATCH /api/admin/universities/:id/status`.

---

## Institutes and registrations

`/admin/institutes` — all institutes, filters, pagination, CSV/Excel export.  
`/admin/registrations` — PENDING registrations.  
`/admin/institutes/:id` and `/admin/registrations/:id` — detail, student counts, actions.

Status machine:

- PENDING → ACTIVE (approve) or REJECTED (reject with reason)
- ACTIVE ↔ INACTIVE (activate/deactivate)
- REJECTED is kept; no further transition

Approve sets linked college users to ACTIVE. Reject and deactivate set them to INACTIVE.

---

## Students

`/admin/students` — all students, search/filters (including course), export.  
`/admin/students/:id` — detail; status may be changed. Ownership (`instituteId` / `universityId`) cannot be changed.

---

## Reports and export

`/admin/reports` — aggregations: institutes by university/district; students by university/institute/academic year.

Exports: `GET /api/admin/institutes/export`, `GET /api/admin/students/export` (`format=csv|xlsx`). Row cap: `MAX_EXPORT_ROWS` (default 5000). Parent details and secrets are omitted.

---

## Audit logs

`/admin/audit-logs` and `GET /api/admin/audit-logs` with filters: actor, action, entity (target), entityId, userId, result, date range, pagination. There is no API to edit or delete audit rows. Passwords, hashes, and tokens are not stored or returned.

`/admin/login-activity` — login success/failure only.

---

## System health, storage, support

`/admin/system-health` — `GET /api/admin/system-health`  
`/admin/storage-health` — `GET /api/admin/storage-health`  
`/admin/support` — search plus allow-listed data corrections (`POST /api/admin/corrections`)

---

## Users, profile, password

`/admin/users` — list, activate/deactivate. The last **ACTIVE ADMIN** cannot be deactivated. Roles are not changeable.

`/admin/profile` — name and phone only.  
`POST /api/auth/change-password` — authenticated users; current password required; audit `PASSWORD_CHANGED`.

---

## Settings

`/admin/settings` links to profile, users, system health, and support. Insurance, documents, e-card, and payment HTTP APIs remain later work.
