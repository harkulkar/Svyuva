# Project Analysis — SV Yuva Suraksha Yojana

**Date:** 7 September 2026  
**Workspace:** `D:\Fresh SVY`  
**New codebase:** `sv-yuva-suraksha/`  
**Reference site:** https://svyuvasuraksha.org/  
**College portal:** https://app.svyuvasuraksha.org/  
**Observed admin/API host:** https://admin.svyuvasuraksha.org/

This document records what exists today, what is missing, and how the rebuild will proceed. It is not official government policy.

---

## 1. Current workspace

| Item | Finding |
|------|---------|
| Reconstructed application | **Not present** |
| Existing `package.json` | **None** |
| Existing documents / PDFs | **None** in the workspace |
| Images / logos in repo | **None** before this analysis |
| Source code | **None** (empty project folder plus a local Python `venv/` unrelated to this app) |
| Git repository | **Not initialized** for the new app |

The workspace is a greenfield rebuild. Recovered production source was **not** supplied here. Official logo (`LOGO-01.svg`) was downloaded from the live public site into `frontend/public/` and `docs/reference-assets/` for branding only. Compiled JavaScript from the old site will **not** be used as architecture.

---

## 2. Existing production systems (reference only)

The live estate is split across three hosts:

| Host | Role | Stack observed |
|------|------|----------------|
| https://svyuvasuraksha.org/ | Public website | Create React App (`/static/js/main.9c4acd98.js`), IIS/ASP.NET front |
| https://app.svyuvasuraksha.org/ | College / institute portal | Create React App (`/static/js/main.ab8edb75.js`) |
| https://admin.svyuvasuraksha.org/ | Backend / admin APIs / uploads | PHP endpoints (for example `signup.php`, `loginWithPassApi.php`, `displayAllStud.php`) |

The public HTML is an SPA shell (`<div id="root">Loading...</div>`). Content is client-rendered. The new project will reimplement features in React + Vite + Express + MongoDB. It will **not** copy the old bundles.

### 2.1 Security note on the old frontend bundle

The college-portal bundle contains a third-party media URL unrelated to this scheme (`flag-gimn.ru`). That URL must **not** be copied. Treat the old production frontend as untrusted compiled output.

### 2.2 Payments observed on the old portal

The old portal references BillDesk and ICICI Lombard payment gateways. Phase 1–7 will implement **database-backed payment status only**, not live payment processing, unless a later instruction requires it.

---

## 3. Public website pages identified

Routes taken from the live public bundle (names only, not copied code):

