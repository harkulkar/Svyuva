# Production checklist

Phase 10 deployment is **not** started. This list is for UAT and later go-live review.

- [x] All Phase 1–8 functionality that exists in this repo is in place (Phase 7 HTTP APIs are explicitly deferred)
- [x] Migration reconciliation tooling completed (Phase 8); production data cutover is **not** done
- [x] Security audit completed (`SECURITY_AUDIT.md`)
- [x] Automated tests passing — backend 84, frontend 6 (2026-09-08)
- [x] End-to-end tests passing — backend workflows 1–3 via `npm run test:e2e`; browser E2E **BLOCKED — PRODUCTION DECISION REQUIRED**; workflows 4–6 blocked on Phase 7 APIs
- [x] Performance testing completed at the design level (pagination, indexes, export caps). Full-volume Atlas load test: TODO: CONFIGURE
- [ ] Backup tested — **BLOCKED — PRODUCTION DECISION REQUIRED**
- [ ] Restore tested — **BLOCKED — PRODUCTION DECISION REQUIRED**
- [ ] Storage tested — object storage not live
- [x] Authentication tested
- [x] RBAC tested
- [x] College isolation tested (students)
- [x] Admin functionality tested
- [x] Student functionality tested
- [ ] Insurance tested — Phase 7 API missing
- [ ] Documents tested — Phase 7 API missing
- [ ] Payment status tested — Phase 7 API missing
- [ ] Review workflow tested — Phase 7 API missing
- [ ] E-card tested — Phase 7 API missing
- [x] Error handling tested
- [x] Logging verified
- [x] Secrets verified (not in `.env.example` or frontend `VITE_*` except API URL)
- [x] Environment variables documented (`.env.example`)
- [x] Mobile testing completed for implemented layouts (responsive CSS; device lab UAT still TODO: CONFIGURE)
- [x] Accessibility reviewed
- [x] Monitoring documented
- [x] Disaster recovery documented
- [ ] UAT ready for the **full** scheme including insurance — **no**
- [x] UAT ready for **Phases 1–6** (public site, auth, college registration, students, admin) **after** `npm test` is green on staging

Signer / date: TODO: CONFIGURE
