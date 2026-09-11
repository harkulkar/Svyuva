# WORKFLOW SECURITY

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

## Controls

| Risk | Mitigation |
| --- | --- |
| IDOR / cross-college | College queries scoped to session `instituteId`. Other institute workflows/documents return 404/403. Query `instituteId` is ignored for college lists (Phase 14). |
| Unauthorized transition | Server-side `findRule` + role list. College cannot `APPROVE` registration. |
| Privilege escalation | Zod `.strict()` bodies; cannot set `role`, `instituteId`, `universityId`, `currentState` via action payloads. |
| Stale approval | `expectedRevision` / `expectedState` + `findOneAndUpdate` on current state/revision → `409 STALE_STATE`. Institute approve/reject uses `findOneAndUpdate` on `PENDING`. |
| Duplicate action | `lastActionKey` unique + duplicate check. Notifications use `reminderKey`. |
| Document access | Authn + ownership before any URL. No public files. `storageKey` omitted. Access/replace 501 until storage HTTP is enabled. |
| Bulk abuse | Bulk assign only. No bulk approve/reject/delete. |
| Assignment | Admin only; target must be a valid user id. |
| CSRF | Same-site httpOnly cookies (existing). |
| XSS | Existing React encoding; workflow comments rendered as text. |
| Mass assignment | Action schema allows only `action`, `reason`, `comments`, `expectedRevision`, `expectedState`. |
| Feature-flagged mutations | Insurance/payment/review/e-card actions `501` when flags are off. |
| AI | Read-only tools; write/secret/cross-institute classifiers unchanged. |

## Login exception

Pending college users may authenticate **only** when `INSTITUTE_REGISTRATION` is `CORRECTION_REQUESTED`. Student/Excel APIs still require Institute `ACTIVE`.

## Secrets

No credentials in source. Storage credentials never sent to the frontend. Audit history is append-only.
