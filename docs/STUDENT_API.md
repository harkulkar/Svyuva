# Student API

Phase 5 college and admin student endpoints. All JSON responses use `{ success, message, data }` or `{ success: false, message, code }`.

College student queries always use `req.authUser.instituteId`. Query, body, and Excel `instituteId` values are not trusted.

**TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT** for Excel column names and student master lists.

---

## Authorization

| API prefix | Auth | Role |
|------------|------|------|
| `/api/college/students*` | Required | `COLLEGE` |
| `/api/admin/students*` | Required | `ADMIN` |

Unauthenticated requests return `401 UNAUTHORIZED`. Wrong role returns `403`. A college reading or editing another institute’s student returns `404 NOT_FOUND`.

---

## Pagination

`page` (default 1), `limit` (default 20, **maximum 100**).

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 500, "totalPages": 25 }
  }
}
```

---

## College APIs

### GET `/api/college/students/meta`

Gender, year, semester, category, status, and Excel column lists.

### GET `/api/college/students`

Server-side search (`q`: student ID, enrollment, roll, name, mobile, email) and filters: `academicYear`, `course`, `stream`, `year`, `semester`, `gender`, `status`.

List fields are a summary projection, not full documents.

### GET `/api/college/students/:id`

Full student record for the authenticated college’s institute.

### POST `/api/college/students`

Create a student. `instituteId` and `universityId` come from the authenticated college. Extra ownership fields are rejected.

Duplicates (same institute):

- `studentId`
- `enrollmentNumber`
- `academicYear` + `rollNumber`

Returns `409` when a duplicate is found.

### PATCH `/api/college/students/:id`

Update allowed student fields. Cannot change institute ownership.

### PATCH `/api/college/students/:id/status`

Body: `{ "status": "ACTIVE" | "INACTIVE" }`. Soft-deactivate; there is no hard-delete API in this phase.

### GET `/api/college/students/template`

Downloads `SVYSY_Student_Upload_Template.xlsx`.

### POST `/api/college/students/upload`

`multipart/form-data` field `file` (`.xlsx` or `.xls`). Parses and validates only. Does not insert rows.

Limits (environment):

- `MAX_EXCEL_FILE_SIZE_MB` (default 5)
- `MAX_EXCEL_ROWS` (default 2000)
- `MAX_EXCEL_PARSE_MS` (default 60000)

Response includes `jobId`, `totalRows`, `valid`, `invalid`, `duplicates`, `issues`, and a short `preview`.

### POST `/api/college/students/import`

Body: `{ "jobId": "…" }`. Inserts previously validated rows for **this** college. Partial import: valid rows are inserted; invalid/duplicate rows stay skipped.

### GET `/api/college/students/import/:jobId/errors`

Downloads `student_import_errors.xlsx` (row number, identifier, reason).

---

## Admin APIs

View only.

### GET `/api/admin/students`

Same search/pagination as college, plus `instituteId` and `universityId` filters. Admin may list all students.

### GET `/api/admin/students/:id`

Student details including institute and university names. No edit or delete in Phase 5.

---

## Validation

Frontend and backend both validate. Backend is authoritative.

- Required identifiers and names
- Indian 10-digit mobile (`[6-9]…`)
- Optional email
- Date of birth (valid, not in the future, year from 1940)
- Academic year `YYYY-YY` (example `2025-26`)
- Enum gender, year, semester, category, status
- String length limits

Malformed Excel files are rejected before import (missing columns, unexpected columns, duplicate headings, empty/corrupt/oversized files, too many rows).

---

## Error codes (examples)

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | No valid session |
| `VALIDATION_ERROR` | Invalid fields or query |
| `NOT_FOUND` | Student or upload job not visible |
| `DUPLICATE_STUDENT_ID` / `DUPLICATE_ENROLLMENT` / `DUPLICATE_ROLL` | Identifier already used in this institute |
| `FILE_TOO_LARGE` | Excel over size limit |
| `TOO_MANY_ROWS` | Excel over row limit |
| `MISSING_COLUMNS` / `UNEXPECTED_COLUMNS` | Template mismatch |
| `NO_FILE` | Upload without a file |
| `ALREADY_IMPORTED` | Job already imported |

Stack traces are never returned to the client.
