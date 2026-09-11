# Workflow architecture

No new conflicting statuses. Timelines are **AuditLog** rows for an entity id.

Institute: `COLLEGE_SIGNUP` → `INSTITUTE_APPROVED` / `INSTITUTE_REJECTED` → `INSTITUTE_STATUS_CHANGED`.

Student: `STUDENT_CREATED` / `STUDENT_UPDATED` / `STUDENT_EXCEL_IMPORTED`.

Insurance, documents, payments, reviews, e-cards: HTTP state machines are still not live. Reminders only look at **stored** status strings.

APIs: `GET /api/admin/institutes/:id/timeline`, `GET /api/admin/students/:id/timeline`, `GET /api/college/students/:id/timeline` (own institute).
