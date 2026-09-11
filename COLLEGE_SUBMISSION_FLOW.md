# College submission flow

Draft Excel work is **not** a submission. Only `POST /api/college/submissions/:id/submit` after confirm + complete backend premium sets `SUBMITTED`.

## Flow

1. College dashboard → **New submission** → `/college/submissions/new`
2. Institute and university come from the authenticated session. Academic year is selected from configurable `academicYears.*` (`YYYY-YY`, display label `YYYY-YYYY`).
3. Draft `DataSubmission` with unique `submissionNumber` (configurable prefix, default `SVYS-YYYY-000001` — **not official**).
4. Upload Excel (Phase 5 columns). Validate on the server. Preview is paginated.
5. **Confirm student data** writes `Student` rows with `instituteId`, `universityId`, `submissionId`, `academicYear`. Duplicates use existing unique keys; they are not silently imported.
6. **Calculate premium** on the backend only.
7. Review → confirm dialog → submit. Status `SUBMITTED`, `submittedAt` set, audit + admin notification.
8. After submit the college cannot replace Excel, change students, premium, or status unless admin sets `CORRECTION_REQUIRED`.

## Statuses

`DRAFT` → `VALIDATING` (transient) → `VALIDATED` → `PREMIUM_CALCULATED` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` | `REJECTED` | `CORRECTION_REQUIRED` (then college edits, revalidate, recalc, resubmit; versions retained).

## Security

- College A cannot `GET` college B submission, students, premium, or error workbook.
- `instituteId` / `universityId` / `premium` / `studentCount` / `status` from the client are ignored.
- Double submit is idempotent (`findOneAndUpdate` on allowed statuses).
- Notifications are sent after the status write so email failure does not roll back submit.

Existing `/college/students/upload` remains a roster import, not this business submission.
