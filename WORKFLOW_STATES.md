# WORKFLOW STATES

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

Entity statuses already stored in MongoDB are not replaced. Workflow states below are the overlay used for transitions.

## Institute registration (`INSTITUTE_REGISTRATION`)

| Workflow state | Institute.status | User (college) |
| --- | --- | --- |
| `PENDING` | `PENDING` | `PENDING` (cannot log in unless correction is open) |
| `UNDER_REVIEW` | `PENDING` | `PENDING` |
| `CORRECTION_REQUESTED` | `PENDING` | `PENDING`; login allowed only while this workflow state is set |
| `APPROVED` | `ACTIVE` | `ACTIVE` |
| `REJECTED` | `REJECTED` | `INACTIVE` |

Transitions: `SUBMIT` (signup) → `START_REVIEW` → `APPROVE` / `REJECT` / `REQUEST_CORRECTION` → `RESUBMIT` back to `PENDING`.

Existing `PATCH /api/admin/institutes/:id/approve|reject` still work and call `alignRegistrationWorkflow`.

## Student Excel (`STUDENT_UPLOAD`)

`VALIDATING` → `VALIDATION_COMPLETE` → `IMPORTING` → `COMPLETED` or `FAILED`.

Invalid rows are not imported. Error workbook: `GET /api/college/students/import/:jobId/errors`.

## Document review (`DOCUMENT_REVIEW`)

Additive `Document.reviewStatus` (does **not** change `fileStatus`):

`NOT_STARTED` | `PENDING_REVIEW` | `VERIFIED` | `REJECTED` | `REPLACEMENT_REQUIRED`

`fileStatus` remains file-copy availability: `PENDING_COPY` | `AVAILABLE` | `FILE_MIGRATION_FAILED` | `NOT_AVAILABLE_IN_LEGACY_SOURCE`.

## Insurance / payment / review / e-card

Stored `status` strings stay as recorded (often `UNKNOWN` plus legacy values). Overlay transitions exist in `definitions.ts` but HTTP actions return `501 FEATURE_DISABLED` until the matching `FEATURE_*_HTTP` flag is enabled in a later phase.

Conceptual (not claimed as official scheme wording):

- Insurance: `DRAFT`/`UNKNOWN` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `CORRECTION_REQUESTED` → `COMPLETED`
- Payment: `PENDING` → `VERIFIED` / `FAILED` → `COMPLETED` (college cannot `VERIFY`)
- Review: `PENDING` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `CORRECTION_REQUESTED`
- E-card: `PENDING`/`UNKNOWN` → `GENERATED` / `CANCELLED`

## Priority and due dates

`LOW` | `NORMAL` | `HIGH` | `URGENT` — operational metadata only.

`workflow.defaultDueDays` operational setting: `0` means unset. **Not an official Government or insurer SLA.**
