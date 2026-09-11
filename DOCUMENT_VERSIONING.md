# DOCUMENT VERSIONING

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 15

## Two status axes

1. **`fileStatus`** — whether a file copy exists (legacy/migration). Unchanged.
2. **`reviewStatus`** — verification overlay: `NOT_STARTED`, `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `REPLACEMENT_REQUIRED`.

Do not use `fileStatus` as a verification result.

## Versions

Collection `documentVersions`:

- `documentId`, `version`, `uploadedBy`, `uploadedAt`
- `originalFilename`, `mimeType`, `sizeBytes`, `sha256`
- `status`, `rejectionReason`, `isCurrent`
- `storageKey` is **never** returned to the frontend

Replacing a rejected document must create a new version and keep the old row. HTTP upload/replace currently returns `501 FEATURE_DISABLED` when `FEATURE_DOCUMENT_HTTP` is off (default). Authz still runs first (ownership, authentication).

## Access

- `GET /api/admin|college/documents/:id/versions` — metadata only, institute isolation
- `GET /api/admin|college/documents/:id/access` — permission check, then 501 until storage + flag
- `POST /api/admin/documents/:id/review` — `VERIFY` / `REJECT` / `REQUEST_CORRECTION` (reason required for reject/correction)
- `POST /api/college/documents/:id/replace` — college, rejected/replacement-required only; 501 until upload is enabled

No public file URLs, no predictable storage paths, no credentials in the frontend.

## Requirements and checklist

`DocumentRequirement` is configurable (`name`, `documentType`, `workflowType`, `required`, `allowedFileTypes`, `maxFileSize`, `active`, `instructions`). **No official document types are seeded.** Empty checklist = none configured.

College documents page shows the checklist from configured active rows only.
