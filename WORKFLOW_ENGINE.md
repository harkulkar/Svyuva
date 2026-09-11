# WORKFLOW ENGINE

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

The workflow engine is an overlay on existing entity records. **Institute, Student, Document.fileStatus, InsuranceEnrollment.status, Payment.status, Review.status, and ECard.status remain canonical.** Workflow `currentState` is kept in sync through validated actions; it is not a second independent status system.

## Architecture

| Collection | Role |
| --- | --- |
| `workflowInstances` | One row per `(workflowType, entityType, entityId)` |
| `workflowHistory` | Immutable transition log (action, actor, from/to, reason, comments) |
| `workflowTasks` | Assignment overlay (`ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) |
| `documentVersions` | Version history for files (current + previous) |
| `documentRequirements` | Configurable checklist (empty until an administrator enters verified types) |
| `reviewChecklistItems` / `reviewChecklistResults` | Configurable review items (inactive until verified) |

Code: `backend/src/workflow/` (`engine.ts`, `definitions.ts`, `entitySync.ts`, `align.ts`, `notify.ts`, `workQueue.ts`, `actionCenter.ts`, `documents.ts`, `reviews.ts`).

## Instance fields

`workflowType`, `entityType`, `entityId`, `currentState`, `assignedTo`, `assignedRole`, `instituteId`, `universityId`, `startedAt`, `completedAt`, `dueAt`, `priority`, `revision`, `metadata`, `lastActionKey`, timestamps.

## Applying an action

1. Authenticate + RBAC.
2. Load or create the instance (college ownership required).
3. Reject stale `expectedRevision` / `expectedState` (`409 STALE_STATE`).
4. Look up `findRule(type, action, fromState)` — missing rule → `409 INVALID_TRANSITION`.
5. Feature flag on insurance/payment/review/e-card mutations → `501 FEATURE_DISABLED`.
6. Role must be listed on the rule → `403`.
7. `reasonRequired` needs ≥ 8 characters.
8. Claim the row with `findOneAndUpdate` on `{ _id, currentState, revision }`.
9. Apply entity side effects (approve/reject institute, document reviewStatus, etc.). On failure, revert the claim.
10. Append `WorkflowHistory`, complete related tasks, `writeAudit`, notify (existing Phase 13 service).

Duplicate `lastActionKey` → `409 DUPLICATE_ACTION`.

## Workflow types

`INSTITUTE_REGISTRATION`, `STUDENT_UPLOAD`, `DOCUMENT_REVIEW`, `INSURANCE_ENROLLMENT`, `PAYMENT_VERIFICATION`, `APPLICATION_REVIEW`, `ECARD_ISSUANCE`.

Insurance, payment, application review, and e-card **actions** stay behind the existing HTTP feature flags. GET queue/history is allowed.

## Notifications

`notifyWorkflowChange` uses `createNotification` + `reminderKey` (`wf:{type}:{entityId}:{action}:{toState}`). Approve/reject of institutes still emit `ACCOUNT_APPROVED` / `ACCOUNT_REJECTED` from `instituteService` so those are not duplicated. Email goes through Phase 13 `EmailService` after the in-app row is stored (async; workflow stays valid if email fails).

## AI

Read-only tools `getWorkflowQueueSummary` (admin) and `getMyActionCenter` (college). `isWriteRequest` still blocks approve/reject/delete. AI cannot change workflow, payment, or document state.
