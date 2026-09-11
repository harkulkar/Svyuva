# Data mapping (legacy → new)

Legend:

- **Transformation:** what the migrator does
- **Required:** needed to insert into the new collection
- **Default:** only used when documented; otherwise skip
- `MIGRATION_REVIEW_REQUIRED` — do not guess
- `NOT_AVAILABLE_IN_LEGACY_SOURCE` — not in the workspace dump

Legacy column names below are **lookup aliases** (PHP/JSON hypotheses). When the real export arrives, compare names; unknown keys are stored in `legacyUnmapped` (never passwords or payment secrets).

`legacySource` is set to `authorized-export`. `legacySystem` defaults to `svyuvasuraksha-legacy`.

---

## LEGACY UNIVERSITY → `universities` (University)

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `uni_id` / `university_id` | `legacyId` | string | yes | — | non-empty | New `_id` is always ObjectId |
| — | `legacySystem` | constant | yes | `svyuvasuraksha-legacy` | — | |
| `name` / `university_name` | `name` / `nameNormalized` | trim; lowercase name | yes | — | min length 1 | Duplicate names → report |
| `code` | `code` | uppercase | no | null | unique sparse | |
| `short_name` | `shortName` | trim | no | `''` | | |
| `status` | `status` | `active`/`1`→`ACTIVE`; `inactive`→`INACTIVE` | yes | — | enum | Else `MIGRATION_REVIEW_REQUIRED` |

---

## LEGACY INSTITUTE → `institutes` (Institute)

Parent: mapped university `legacyId` → `universityId`.

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `inst_id` / `institute_id` | `legacyId` | string | yes | — | | |
| `university_id` / `uni_id` | `universityId` | ID map | yes | — | parent must exist | Else orphan review |
| `name` / `institute_name` | `name` / `nameNormalized` | trim | yes | — | | |
| `email` | `email` | lowercase | yes | — | email | Duplicate email → `DUPLICATE_REVIEW_REQUIRED` |
| `address` | `address` | trim | yes | — | | |
| `district` | `district` | as-is | yes | — | not invented | Master-list mismatch → still stored; verify later |
| `taluka` | `taluka` | as-is | yes | — | | |
| `jd_region` | `jdRegion` | as-is | yes | — | | |
| `mobile` | `mobile` | as-is | yes | — | | Format not assumed if legacy differs |
| `contact_number1` | `contactNumber1` | as-is | no | `''` | | |
| `contact_number2` | `contactNumber2` | as-is | no | `''` | | |
| `principal_name` | `principalName` | as-is | yes | — | | |
| `college_type` | `collegeType` | as-is | yes | — | | |
| `location_type` | `locationType` | as-is | no | `''` | | Live signup label |
| `minority_type` | `minorityType` | as-is | no | `''` | | |
| `linguistic_type` | `linguisticType` | as-is | no | `''` | | |
| `exclusive_type` | `exclusiveType` | as-is | no | `''` | | Label not confirmed live |
| `status` | `status` | see status map | yes | `PENDING` if missing | enum | Missing → `WARNING` + PENDING |
| extra columns | `legacyUnmapped` | copy minus secrets | no | | | Do not drop history |

**Status map:** `approved`/`active`/`1` → `ACTIVE`; `pending`/`new` → `PENDING`; `rejected` → `REJECTED`; `inactive`/`0` → `INACTIVE`; else `MIGRATION_REVIEW_REQUIRED`.

---

## LEGACY USER → `users` (User)

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `user_id` | `legacyId` | string | yes | — | | |
| `email` | `email` | lowercase | yes | — | unique | Clash with non-migrated user → `DUPLICATE_REVIEW_REQUIRED` |
| `name` / `full_name` | `name` | trim | yes | — | | |
| `mobile` / `phone` | `phone` | as-is | no | | | |
| `role` | `role` | see role map | yes | — | `ADMIN` \| `COLLEGE` | Else skip insert |
| `status` | `status` | active→`ACTIVE`; missing→`PENDING` | yes | `PENDING` | | |
| `institute_id` | `instituteId` | ID map | yes if COLLEGE | null for ADMIN | | |
| `university_id` | `universityId` | ID map | no | null | | |
| `password` / `password_hash` | `passwordHash` | bcrypt copied only if `$2a$`/`$2b$`/`$2y$` | yes | unusable bcrypt | | Never plaintext; never logged |
| — | `passwordResetRequired` | true unless bcrypt copied | yes | | | Forgot-password flow |
| — | `legacyPasswordAlgorithm` | detected name only | no | | hidden | Not the secret |

**Role map:** `admin`/`administrator`/`superadmin`/`dhe` → `ADMIN`; `college`/`institute`/`principal`/`collegeuser` → `COLLEGE`; generic `user` → COLLEGE + `WARNING`; anything else → `MIGRATION_REVIEW_REQUIRED`.

`MIGRATION_ADMIN_EMAIL` is used only to recognise an existing administrator identity. Passwords come from environment or reset, never from source code.

---

## LEGACY STUDENT → `students` (Student)

