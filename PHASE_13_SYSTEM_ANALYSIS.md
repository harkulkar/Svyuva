# Phase 13 system analysis

Date: 2026-09-09  
Scope: extend the Phase 1–12 rebuild. Do not replace the portal.

## Current architecture

- Frontend: React 18 + Vite + TypeScript + Tailwind (`frontend/`).
- Backend: Express + Mongoose (`backend/`). Database name **SVYSY**.
- Auth: HttpOnly JWT cookies. Roles **ADMIN** and **COLLEGE**. Institute scope is taken from the session (`user.instituteId`), never from a client-supplied `instituteId` for college data.
- AI (Phase 12): optional (`AI_PROVIDER=none` by default). Portal operations must not depend on it.

## Existing models (relevant)

| Collection | Role today |
| --- | --- |
| `users`, `universities`, `institutes`, `students` | Live HTTP APIs |
| `insurance`, `payments`, `documents`, `reviews`, `ecards` | MongoDB metadata only; Phase 7 HTTP APIs still flagged off |
| `uploads` | Excel preview jobs |
| `auditLogs` | Append-only audit (approvals, exports, AI, corrections) |
| `notifications` | **Stub only** (`userId`, `title`, `body`, `readAt`) — unused by APIs |
| `settings` | Bootstrap record only |
| `knowledgeDocuments` / AI collections | Phase 12 |

Insurance, payment, document, review, and e-card **statuses are stored as free strings** (often `UNKNOWN` for migrated rows). Analytics must **group existing values**, not invent official status tables.

## Existing dashboards and reports

- `GET /api/admin/dashboard` — university/institute/student counts, simple bar charts, recent audit activity, operations snapshot.
- `GET /api/admin/reports` — aggregations by university/district/academic year + scheme-module record counts.
- `GET /api/admin/institutes/export` and `/students/export` — CSV/XLSX with `MAX_EXPORT_ROWS`, audit, export rate limit.
- `GET /api/college/dashboard` — own institute status + student totals only.

UI: `/admin` and `/college` use `SimpleBars`. No date-range analytics API. No notification bell.

## Existing notification / email / jobs

- **Notifications:** collection exists; no list/read/unread/announcement APIs.
- **Email:** `emailService.sendPasswordResetEmail` logs and increments a failure counter if SMTP is unset. **No transport implementation.** App already continues without SMTP.
- **Jobs:** none except MongoDB TTL on Excel previews and refresh tokens. System health reports `backgroundProcessors: none`.
- **Settings:** no admin-editable reminder intervals (only env flags such as `MAINTENANCE_MODE`).

## Existing workflows (do not invent new statuses)

- Institute: signup `PENDING` → admin `ACTIVE` / `REJECTED` → later `INACTIVE`.
- Student: create/import `ACTIVE`/`INACTIVE`; Excel validate then confirm import.
- Insurance / documents / payment / review / e-card: **no live HTTP state machine**. Timeline and reminders may only use stored documents and audit logs.

## Gaps Phase 13 will fill (without duplicating)

1. Filtered admin analytics (date range, university, institute) via aggregation.
2. College dashboard extras **scoped to session instituteId**.
3. In-app notification centre + bell, extending the existing `notifications` collection.
4. Admin announcements with audience targeting and batched fan-out (unique keys to prevent duplicates).
5. Notification templates (IN_APP / EMAIL) with allow-listed `{{variables}}`.
6. Email send/log abstraction on top of existing `emailService` — no crash when SMTP is missing; no credentials in the database.
7. In-process scheduled jobs (idempotent `jobRuns`) + `/admin/system-jobs`.
8. Configurable reminder days (env + non-secret `settings`).
9. Timeline from **AuditLog** (no fabricated history).
10. Filtered report exports (admin all; college own institute). CSV/XLSX already supported; PDF not added (no PDF library).
11. Optional AI insight endpoint that **only summarises backend-computed stats**.

## Implementation plan

- Add models/fields; keep existing dashboard JSON backward compatible (extra fields only).
- New routes under `/api/admin/*`, `/api/college/*`, `/api/notifications`.
- Hook ACCOUNT_APPROVED / REJECTED and STUDENT_UPLOAD_COMPLETED into existing approve/reject/import services.
- Start scheduler from `server.ts` only when not in test.
- Tests for isolation, announcement auth, job idempotency, email skip, analytics filters, AI insights RBAC.
- STOP after Phase 13.
