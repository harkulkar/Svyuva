# Phase 4 analysis — College registration & college portal

**Date:** 7 September 2026  
**Scope:** University/institute master data, college signup dropdowns, admin approval, college portal foundation, data isolation.  
**Out of scope:** Students, Excel import, insurance, e-card, payments (Phase 5+).

This document is not a government order.

---

## 1. Existing authentication (Phase 3 — keep)

| Item | Behaviour |
|------|-----------|
| Login | `POST /api/auth/login` — PENDING / INACTIVE blocked after password match |
| Session | HttpOnly access + hashed refresh cookies |
| Roles | `ADMIN`, `COLLEGE` — enforced with `authenticate` + `requireRole` |
| Request user | `req.authUser` (Phase 4 also aliases `req.user`) |
| Signup | `POST /api/auth/signup` already creates PENDING college user + institute |
| Password reset | Unchanged |

Phase 3 login messages stay: pending → “Your account is pending approval.”; inactive/rejected user → “Your account is inactive.” Rejection reason is **not** shown at login.

---

## 2. Current User model

`name`, `email` (unique), `passwordHash`, `role`, `phone`, `status` (`ACTIVE` \| `INACTIVE` \| `PENDING`), `instituteId`, `universityId`, reset fields, `lastLoginAt`.

COLLEGE users must have `instituteId`. ADMIN normally has `instituteId: null`.

---

## 3. University model (Phase 4)

Add `code` and `shortName`. Unique `nameNormalized` and unique `code` (sparse). Status `ACTIVE` \| `INACTIVE`.

**Do not seed invented universities.** Signup selects only **ACTIVE** universities from `GET /api/universities`. Admins can create universities so the dropdown can be populated. The production university list is imported in the data-migration phase.

---

## 4. Institute model (Phase 4)

Keep Phase 3 profile fields. Add:

- `code` (unique, generated if omitted)
- `nameNormalized` for duplicate checks
- `status`: `PENDING` \| `ACTIVE` \| `INACTIVE` \| `REJECTED`
- `rejectionReason`, `reviewedAt`, `reviewedBy`

References: `universityId` → University. Do not copy university name onto the institute.

---

## 5. Relationships

```
University  →  Institute  →  College User  →  Students (Phase 5)
```

College APIs load the institute with `req.authUser.instituteId` only. Query/body `instituteId` is ignored.

---

## 6. College registration workflow

Labels confirmed on the live signup page: [https://app.svyuvasuraksha.org/sign-up](https://app.svyuvasuraksha.org/sign-up)

Dropdowns (same fields as the college-registration walkthrough):

- Select University
- Exclusive Type
- Location Type
- Minority Type
- Linguistic Type
- College Type

Plus text fields already on the live form: Institute name, Address, District, Taluka, JD Region, Email, Mobile, Contact Number 1/2, Principal Name, Password.

Exact **option strings** were not available as a published non-JS source (the live page is a client-rendered SPA). Master lists are therefore **configurable** in `masterData` and marked `TODO: VERIFY OFFICIAL MASTER DATA`, except Maharashtra **district names**, which are public geography.

Phase 3 used free-text + find-or-create university. Phase 4:

1. University must already exist and be ACTIVE (no public create).
2. Enums validated against master data.
3. Duplicate email / institute email / institute name+university blocked.
4. Institute + user `PENDING`.
5. Admin approves → both `ACTIVE`. Reject → institute `REJECTED`, user `INACTIVE`, reason stored.

---

## 7. Approval workflow

Admin `/admin/institutes` (search, status/university/district filters, server-side pagination) and `/admin/institutes/:id`.

Only `PENDING` can be approved or rejected. Records are not deleted.

---

## 8. Dashboard structure

**College `/college`:** institute status, university, principal, student count placeholder (“Available in Phase 5”). Sidebar for future modules as placeholders.

**Admin `/admin`:** totals from the database (universities, institutes, pending, active). No hardcoded statistics.

---

## 9. API structure (Phase 4)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/universities` | Public (ACTIVE only) |
| GET | `/api/master-data` | Public |
| POST | `/api/auth/signup` | Public (existing; stricter validation) |
| GET | `/api/college/profile` | COLLEGE |
| PATCH | `/api/college/profile` | COLLEGE (safe fields only) |
| GET | `/api/college/dashboard` | COLLEGE |
| GET | `/api/admin/dashboard` | ADMIN |
| GET | `/api/admin/universities` | ADMIN |
| POST | `/api/admin/universities` | ADMIN |
| GET | `/api/admin/institutes` | ADMIN (paginated) |
| GET | `/api/admin/institutes/pending` | ADMIN |
| GET | `/api/admin/institutes/:id` | ADMIN |
| PATCH | `/api/admin/institutes/:id/approve` | ADMIN |
| PATCH | `/api/admin/institutes/:id/reject` | ADMIN |

---

## 10. Signup transactions

If a Mongo transaction is available, signup uses it. If Atlas rejects the transaction (catalog / standalone), sequential create runs and the institute is deleted if the user insert fails.

---

## 11. Out of scope

Student model, Excel, documents, insurance, e-card, payments, production university import.
