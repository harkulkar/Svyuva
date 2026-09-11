# PHASE 15 WORKFLOW ANALYSIS

PROJECT: SV Yuva Suraksha Yojana Portal

This analysis precedes implementation. It does **not** invent official Government of Maharashtra or insurer rules, deadlines, premiums, coverage, or approval authorities. Entity statuses already in MongoDB remain the source of truth for access control. A workflow overlay records process history, assignment, and allowed transitions.

---

## 1. Current workflows

| Process | What exists today | HTTP mutations |
| --- | --- | --- |
| College registration | Signup → Institute `PENDING`, User `PENDING` (cannot log in) → Admin approve/reject | `PATCH /api/admin/institutes/:id/approve` \| `reject` |
| Institute activate/deactivate | Only from `ACTIVE`/`INACTIVE` | `PATCH /api/admin/institutes/:id/status` |
| Student records | College CRUD + status ACTIVE/INACTIVE | Live |
| Excel upload | UploadJob preview → import; error XLSX download | Live |
| Insurance / payment / e-card | Metadata list APIs; stored `status` is a free string (often `UNKNOWN` + legacy values) | Mutation APIs **not built**; flags default false |
| Documents | Metadata list; `fileStatus` is **file availability**, not verification | `POST /api/college/documents` → 501 |
| Review | `Review` collection for historical/migrated rows; `/college/review` is a placeholder | `FEATURE_REVIEW_HTTP` unwired |
| Notifications / audit / timeline | Phase 13 `createNotification`, `writeAudit`, audit-derived timelines | Live |
| PWA / AI | Phase 12–14; AI tools are read-only | Live |

Conceptual scheme chain (registration → students → insurance → documents → payment → review → e-card) is **not** enforced as a single state machine. Phase 15 must not pretend those later steps are live while feature flags are off.

---

## 2. Existing statuses (do not duplicate)

**Institute:** `PENDING`, `ACTIVE`, `INACTIVE`, `REJECTED`

**User:** `PENDING`, `ACTIVE`, `INACTIVE` — login requires `ACTIVE` (pending → `403 ACCOUNT_PENDING`)

**Student:** `ACTIVE`, `INACTIVE`

**Document.fileStatus:** `PENDING_COPY`, `AVAILABLE`, `FILE_MIGRATION_FAILED`, `NOT_AVAILABLE_IN_LEGACY_SOURCE`  
These describe **whether a file copy exists**, not admin verification.

**Insurance / Payment / ECard / Review.status:** no Mongoose enum; default `UNKNOWN`; migration mapper recognizes various legacy strings.

**Notification:** types already include account, document, payment, insurance, e-card, review, reminder (see `NOTIFICATION_TYPES`).

**UploadJob:** no status field; `imported` boolean + TTL `expiresAt`.

---

## 3. Existing approval mechanisms

- Approve: institute must be `PENDING` → `ACTIVE`; users `ACTIVE`; audit `INSTITUTE_APPROVED`; notification `ACCOUNT_APPROVED`.
- Reject: reason min 8 chars; institute `REJECTED`; users `INACTIVE`; not deleted; `ACCOUNT_REJECTED`.
- No `UNDER_REVIEW` on Institute.
- No correction/resubmit API.
- No document verify/reject API.
- College cannot currently log in to act on a pending registration.

---

## 4. Document states and storage

- Bytes are intended for S3-compatible storage; **no AWS SDK and no signed-URL implementation**.
- List APIs omit `storageKey` / checksums.
- **No versioning.**
- Public website documents are a separate published content area — not institute student files.

---

## 5. Review process

- No structured reviewer UI or checklist.
- Admin “pending reviews” quick action points at `/admin/support`.
- Reminder job regex-matches Review.status `/pending|review/i`.

---

## 6. Gaps Phase 15 will close (without inventing official rules)

1. Reusable workflow instance + history + tasks (overlay).
2. Validated transitions and stale/duplicate action rejection.
3. Registration: start review, request correction, college resubmit, keep approve/reject APIs.
4. Document **review** status (separate from `fileStatus`) + versions + configurable requirements (empty until an admin enters verified types).
5. Authz before any document access URL; file bytes remain 501 until `FEATURE_DOCUMENT_HTTP` and storage exist.
6. Insurance/payment/review/e-card **transition API** gated by existing feature flags (501 when off).
7. Admin work queue + assignment + operational due dates (configurable, **not** official SLAs).
8. College action center from **server** workflow/entity state (AI may only summarize).
9. Notifications via existing `createNotification` / EmailService queue — no second bus.

---

## 7. Proposed architecture

- **Canonical entity fields stay.** Workflow `currentState` is process state.
- Registration mapping: workflow `APPROVED` ⇔ Institute `ACTIVE`; `REJECTED` ⇔ `REJECTED`; `PENDING` / `UNDER_REVIEW` / `CORRECTION_REQUESTED` ⇔ Institute remains `PENDING`.
- Correction login: only while workflow is `CORRECTION_REQUESTED`, pending college users may authenticate; student/Excel mutations still require Institute `ACTIVE`.
- One `WorkflowInstance` per `(workflowType, entityType, entityId)`.
- `revision` for optimistic concurrency.
- Handlers call existing `approveInstitute` / `rejectInstitute` so behaviour stays compatible.
- Feature-flagged domains: GET queue/history allowed; POST actions → `FEATURE_DISABLED` when the flag is off.

---

## 8. Backwards compatibility

- Existing approve/reject/status/student/Excel routes unchanged in path and payload.
- Dashboard `pendingActions` strings remain; structured `actionItems` is additive.
- No change to Institute/User/Student enums.
- Document `fileStatus` enum unchanged; additive `reviewStatus` / version fields default so legacy rows stay valid.
- No legacy production connection or data migration.
- AI still cannot approve, reject, or change workflow state.
