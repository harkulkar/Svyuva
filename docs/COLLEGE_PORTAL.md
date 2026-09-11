# College portal

This describes Phase 4 college registration, approval, and the college portal foundation. It is not a government order.

## Signup flow

1. College opens `/signup` ([live field labels](https://app.svyuvasuraksha.org/sign-up)).
2. Selects an **ACTIVE** university from `GET /api/universities` (no public university create).
3. Completes dropdowns: Exclusive Type, Location Type, Minority Type, Linguistic Type, College Type, District, JD Region; plus institute name, address, taluka, contacts, principal, password.
4. `POST /api/auth/signup` forces `role=COLLEGE` and `status=PENDING` on both User and Institute.
5. Message: registration submitted, pending approval.
6. PENDING users cannot log in.

Universities are **not** invented in code. An administrator adds them at `/admin/universities`. The production list is imported during data migration.

Dropdown option lists are configurable master data (`GET /api/master-data`). Exact official option strings (except Maharashtra district names) are marked `TODO: VERIFY OFFICIAL MASTER DATA`.

## Approval flow

Admin (`ADMIN` only):

- `GET /api/admin/institutes` — search, status/university/district filters, pagination
- `GET /api/admin/institutes/pending`
- `GET /api/admin/institutes/:id`
- `PATCH /api/admin/institutes/:id/approve` — Institute and linked users become `ACTIVE`
- `PATCH /api/admin/institutes/:id/reject` with `{ "reason": "…" }` — Institute `REJECTED`, users `INACTIVE`

Rejected records are kept. Only `PENDING` registrations can be approved or rejected.

## User / Institute relationship

```
University → Institute → COLLEGE User → Students
```

The college user has `user.instituteId`. College APIs use `req.authUser.instituteId` (also available as `req.user`). Client-supplied `instituteId` is ignored.

## Data isolation

College A cannot read College B. Profile, dashboard, and student queries filter by the authenticated user's institute. Admin APIs require the ADMIN role.

## Statuses

| Status | Login | Portal |
|--------|-------|--------|
| PENDING | No (“Your account is pending approval.”) | No |
| ACTIVE | Yes | Yes |
| INACTIVE / REJECTED | No (“Your account is inactive.”) | No |

## Roles

- `ADMIN` — all institutes/universities, approve/reject, dashboard counts from the database
- `COLLEGE` — own profile, dashboard, and students; cannot change role, status, instituteId, or universityId

## College APIs

| Method | Path |
|--------|------|
| GET | `/api/college/profile` |
| PATCH | `/api/college/profile` (address, mobile, contact numbers, principal name) |
| GET | `/api/college/dashboard` |
| GET | `/api/college/students` |
| POST | `/api/college/students` |
| POST | `/api/college/students/upload` |

Student counts on the dashboard come from MongoDB (`total`, `active`, `inactive`). See [STUDENT_API.md](./STUDENT_API.md).
