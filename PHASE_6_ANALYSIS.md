# Phase 6 analysis — Admin dashboard & administration

**Date:** 8 September 2026  
**Scope:** Admin portal, statistics, university/institute/student administration, approvals, reports, audit logs, admin users, profile, password change.  
**Out of scope:** Insurance, documents, e-card, payments, review workflows (Phase 7); production data migration (Phase 8).

This document is not a government order.

---

## 1. Admin requirements

Administrators manage the scheme’s master data and college onboarding. They see **all** universities, institutes, students, and registrations. College users never use Admin APIs.

Frontend route hiding is not authorization. Every `/api/admin/*` route already uses `authenticate` + `requireRole('ADMIN')`; new routes follow the same pattern.

---

## 2. Existing admin APIs (Phase 4–5)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/admin/dashboard` | Counts only; wrapped as `{ stats }` |
| GET/POST | `/api/admin/universities` | List all / create |
| GET | `/api/admin/institutes` | Search, filters, pagination |
| GET | `/api/admin/institutes/pending` | PENDING only |
| GET | `/api/admin/institutes/:id` | Detail |
| PATCH | `/api/admin/institutes/:id/approve` | PENDING → ACTIVE + users ACTIVE |
| PATCH | `/api/admin/institutes/:id/reject` | PENDING → REJECTED + users INACTIVE |
| GET | `/api/admin/students` | Search/filter/pagination |
| GET | `/api/admin/students/:id` | View only |

Phase 6 extends these. Approval/rejection behaviour is preserved.

---

## 3. Existing models

`User`, `University`, `Institute`, `Student`, `AuditLog`, `UploadJob`, `RefreshToken`. No new collections except using `auditLogs` more fully. Notifications remain dashboard-derived (pending count, recent failures), not a separate store.

---

## 4. Dashboard statistics

`GET /api/admin/dashboard` returns counts at `data` root (Phase 6 contract):

universities, institutes, activeInstitutes, pendingInstitutes, rejectedInstitutes, students, activeStudents, inactiveStudents.

Plus: `recentActivity`, `charts`, `notifications.pendingRegistrations`.

Counts use aggregations/`countDocuments` in parallel — not hardcoded.

---

## 5. Institute status state machine

```
PENDING  → ACTIVE    (approve)
PENDING  → REJECTED  (reject, reason required)
ACTIVE   → INACTIVE  (deactivate)
INACTIVE → ACTIVE    (activate)
REJECTED → (no further transitions; record kept)
```

Invalid transitions return `409 INVALID_STATUS`. Deactivate/activate updates linked COLLEGE user status to match (INACTIVE / ACTIVE). Approve/reject remain limited to PENDING.

---

## 6. University management

Search, status filter, pagination. Create, edit (name/code/shortName), ACTIVE/INACTIVE. **No delete.** Inactive universities stay in the database; public signup lists ACTIVE only.

---

## 7. Student management (admin)

Reuse Phase 5 list/detail. Add course filter in the UI (API already supports it). Admin may set student status (`ACTIVE`/`INACTIVE`) but **cannot** change `instituteId` or `universityId`.

---

## 8. Search / filters / pagination

Server-side only. Dedicated `GET /api/admin/search?q=` returns capped institute and student hits (not a full-collection dump). List endpoints keep `page`/`limit` with max limit 100. Nested `pagination` object on new lists.

---

## 9. Reports and export

Reports use MongoDB aggregations. Exports (CSV/xlsx) are generated on the server, respect admin auth and current filters, omit parent details and secrets, and cap rows (`MAX_EXPORT_ROWS`, default 5000).

---

## 10. Audit

New page and `GET /api/admin/audit-logs`. Metadata is sanitized (no password/token/hash fields). Extra indexes: `{ userId, createdAt }`, `{ entity, createdAt }`.

New/used actions include: `INSTITUTE_APPROVED`, `INSTITUTE_REJECTED`, `INSTITUTE_STATUS_CHANGED`, `UNIVERSITY_CREATED`, `UNIVERSITY_UPDATED`, `UNIVERSITY_STATUS_CHANGED`, `STUDENT_STATUS_CHANGED`, `USER_STATUS_CHANGED`, `PASSWORD_CHANGED`, `ADMIN_PROFILE_UPDATED`.

---

## 11. Users and last-admin rule

List users; activate/deactivate. Cannot deactivate the last **ACTIVE ADMIN**. Role is not changeable via API. College users cannot become admin.

---

## 12. Profile and password

Admin profile: name and phone only. `POST /api/auth/change-password` for any authenticated user (current password required). Audit `PASSWORD_CHANGED` without secrets.

---

## 13. Security

College isolation from Phases 4–5 is unchanged. College cannot approve itself (no access to approve APIs). Unauthenticated `/admin` is a frontend redirect; APIs return 401.

---

## 14. Indexes added this phase

- `auditLogs`: `{ userId: 1, createdAt: -1 }`, `{ entity: 1, createdAt: -1 }`
- Existing institute/student/university indexes already cover list filters
