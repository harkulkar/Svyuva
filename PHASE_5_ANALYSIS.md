# Phase 5 analysis — Student management & Excel import

**Date:** 8 September 2026  
**Scope:** Student records for an institute, college CRUD, Excel template/upload/preview/import, basic admin visibility.  
**Out of scope:** Full admin dashboard, documents, insurance, e-card, payments, production data migration (Phases 6–8).

This document is not a government order.

---

## 1. Existing relationships (Phase 4)

```
University → Institute → COLLEGE User
```

College APIs already use `req.authUser.instituteId` (also aliased as `req.user`). Phase 5 adds:

```
University → Institute → Student
```

Every student stores `instituteId` and `universityId`. College never supplies those IDs; they are taken from the authenticated college user and their institute.

---

## 2. Official student format

Inspected:

- `PROJECT_ANALYSIS.md` — live routes `/student`, `/students-list/`, `/uploadData`; PHP `displayAllStud.php`, Excel errors under `/uploads1/studentExcel/`
- Workspace — **no** official SVYSY student Excel template
- Public site assets — claim PDFs only, not a student upload template

**Decision:** Use the Phase 5 specified field set. Column headers are documented below and marked **TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT**. Terminology from the live portal (Student, Enrollment, Upload Data) is preserved where known.

---

## 3. Student data structure

| Field | Required | Notes |
|-------|----------|--------|
| `instituteId` | yes | From authenticated college / institute record |
| `universityId` | yes | Copied from the institute, never from the client |
| `studentId` | yes | College-assigned identifier |
| `enrollmentNumber` | yes | |
| `rollNumber` | yes | |
| `firstName`, `lastName` | yes | |
| `middleName` | no | |
| `gender` | yes | Enum (master data) |
| `dateOfBirth` | yes | Date |
| `mobile` | yes | Indian 10-digit |
| `email` | no | |
| `course` | yes | Free text until official course list exists |
| `stream` | no | |
| `year` | yes | Enum |
| `semester` | no | Enum 1–8 |
| `academicYear` | yes | `YYYY-YY` e.g. `2025-26` |
| `address` | no | |
| `parentName`, `parentMobile` | no | |
| `category` | no | Enum |
| `status` | yes | `ACTIVE` \| `INACTIVE` (default ACTIVE) |

No extra statuses. Soft-deactivate via `INACTIVE`. **No hard delete** in Phase 5 (not confirmed as a live workflow).

---

## 4. Duplicate rules

Official uniqueness was not documented. Institute-scoped uniqueness is the safe college-portal rule:

| Key | Scope |
|-----|--------|
| `studentId` | unique per `instituteId` |
| `enrollmentNumber` | unique per `instituteId` |
| `rollNumber` | unique per `instituteId` + `academicYear` |

They are **not** globally unique across colleges.

Excel duplicates: same keys within the file **or** already in that institute’s collection. Those rows are not imported.

---

## 5. Workflow

**Manual:** Add → validate → insert (`STUDENT_CREATED`). Edit/view only if `student.instituteId === req.authUser.instituteId`. List is paginated and filtered server-side.

**Excel:** Download template → upload `.xlsx` → parse/validate/detect duplicates → preview (no insert) → Import valid records → summary + optional error workbook. `instituteId` never taken from the sheet.

---

## 6. APIs

College (auth + COLLEGE):

- `GET /api/college/students`
- `GET /api/college/students/:id`
- `POST /api/college/students`
- `PATCH /api/college/students/:id`
- `PATCH /api/college/students/:id/status`
- `GET /api/college/students/template`
- `POST /api/college/students/upload`
- `POST /api/college/students/import`
- `GET /api/college/students/import/:jobId/errors`

Admin (auth + ADMIN):

- `GET /api/admin/students`
- `GET /api/admin/students/:id`

---

## 7. Indexes

- unique `{ instituteId, studentId }`
- unique `{ instituteId, enrollmentNumber }`
- unique `{ instituteId, academicYear, rollNumber }`
- `{ instituteId, status }`
- `{ universityId, academicYear }`
- `{ instituteId, mobile }`
- `{ instituteId, email }`

Upload jobs: `{ instituteId, expiresAt }` with TTL on `expiresAt`.

---

## 8. Security

College queries always `{ instituteId: req.authUser.instituteId }`. Query/body/Excel `instituteId` ignored. Cross-institute get/edit returns **404**. Admin may list/filter all students but Phase 5 does not add student edit/delete for admin.

Excel: memory parse only; original file not stored in MongoDB. Parsed valid rows kept on an upload job for one hour.

---

## 9. Import process

1. Multer, size `MAX_EXCEL_FILE_SIZE_MB` (default 5), rows `MAX_EXCEL_ROWS` (default 2000).
2. First sheet, exact template headers; extra/missing/duplicate columns rejected.
3. Row validation + file-level and DB duplicate detection.
4. Preview counts; user confirms import.
5. `insertMany` of valid rows (partial import). Summary: imported / skipped / failed / duplicates.

---

## 10. Dashboard

College: total / active / inactive student counts from MongoDB.  
Admin: add total students count only (not the Phase 6 dashboard).
