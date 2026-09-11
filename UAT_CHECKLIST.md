# UAT checklist

Use this list on **staging** (or an approved pre-production host). Do not treat unchecked Phase 7 items as passed.

Old production (svyuvasuraksha.org / app / admin) stays live until cutover approval.

Tester: ________________  Date: ________________  Environment: ________________

---

## PUBLIC WEBSITE

- [ ] Homepage
- [ ] Navigation
- [ ] Information pages (about, scheme, implementing body, nodal agency)
- [ ] Insurance information pages (public content only)
- [ ] Useful links
- [ ] Downloads
- [ ] Contact
- [ ] Policies / disclaimer
- [ ] Mobile responsive

## AUTHENTICATION

- [ ] Login (admin)
- [ ] Login (college, approved)
- [ ] Pending college cannot log in
- [ ] Signup
- [ ] Forgot password (email delivery: **PRODUCTION CONFIGURATION REQUIRED**)
- [ ] Reset password (token path)
- [ ] Logout
- [ ] Password change

## ADMIN

- [ ] Dashboard
- [ ] Universities
- [ ] Institutes
- [ ] Approvals / rejections
- [ ] Users (last-admin protection)
- [ ] Students (cross-college)
- [ ] Reports
- [ ] Audit logs
- [ ] Insurance — **N/A until Phase 7 HTTP APIs**
- [ ] Documents — **N/A until Phase 7 HTTP APIs**
- [ ] Payments — **N/A until Phase 7 HTTP APIs**
- [ ] Reviews — **N/A until Phase 7 HTTP APIs**
- [ ] E-cards — **N/A until Phase 7 HTTP APIs**

## COLLEGE

- [ ] Dashboard
- [ ] Profile
- [ ] Students (own institute only)
- [ ] Excel upload (validate / preview / import)
- [ ] Insurance — placeholder / Coming soon
- [ ] Documents — placeholder / Coming soon
- [ ] Payment — placeholder / Coming soon
- [ ] Review — placeholder / Coming soon
- [ ] E-card — placeholder / Coming soon

## SECURITY SMOKE (staging)

- [ ] Unauthenticated → `/api/admin/*` = 401
- [ ] Unauthenticated → `/api/college/*` = 401
- [ ] College → `/api/admin/*` = 403
- [ ] College A cannot read College B students (404)
- [ ] Invalid / expired JWT = 401
- [ ] Health JSON contains no secrets

## UAT DECISION

- [ ] Phases 1–6 accepted for limited go-live **or**
- [ ] Full-scheme UAT deferred until Phase 7 APIs exist

Sign-off: ________________
