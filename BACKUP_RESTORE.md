# Backup and restore

**Do not restore over production.** Use a separate cluster or database name.

Production snapshot schedule, retention, and the staging restore target are **TODO: CONFIGURE**.

---

## MongoDB (database name `SVYSY`)

This application uses MongoDB Atlas (or a compatible server) with `MONGODB_URI` and `MONGODB_DB_NAME=SVYSY`.

### Backup

Atlas UI: Database Deployments → cluster → Backup → enable cloud backup / take snapshot.

Atlas CLI (when installed and authenticated):

```bash
atlas backups snapshots create <clusterName> --desc "SVYSY manual snapshot"
```

`mongodump` (when a URI is available **outside git**):

```bash
mongodump --uri="<MONGODB_URI>" --db=SVYSY --out=./backups/svysy-$(date +%Y%m%d)
```

Store dump archives in an access-controlled location, not in this repository.

### Restore (non-production)

Restore into a **new** cluster or a staging database (for example `SVYSY_RESTORE_TEST`), never onto the live `SVYSY` production database without an approved window.

```bash
mongorestore --uri="<STAGING_MONGODB_URI>" --db=SVYSY --drop ./backups/svysy-YYYYMMDD/SVYSY
```

Atlas snapshot restore: restore to a new cluster, then point a staging `.env` `MONGODB_URI` at that cluster.

### Verify after restore

1. Collection list includes `users`, `institutes`, `students`, `universities`, `auditLogs`, and (when used) Phase 7 collections.
2. Indexes exist (including partial unique `{ legacySystem, legacyId }`).
3. Relationships: a sample college user’s `instituteId` still resolves; a sample student’s `instituteId` / `universityId` still resolve.
4. Application starts with the staging URI and `GET /api/health` returns `{ "data": { "status": "ok", "database": { "connected": true } } }` (envelope wrapping may add `success` / `message`).
5. Login with a **staging** admin account succeeds.

### Restore drill status

A live restore against Atlas was **not** executed in Phase 9 from this development environment (would require production/staging cluster credentials and could incur cost).

**BLOCKED — PRODUCTION DECISION REQUIRED:** name the staging cluster and run the drill before go-live. Record date, operator, and result here when done.

---

## Object storage

Document files are not yet served by HTTP APIs. When S3-compatible storage is enabled:

- Enable bucket versioning
- Replicate or copy to a second region or provider
- MongoDB stores object keys; restoring DB without objects (or objects without metadata) is incomplete

**TODO: CONFIGURE** bucket, region, and replication.

---

## Application secrets

Back up `.env` in a password manager or deployment secret store. `.env` is gitignored and must never be committed.

After restore, secrets are **not** inside MongoDB dumps. Recover them from that secret store (`DISASTER_RECOVERY.md`).