### Primary navigation / scheme pages

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/about-scheme` | About the scheme |
| `/personal-accidents` | Personal accident cover information |
| `/mediclaim-coverage` | Mediclaim / health cover information |
| `/nodalAgency` | Nodal agency |
| `/insurance-company` | Insurance company |
| `/implementing-body` | Implementing body |
| `/gr` | Government Resolution |
| `/press` | Press |
| `/contact` | Contact |
| `/login` | Login (public site also links here) |
| `/sign-up` | Institute registration |
| `/forgotPassword` | Forgot password |

### Website policy pages (GIGW-style)

| Route | Purpose |
|-------|---------|
| `/website-policies` | Website policies hub |
| `/privacy-policy` | Privacy policy |
| `/terms-and-conditions` | Terms |
| `/accessibility-statement` | Accessibility |
| `/disclaimer` / `/disclaimer-footer` | Disclaimer |
| `/copyright-policy` | Copyright |
| `/hyperlink-policy` | Hyperlink policy |
| `/content-archival-policy` | Content archival |
| `/content-contribution` | Content contribution |
| `/content-review-policy` | Content review |
| `/security-policy` | Security policy |
| `/website-monitoring-plan` | Website monitoring |
| `/contingency-management-plan` | Contingency plan |
| `/icici-document` | ICICI-related document page |
| `/national-document` | National Insurance-related document page |

### Home page content observed (public, already published)

- Scheme title: **SV Yuva Suraksha Yojana** / **Swami Vivekananda Yuva Suraksha Yojana**
- Swami Vivekananda quotations on the home page
- About-scheme text attributing the initiative to the **Directorate of Higher Education, Government of Maharashtra**, covering students in Higher & Technical education, with health and accident coverage
- Contact published on the live site:
  - `info@svyuvasuraksha.org` (also shown with `info@buypolicynow.com`)
  - `+91 96490 02216`
- Related emails shown on signup: `svysy@buypolicynow.com`, `amrish.duddalwar@icicilombard.com`, `rahulb.patil@nic.co.in`
- Government links observed in the portal bundle: `maharashtra.gov.in`, `dhepune.gov.in`, `dte.maharashtra.gov.in`, `htedu.maharashtra.gov.in`, `msbte.org.in`

**Content rule:** Phase 2 will reuse only text/assets already published on the official site or supplied in this project. Anything else is marked `TODO: VERIFY OFFICIAL CONTENT`. Premium amounts, GR numbers, and coverage figures from news articles will not be treated as source of truth until verified against official pages/documents.

---

## 4. College / admin portal functionality identified

Routes / screens observed on https://app.svyuvasuraksha.org/:

| Area | Routes / features |
|------|-------------------|
| Auth | `/login`, `/sign-up`, `/forgot-password` |
| Institute | `/profile`, `/institute` |
| University | `/university-detail`, `/university/institute-details/` |
| Students | `/student`, `/students-list/`, `/student-details/`, `/uploadData` |
| Documents | `/upload-document`, `/kyc-upload` |
| E-Card | `/upload-eCard` |
| Enrollment | `/enrollment`, `/enrollment-type`, `/review` |
| Payments | `/paymentStatus` |
| Insurance | `/insurance-company`, `/icici-proposal` |

### Institute signup fields confirmed in the live portal

These labels exist on the current sign-up flow and will be preserved:

- University
- Institute name
- Location Type
- Minority Type
- Linguistic Type
- Address
- District
- Taluka
- JD Region
- Email
- Mobile
- Contact Number1
- Contact Number2
- Principal Name
- College Type
- Password / confirm password

**Institute Type** was requested in the rebuild spec; it was not confirmed as a distinct live label. It will be included as an optional/configurable field and marked for verification in Phase 3.

### Old PHP APIs (migration clues only — not to be reused as architecture)

Examples: `signup.php`, `loginWithPassApi.php`, `displayAllUniApi.php`, `displayAllInstituteApi.php`, `displayInstByUniApi.php`, `displayAllStud.php`, `instStudSubmit.php`, `uniStudSubmit.php`, `recentUploadApi.php`, `totalMemberApi.php`, `paymentLog.php`, `verifyTransaction.php`, `tokenGenret.php`, Excel error path under `/uploads1/studentExcel/excelError/`.

These confirm: universities → institutes → students, Excel student upload, payments, and chart/count dashboards already exist. The new API will be a clean REST design under `/api/*`.

---

## 5. Available assets

| Asset | Status |
|-------|--------|
| Official logo `LOGO-01.svg` | Downloaded from live site into `frontend/public/logo.svg` |
| Favicon | Live `/favicon.svg` currently serves the same SVG as the logo |
| Public CSS | MDB / Bootstrap-like palette (`#3b71ca`, `#14a44d`, `#dc4c64`). New UI will be a **government portal** look (navy / saffron / white) using the official logo, not a generic SaaS theme |
| Policy PDFs / GR files | **Not in this workspace.** Live `/gr`, `/icici-document`, `/national-document` pages exist; files must be obtained officially before publishing |
| Student Excel template | Not in this workspace. An external university circular lists “Excel Sheet format for Student Data for SVYSY 2026-27”; columns must be verified in Phase 5 before locking the import schema |
| Branding colours from compiled CSS | Bootstrap/MDB defaults; not a distinctive government skin. Phase 2 will implement a professional government layout |

---

## 6. Missing information (blockers for later phases, not Phase 1)

| Topic | Status | When needed |
|-------|--------|-------------|
| Official GR text / policy numbers | Missing in workspace | Phase 2 content, Phase 9 |
| Authoritative insurance terms / coverage table | Partial text on `/personal-accidents`; must be verified | Phase 2 / 7 |
| Premium amounts | Appears in third-party news; **not** used as official content | Never, unless official source provided |
| Admin login credentials for the **old** system | Not provided | Phase 9 migration |
| New admin credentials | Use `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars only | Phase 3 |
| MongoDB of the **old** application | Unknown. Old APIs are PHP on `admin.svyuvasuraksha.org` | Phase 9 |
| Object storage account | Not provided; env placeholders only | Phase 6 |
| Complete student field list from live Excel | Not yet verified against an official template | Phase 5 |
| District / Taluka / JD Region / University master lists | Not supplied | Phase 3 signup (seed or admin-managed reference data) |
| Domain / SSL / production hosts for the **new** app | Not provided | Phase 10 |

---

## 7. Recommended architecture

New independent application (this repo):

```
sv-yuva-suraksha/
  frontend/     React + Vite + TypeScript + React Router + Tailwind + Axios + RHF + Zod
  backend/      Node.js + Express + TypeScript + Mongoose
  docs/         Architecture, schema, API, security, backup, migration
```

- **Database:** MongoDB Atlas, database name **`SVYSY`** (requested as “collection SVYSY”; implemented as the **database**, with proper collections inside it).
- **Auth (Phase 3):** JWT + Argon2/bcrypt, roles `ADMIN` and `COLLEGE`.
- **Isolation:** College APIs always scope by `instituteId` from the token, never from the client body/query.
- **Files (Phase 6):** S3-compatible object storage via env (`STORAGE_ENDPOINT`, `STORAGE_BUCKET`, keys). No large files in MongoDB or in the frontend repo.
- **Secrets:** `.env` only. Never in frontend. Never committed.

### Collections (created in Phase 1 as empty collections)

`users`, `universities`, `institutes`, `students`, `documents`, `enrollments`, `insurance`, `payments`, `uploads`, `auditLogs`, `notifications`, `settings`

---

## 8. Implementation plan (phased)

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Repo, Vite frontend, Express backend, env, gitignore, MongoDB `SVYSY` connection, health API | **Starting now** |
| **2** | Public website: header, footer, home, public/policy pages, responsive layout | Wait for instruction |
| **3** | Auth: admin login, college signup/login, JWT, RBAC, protected routes | Wait |
| **4** | Admin dashboard: universities, institutes, students, search/filter, reports | Wait |
| **5** | College dashboard: profile, students, add/edit, Excel upload | Wait |
| **6** | Documents, object storage, admin review | Wait |
| **7** | Enrollment, insurance, payment status, e-card | Wait |
| **8** | Hardening: rate limit, audit completeness, file validation, security review | Wait |
| **9** | Data migration analysis/export/import (non-destructive) | Wait |
| **10** | Production deploy, SSL, backups, monitoring | Wait |

After each phase: run the app, fix errors, update docs, then stop for instruction.

---

## 9. Data migration (preview only — no destructive action)

Do **not** shut down or overwrite the old system.

Known facts:

1. Public + portal are React SPAs.
2. Write/read APIs appear to be PHP on `admin.svyuvasuraksha.org`.
3. Database technology of the old system is **not confirmed** (PHP + file uploads at `/uploads1/` suggests a traditional server DB, possibly MySQL, plus filesystem documents).
4. Record counts are unknown without authorized access.
5. Excel upload and student/institute/university APIs exist, so a relational/document mapping is feasible once an export is provided.

Full investigation belongs in `docs/DATA_MIGRATION.md` during Phase 9.

---

## 10. Phase 1 success criteria

- Frontend `npm run dev` and `npm run build` work
- Backend `npm run dev` and `npm run build` work
- Backend connects to MongoDB Atlas database **`SVYSY`**
- Required collections exist (empty is acceptable)
- `GET /api/health` reports API + database status
- Frontend can call the health endpoint
- `.env.example` exists; real `.env` is gitignored
- No secrets in frontend source

Authentication, public pages, and dashboards are **out of scope** for Phase 1.
