# Legacy / existing submission flow analysis

PROJECT: SV Yuva Suraksha Yojana (rebuilt portal)

This note records what was found **before** implementing the college data-submission → premium → admin review flow. It does **not** connect to production, migrate legacy data, or treat recovered fragments as official Government of Maharashtra or insurer rules.

---

## 1. Recovered old application source

The workspace does not contain a usable recovered ASP.NET / PHP production application with:

- a premium calculation API
- an insurance enrollment premium formula
- GST / tax / fee tables
- official policy rates
- an official submission-number format

No production calculation logic was copied. **TODO: VERIFY OFFICIAL PREMIUM RULE.**

---

## 2. Premium in the rebuilt project (Phases 1–14)

| Location | What exists | Official? |
| --- | --- | --- |
| `InsuranceEnrollment.premium` | Optional numeric field for stored/migrated values | Not a formula |
| Migration notes | Explicitly forbid inventing premiums; use `NOT_AVAILABLE_IN_LEGACY_SOURCE` | N/A |
| Frontend | No client-side premium engine | N/A |
| AI / content rules | Forbid inventing GoM/insurer rates | N/A |

**Conclusion:** implement a **configurable** `PremiumCalculationService` on the backend. Do not seed production rates. Incomplete configuration must surface: “Premium calculation configuration requires official verification.”

---

## 3. Excel / student upload already implemented (Phase 5)

Reuse; do not redesign columns.

- Columns: `EXCEL_COLUMNS` / `EXCEL_REQUIRED_COLUMNS` in `backend/src/data/studentMaster.ts` (marked `TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT`).
- Parser: `backend/src/services/excelService.ts` (headers, types, in-file duplicates, sanitization).
- Preview job: `UploadJob` (`uploads` collection) stores parsed rows in MongoDB, TTL ~1 hour. File **bytes** are not stored in object storage.
- Import: `POST /api/college/students/import` writes `Student` documents immediately. **Upload is not a scheme submission.**

### Student identity (do not invent a new rule)

Unique indexes already defined:

1. `(instituteId, studentId)`
2. `(instituteId, enrollmentNumber)`
3. `(instituteId, academicYear, rollNumber)`

Academic year on student rows uses `YYYY-YY` (example `2025-26`), not `2026-2027`. Submission academic years follow the same format so Excel rows can match.

---

## 4. Gap this phase closes

The previous Excel path imports students into the institute roster. It does **not**:

- create a draft vs submitted business record
- lock data after college submit
- calculate or version premium on the backend
- give admin a submission list with student count + stored premium + file metadata

The new `DataSubmission` flow wraps validation/preview/confirm, then backend premium, then submit/lock, then admin review. The existing `/college/students/upload` import path remains for roster maintenance and is **not** treated as scheme submission.

---

## 5. Documents

Document HTTP upload remains feature-flagged (501) from earlier phases. This flow records Excel **metadata** (filename, size, checksum) on the submission. Original workbook bytes are not persisted in object storage unless a later storage phase enables it.

No extra required supporting documents were invented. If an official checklist exists, it is not in this source tree (`TODO: VERIFY OFFICIAL CONTENT`).

---

## 6. Notifications and audit

Phase 13 `createNotification` / `notifyAdmins` / `notifyInstituteUsers` is reused. New types are added to the existing enum (not a second system). `writeAudit` remains append-only.

---

## 7. Official items still requiring verification

- Premium rate, formula, GST/tax/fees, minimum/maximum student bands
- Submission / reference number format (`SVYS-YYYY-000001` is **configurable**, not official)
- Academic-year calendar (June start is a configurable default, not an official GR)
- Official Excel column names beyond the Phase 5 template
- Required supporting documents for a data submission
- Legal wording of the college declaration
