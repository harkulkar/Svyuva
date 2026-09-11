# Legacy data analysis

**Date:** 8 September 2026  
**Workspace inspected:** `sv-yuva-suraksha/` plus parent `D:\Fresh SVY` notes in `PROJECT_ANALYSIS.md`  
**Old production access:** none (read-only requirement; no dump, no credentials, no scrape)

This file records what could be verified. It is not a government order and not a live database catalog.

---

## 1. Inspection summary

| Item | Finding |
|------|---------|
| Recovered legacy source (PHP/React) | **Not in this workspace** |
| SQL/Mongo dump | **Not present** |
| Excel production extracts | **Not present** |
| `/uploads1/` archive | **Not present** |
| New application models | Universities, Institutes, Users, Students, AuditLog, UploadJob, plus Phase 8 persistence models for documents/insurance/payments/reviews/ecards/enrollments/notifications |
| Phase 7 UI (insurance, documents, e-card, payment, review) | College routes still show **Coming soon**. Persistence collections existed as empty names from Phase 1; Mongoose models were added in Phase 8 so migrated rows have a home. No Phase 7 UI was built. |

---

## 2. Legacy entities discovered (from live hosts / prior analysis)

Evidence is **route and PHP filename observation**, not table dumps.

| Legacy entity (inferred) | Evidence | Confidence |
|--------------------------|----------|------------|
| University | `displayAllUniApi.php`, portal `/university-detail` | Medium |
| Institute / college | `displayAllInstituteApi.php`, `displayInstByUniApi.php`, signup fields on app.svyuvasuraksha.org | High (field **labels**) |
| User / login | `loginWithPassApi.php`, `signup.php` | Medium |
| Student | `displayAllStud.php`, `instStudSubmit.php`, `uniStudSubmit.php`, `/students-list/`, `/uploadData` | Medium |
| Excel upload jobs | `recentUploadApi.php`, `/uploads1/studentExcel/excelError/` | Medium |
| Payment log | `paymentLog.php`, `verifyTransaction.php`, `/paymentStatus`, BillDesk / ICICI Lombard references | Low (fields unknown) |
| Token | `tokenGenret.php` (filename typo observed) | Unknown payload |
| Dashboard counts | `totalMemberApi.php` | Unknown payload |
| Documents / KYC | `/upload-document`, `/kyc-upload` | Low |
| E-card | `/upload-eCard` | Low |
| Enrollment / review | `/enrollment`, `/enrollment-type`, `/review` | Low |
| Insurance | `/insurance-company`, `/icici-proposal` | Low |

---

## 3. Legacy fields discovered

### Institute signup (labels confirmed on live college signup)

University, Institute name, Location Type, Minority Type, Linguistic Type, Address, District, Taluka, JD Region, Email, Mobile, Contact Number1, Contact Number2, Principal Name, College Type, Password.

**Institute Type / exclusive type:** requested in the rebuild; **not confirmed** as a distinct live label (`MIGRATION_REVIEW_REQUIRED`).

Option lists (Rural/Urban, etc.) in the new app are marked `TODO: VERIFY OFFICIAL MASTER DATA`.

### Student Excel

No official SVYSY student template is in the workspace. New Phase 5 columns are a working set marked `TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT`. Treat every student column name from the old system as **unknown until the export is inspected**.

### Users

Email + password are implied by `loginWithPassApi.php`. Password **hashing algorithm is unknown** until a dump is inspected (`password_hash` bcrypt is common in PHP but **not verified**).

---

## 4. Legacy relationships (inferred)

```
University 1—* Institute 1—* Student
Institute 1—* User (college login)
Student —? Insurance / Documents / E-Card / Payment / Enrollment / Review
```

Cardinality of insurance and payments is **NOT_AVAILABLE_IN_LEGACY_SOURCE**.

---

## 5. Legacy role structure

Not dumped. Observed portals imply at least:

- College/institute operator (app.svyuvasuraksha.org)
- Administrator (admin.svyuvasuraksha.org)

New RBAC only allows `ADMIN` and `COLLEGE`. Any other legacy role is `MIGRATION_REVIEW_REQUIRED` and is not inserted.

---

## 6. Legacy status values

**Unknown** in source. Transformers accept a small alias set (`active`/`approved`/`pending`/`rejected`/…) and otherwise classify `REVIEW_REQUIRED`. Numeric `1`/`0` is treated as a **hypothesis**, not official.

---

## 7. Legacy IDs

PHP APIs suggest integer or string primary keys (`uni_id`, `inst_id`, `stud_id` are **aliases the migrator looks for**, not proven column names). Until the dump arrives, actual key names are `MIGRATION_REVIEW_REQUIRED`.

New MongoDB `_id` is always a new ObjectId. Legacy keys are stored in `legacyId`.

---

## 8. Legacy file locations

Observed: `https://admin.svyuvasuraksha.org/uploads1/` including `studentExcel/excelError/`. Full inventory unknown. Do not download from production. Copy an official archive into `STORAGE_SOURCE`.

---

## 9. Legacy API endpoints (reference, do not call)

Host: `https://admin.svyuvasuraksha.org/`

`signup.php`, `loginWithPassApi.php`, `displayAllUniApi.php`, `displayAllInstituteApi.php`, `displayInstByUniApi.php`, `displayAllStud.php`, `instStudSubmit.php`, `uniStudSubmit.php`, `recentUploadApi.php`, `totalMemberApi.php`, `paymentLog.php`, `verifyTransaction.php`, `tokenGenret.php`

These are **not** reused as architecture and are **not** invoked by Phase 8 scripts.

---

## 10. New target collections

`universities`, `institutes`, `users`, `students`, `documents`, `enrollments`, `insurance`, `payments`, `reviews`, `ecards`, `notifications`, `auditLogs`, `migrationIdMaps`, `migrationRuns`, `migrationIssues`

`uploads` (Excel jobs) and `refreshTokens` are **not** migrated from production.

---

## 11. Known mismatches

| Topic | Legacy | New |
|-------|--------|-----|
| IDs | Unknown SQL/int | Mongo ObjectId + `legacyId` |
| Auth | Unknown hash | bcryptjs; incompatible hashes force password reset |
| Roles | Unknown extras | `ADMIN` \| `COLLEGE` only |
| Student schema | Official Excel unknown | Phase 5 working set |
| Insurance/payment/e-card | Unknown columns | Optional fields only; no invented policy numbers |
| Files | IIS `/uploads1/` | Object storage key + SHA-256 |

---

## 12. Unknown fields / manual verification

Everything not listed as a confirmed signup **label**. Especially: policy numbers, premiums, coverage amounts, GR numbers, payment gateway internals, e-card PDF layout, review workflow states, university codes, student unique-key rules across colleges.

---

## 13. Fields requiring manual verification

Mark in reports as `MIGRATION_REVIEW_REQUIRED` when the export is loaded:

- Password algorithm per user
- Duplicate emails/mobiles
- Orphan students
- Missing files
- Unmapped statuses and roles
- Any amount/policy/coverage field (confirm it existed in source; never fill from news articles)