Parent: institute map **and** university map (university may be copied from the mapped institute).

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `student_id` / `stud_id` | `legacyId` | string | yes | — | | |
| `institute_id` | `instituteId` | ID map | yes | — | | |
| `university_id` | `universityId` | ID map or institute.universityId | yes | — | | |
| `studentId` / `student_code` | `studentId` | as-is; fallback legacyId | yes | | unique per institute | Duplicate → report, no silent merge |
| `enrollmentNumber` / `enrollment_no` | `enrollmentNumber` | as-is | yes | — | unique per institute | Official uniqueness unverified |
| `rollNumber` / `roll_no` | `rollNumber` | as-is | yes | — | unique per institute+year | |
| `first_name` / `last_name` | `firstName` / `lastName` | trim | yes | — | | Do not split a single `name` field automatically (`MIGRATION_REVIEW_REQUIRED`) |
| `middle_name` | `middleName` | | no | `''` | | |
| `gender` / `sex` | `gender` | M/F → Male/Female | yes | — | enum | Else review |
| `dob` / `date_of_birth` | `dateOfBirth` | ISO or dd/mm/yyyy | yes | — | valid date | Ambiguous US dates → `WARNING` |
| `mobile` | `mobile` | as-is | yes | — | | |
| `email` | `email` | lowercase | no | `''` | | |
| `course` | `course` | as-is | yes | — | | |
| `stream` | `stream` | | no | `''` | | |
| `year` | `year` | `1`/`FY` → First Year, etc. | yes | — | enum | Else review |
| `semester` | `semester` | | no | `''` | 1–8 | |
| `academic_year` | `academicYear` | as-is | yes | — | | Format `YYYY-YY` expected by new app |
| `address` / `parent_name` / `parent_mobile` / `category` | matching | as-is | no | `''` | category enum | |
| `status` | `status` | | yes | `INACTIVE` if missing | | Safer than assuming ACTIVE |

No automatic merge of possible duplicates. Flag `DUPLICATE_REVIEW_REQUIRED`.

---

## LEGACY INSURANCE → `insurance` (InsuranceEnrollment)

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `insurance_id` | `legacyId` | string | yes | — | | |
| `student_id` | `studentId` | ID map | yes | — | parent student | |
| `status` | `status` | enrolled→`ENROLLED`, etc. | no | `UNKNOWN` | | Unmapped kept + `WARNING` |
| `policy_no` | `policyNumber` | as-is **only if present** | no | null | | **Never invent** |
| `insurer` | `insurer` | as-is if present | no | null | | |
| `premium` | `premium` | number if present | no | null | | Never fill from news |
| `coverage` | `coverage` | as-is if present | no | null | | |
| `start_date` / `end_date` | `startDate` / `endDate` | parse | no | null | | |
| `academic_year` | `academicYear` | | no | `''` | | |

If the export has no insurance file: entity is `NOT_AVAILABLE_IN_LEGACY_SOURCE`.

---

## LEGACY DOCUMENT → `documents` (Document)

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `document_id` | `legacyId` | | yes | | | |
| `path` / `file_path` / `url` | `legacyPath` | as-is | yes for copy | | | Missing → `FILE_MIGRATION_FAILED` |
| `filename` | `originalFilename` | | no | `''` | | |
| `mime` | `mimeType` | | no | `''` | | |
| `size` | `sizeBytes` | number | no | null | | |
| SHA-256 of bytes | `sha256` | crypto | after copy | | | |
| — | `storageKey` | destination key | after copy | null | | Not GridFS |
| `student_id` / `institute_id` | refs | ID map | no | | | |
| — | `fileStatus` | `PENDING_COPY` / `AVAILABLE` / `FILE_MIGRATION_FAILED` | yes | | | |

---

## LEGACY PAYMENT → `payments` (Payment)

| Legacy alias | New field | Transform | Required | Default | Validation | Notes |
|--------------|-----------|-----------|----------|---------|------------|-------|
| `id` / `payment_id` | `legacyId` | | yes | | | |
| `amount` / `txn_amount` | `amount` | number if present | no | null | | |
| `status` | `status` | paid/success→`SUCCESS` | no | `UNKNOWN` | | |
| `txn_id` / `transaction_id` / `reference` | `gatewayReference` | | no | null | | |
| `payment_date` | `paidAt` | parse | no | null | | |
| `gateway` | `gateway` | as-is | no | null | BillDesk/ICICI names only if in source |
| `card_number`, `cvv`, `pin`, `otp` | **dropped** | never stored | — | — | | |

---

## LEGACY REVIEW → `reviews` (Review)

Historical: `migratedHistorical=true`. Not rewritten as new-system events.

| Legacy alias | New field | Transform | Required | Notes |
|--------------|-----------|-----------|----------|-------|
| `id` | `legacyId` | | yes | |
| `entity_type` | `entityType` | as-is | yes | Unknown → `UNKNOWN` |
| `reviewer_id` | `reviewerId` / `reviewerLegacyId` | map if possible | no | |
| `review_date` | `reviewedAt` | parse | no | |
| `status` | `status` | as-is | no | Do not invent workflow names |
| `comments` / `reject_reason` / `correction` | matching | as-is | no | |

---

## LEGACY E-CARD → `ecards` (ECard)

| Legacy alias | New field | Transform | Required | Notes |
|--------------|-----------|-----------|----------|-------|
| `id` / `ecard_id` | `legacyId` | | yes | |
| `student_id` | `studentId` | ID map | yes | |
| `issue_date` | `issuedAt` | parse | no | |
| file ref | `documentId` | if document mapped | no | Do not regenerate PDFs |

---

## Notifications / audit

Migrated only if present in the export. Audit rows set `migratedHistorical=true`. Tokens and passwords in metadata are stripped.

---

## ID map collections

`migrationIdMaps`: `{ entity, legacyId, legacySystem, newId, runId }` unique on `(entity, legacySystem, legacyId)`.

JSON copies under `migration/maps/*-map.json` are generated for operators; large datasets should rely on MongoDB maps.
