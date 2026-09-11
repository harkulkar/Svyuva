# Production cutover checklist

Phase 8 **does not** perform production cutover. The old system stays live and unmodified until this list is completed and explicitly approved.

- [ ] Legacy backup/export verified (read-only dump + file archive in operator control)
- [ ] New database backup verified (Atlas snapshot of the intended target)
- [ ] Data mapping approved (`migration/DATA_MAPPING.md`)
- [ ] Dry run completed (`npm run migration:dry-run`) with non-zero source note only if an export was loaded
- [ ] Staging migration completed (`npm run migration:staging`)
- [ ] Reconciliation completed (`reconciliation-report.json` / `.csv`)
- [ ] Missing records reviewed
- [ ] Missing files reviewed (`missing-files-report.json`)
- [ ] User accounts verified (roles `ADMIN` / `COLLEGE` only; password reset where required)
- [ ] Admin access verified (env-based, not hardcoded)
- [ ] College access verified (institute isolation)
- [ ] Student data verified (sample + counts)
- [ ] Insurance data verified **or** marked `NOT_AVAILABLE_IN_LEGACY_SOURCE`
- [ ] Documents verified (checksums)
- [ ] Payment history verified (no PAN/CVV/OTP stored)
- [ ] E-card data verified **or** marked unavailable
- [ ] Audit logs verified (historical flag)
- [ ] Security review completed
- [ ] UAT completed
- [ ] Rollback plan tested on **staging**
- [ ] Production migration approved in writing by the department/operator

When any insurance, premium, policy, or coverage value is missing from the legacy export, the new system must keep `NOT_AVAILABLE_IN_LEGACY_SOURCE` rather than copying figures from news or marketing pages.
