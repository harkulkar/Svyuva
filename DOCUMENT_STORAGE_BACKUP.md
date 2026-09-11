# Document storage backup

Student documents, insurance files, e-cards, uploaded Excel previews, and other objects are **not** served by live HTTP APIs in this phase. MongoDB `documents` metadata can exist without files (and the reverse).

## What must stay consistent

- Database metadata (`documents.storageKey`, `fileStatus`)
- Actual stored files (S3-compatible bucket or `STORAGE_SOURCE` inventory)

A database restore without objects, or objects without metadata, is incomplete.

## Policy

| Item | Value |
| --- | --- |
| Bucket versioning | TODO: CONFIGURE |
| Replication | TODO: CONFIGURE |
| Excel preview jobs | MongoDB TTL on `uploads.expiresAt` (temporary; not a document archive) |
| Orphan / missing check | `npm run maintenance:check-storage` (read-only; **does not delete**) |
| Responsible administrator | TODO: CONFIGURE |

Private file URLs must not be exposed to College users or in health JSON.

**Last storage restore test:** NOT_EXECUTED.
