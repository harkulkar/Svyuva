# Production rollback plan

Rollback restores the **new** deployment to the last known good state. It does **not** modify, wipe, or shut down the old SV Yuva Suraksha system. That system remains the user-facing fallback until retirement is approved.

---

## Rollback conditions

Trigger rollback (or halt cutover) if any of the following occur:

- Critical authentication failure (admin or college cannot log in)
- Database corruption or failed restore
- Major data mismatch vs the authorized legacy export
- Document access failure after file migration (when that module is live)
- Severe security issue (secret leak, broken RBAC, college isolation failure)
- Application unavailable beyond **TODO: CONFIGURE** RTO
- Critical business workflow failure in an **in-scope** module

Phase 7 placeholders (insurance/documents/payment/review/e-card HTTP APIs missing) are **known** and are not by themselves a rollback trigger unless go-live promised those workflows.

---

## During the transition window

1. Leave DNS on the **old** hosts if go-live DNS was not switched.
2. If DNS was switched, revert DNS to the old hosts (**TODO: CONFIGURE** TTL/procedure).
3. Keep the new stack running for diagnosis unless it is unsafe (then stop the new processes only).
4. Restore the new Atlas database from the pre-cutover snapshot if the new DB was written incorrectly (`BACKUP_RESTORE.md`).
5. Do not run migration against the old production database.

---

## Restore the new stack (last known good)

1. Redeploy the last known good git tag: **TODO: CONFIGURE**
2. Point `MONGODB_URI` at the restored snapshot / previous cluster
3. Confirm `GET /api/health` and a test admin login from the secret store
4. Record incident time, operator, and user impact

Infrastructure-specific stop/start commands: **TODO: CONFIGURE** (`PRODUCTION_RUNBOOK.md`).

---

## Communication

Stakeholder list: **TODO: CONFIGURE**  
Public notice: **TODO: CONFIGURE**
