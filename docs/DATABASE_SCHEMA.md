# Database schema

**Database name:** `SVYSY`  
**Phase:** 8 — student records and Excel upload jobs are implemented. Official Excel column names remain `TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT`. Migrated rows may include `legacyId` / `legacySystem` (sparse unique).

Do not invent official government-required student fields beyond the verified Phase 5 set. Production student data is migrated only from an authorized export via `npm run migration:staging` (staging URI), never by scraping.

## Collections

| Collection | Purpose | Schema status |
|------------|---------|----------------|
| `users` | Admin and college login accounts | Phase 3 |
| `universities` | University names (find-or-create on signup) | Phase 3 (master UI in Phase 4) |
| `institutes` | College / institute profile from signup | Phase 3 (portal in Phase 4) |
| `refreshTokens` | Hashed refresh tokens | Phase 3 |
| `auditLogs` | Authentication and later admin actions | Phase 3 |
| `students` | Students belonging to an institute | Phase 5 |
| `documents` | File metadata (bytes in object storage) | Phase 8 persistence |
| `enrollments` | Enrollment submissions and status | Phase 8 persistence |
| `insurance` | InsuranceEnrollment rows from legacy if present | Phase 8 persistence |
| `payments` | Payment **status** records (no PAN/CVV) | Phase 8 persistence |
| `reviews` | Historical review/approval rows | Phase 8 persistence |
| `ecards` | Historical e-card metadata | Phase 8 persistence |
| `uploads` | Excel import jobs | Phase 5 |
| `notifications` | In-app notifications | Phase 8 persistence |
| `settings` | Application settings; Phase 1 writes a bootstrap document | Phase 1 |
| `migrationIdMaps` | legacyId → new ObjectId | Phase 8 |
| `migrationRuns` / `migrationIssues` | Migration run metadata | Phase 8 |

## `users`

| Field | Notes |
|-------|--------|
| `name` | Display name (principal name at college signup) |
| `email` | Unique, lowercase |
| `passwordHash` | bcryptjs; never selected by default; never returned by APIs |
| `role` | `ADMIN` \| `COLLEGE` |
| `phone` | Optional |
| `status` | `ACTIVE` \| `INACTIVE` \| `PENDING` |
| `instituteId` | Null for admin; set for college |
| `universityId` | Optional |
| `passwordResetTokenHash` / `passwordResetExpires` | Hidden; hashed reset token |
| `lastLoginAt` | Set on successful login |
| `createdAt` / `updatedAt` | Timestamps |

Indexes: unique `email`; `role`; `status`; `instituteId`; `universityId`.

## `institutes`

Signup profile: `universityId`, `name`, `nameNormalized`, `code`, `exclusiveType`, `locationType`, `minorityType`, `linguisticType`, `address`, `district`, `taluka`, `jdRegion`, `email` (unique), `mobile`, `contactNumber1`, `contactNumber2`, `principalName`, `collegeType`, `status` (`PENDING` \| `ACTIVE` \| `INACTIVE` \| `REJECTED`), `rejectionReason`, `reviewedAt`, `reviewedBy`.

## `universities`

`name`, `nameNormalized` (unique), `code` (unique, sparse), `shortName`, `status`.

## `refreshTokens`

`userId`, `tokenHash` (unique), `expiresAt` (TTL), `persistent` (Remember me).

## `auditLogs`

`userId`, `action`, `entity`, `entityId`, `ipAddress`, `userAgent`, `metadata`, `createdAt`. Phase 3 actions: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SIGNUP`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_SUCCESS`. Passwords and reset tokens are not stored.

## `students`

Owned by an institute. College APIs never take `instituteId` from the client.

| Field | Notes |
|-------|--------|
| `instituteId` / `universityId` | Required; university copied from the institute |
| `studentId` | Unique per institute |
| `enrollmentNumber` | Unique per institute |
| `rollNumber` | Unique per institute + `academicYear` |
| `firstName` / `middleName` / `lastName` | |
| `gender` | `Male` \| `Female` \| `Other` (TODO verify) |
| `dateOfBirth` | Date |
| `mobile` / `email` | Mobile required |
| `course` / `stream` / `year` / `semester` / `academicYear` | Year/semester enums; academic year `YYYY-YY` |
| `address` / `parentName` / `parentMobile` / `category` | Optional |
| `status` | `ACTIVE` \| `INACTIVE` |
| `createdAt` / `updatedAt` | |

No hard delete in Phase 5. Deactivate with `INACTIVE`.

Indexes: unique `{ instituteId, studentId }`, `{ instituteId, enrollmentNumber }`, `{ instituteId, academicYear, rollNumber }`; `{ instituteId, status }`; `{ universityId, academicYear }`; `{ instituteId, mobile }`; `{ instituteId, email }`.

## `uploads`

Temporary Excel preview jobs (parsed valid rows + issues). Original files are not stored in MongoDB. TTL on `expiresAt` (one hour). Fields: `instituteId`, `universityId`, `uploadedBy`, `filename`, counts, `validRows`, `issues`, `imported`.

## Relationships

```
universities  -->  institutes  -->  students
users.instituteId --> institutes
users.universityId --> universities
refreshTokens.userId --> users
students --> documents, enrollments, insurance
```

Every student document must include `instituteId` and `universityId`.

## Phase 1 settings document

```json
{
  "key": "bootstrap",
  "database": "SVYSY",
  "phase": 1,
  "note": "Phase 1 bootstrap record. Not production seed data."
}
```
