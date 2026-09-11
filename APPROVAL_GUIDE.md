# APPROVAL GUIDE

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

This is an operational guide for portal administrators. It does **not** invent official Government of Maharashtra or insurer approval authorities.

## College registration

1. College signs up → Institute and user `PENDING`. College cannot log in yet.
2. Admin opens **Work queue** or **College Registrations** / institute detail.
3. Optional: **Start review** (workflow `UNDER_REVIEW`).
4. **Approve** — Institute `ACTIVE`, college users `ACTIVE`. Notification `ACCOUNT_APPROVED`.
5. **Reject** — reason required (≥ 8 characters). Record kept. Users `INACTIVE`. Notification `ACCOUNT_REJECTED`.
6. **Request correction** — reason required. Institute stays `PENDING`. College may log in **only** while workflow is `CORRECTION_REQUESTED`, edit permitted profile fields, then **Resubmit**.

Do not delete rejected applications.

## Who may act

| Action | ADMIN | COLLEGE |
| --- | --- | --- |
| START_REVIEW, APPROVE, REJECT, REQUEST_CORRECTION (registration) | Yes | No |
| RESUBMIT (after correction) | No | Own institute only |
| VERIFY payment | Yes (when payment HTTP is enabled) | Never |
| Insurance/payment/review/e-card mutations | Flagged 501 until enabled | Flagged 501 |

College cannot `PATCH` another institute, cannot set `role` / `instituteId` / `universityId` / workflow state via request body, and cannot call `/api/admin/*`.

## Review checklist

Administrators may configure `ReviewChecklistItem` rows (`active` defaults false, description `TODO: VERIFY OFFICIAL CONTENT`). Do not treat empty/inactive items as official compliance criteria. `POST /api/admin/reviews/:id/decision` is `501` while `FEATURE_REVIEW_HTTP=false`.

## Comments and history

Every major action writes `WorkflowHistory` (action, actor, from/to, reason, comments, timestamp) **and** `AuditLog`. Users cannot modify either.

## Locking

After `APPROVED`, college cannot `APPROVE`/`REJECT`/`RESUBMIT` registration. Contact fields on the college profile remain editable. Institute name/university are not college-editable. Insurance amendment (`REQUEST_CORRECTION` from `APPROVED`) is defined but HTTP-flagged.

## Bulk actions

Safe: assign selected work-queue tasks.  
**Not implemented:** bulk approve, bulk reject, bulk delete of registrations or documents.
