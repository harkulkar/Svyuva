# SV Yuva Suraksha Yojana — Project overview

**Product:** Swami Vivekananda Yuva Suraksha Yojana (SVYSY)  
**Workspace:** `D:\Fresh SVY`  
**Codebase:** independent rebuild of the public website, college/institute portal, and admin portal  
**Status:** Phases 1–15 implemented in this repo (September 2026)  
**Reference sites (old production, not modified by this repo):** [svyuvasuraksha.org](https://svyuvasuraksha.org/), [app.svyuvasuraksha.org](https://app.svyuvasuraksha.org/), [admin.svyuvasuraksha.org](https://admin.svyuvasuraksha.org/)

This file is the whole-project map. Topic guides (Excel, premium, workflow, migration, operations) stay in their own markdown files; this document tells you what exists, where it lives, and how it fits together.

This is **not** official Government of Maharashtra or insurer policy. Where official rates, document lists, or academic-year calendars were not recovered, the code is marked `TODO: VERIFY …` and does not invent values.

---

## 1. What this system is

A college uploads student data for the scheme, the backend validates Excel and calculates premium from a **configurable** rule (not a hardcoded official tariff), the college submits a locked package, and admin reviews it.

Three user-facing surfaces share one React app and one Express API:

| Surface | Who | What it does |
|---------|-----|----------------|
| Public website | Anyone | Scheme information, policies, contact, login/signup, public AI assistant |
| College portal | `COLLEGE` role | Own institute only: students, Excel upload, submissions, profile, notifications |
| Admin portal | `ADMIN` role | Statewide institutes/students, work queue, submissions review, reports, settings |

College APIs **ignore** client-supplied `instituteId`. A college cannot read another college’s students, submissions, premium, or error workbooks.

---

## 2. Current status

| Area | State |
|------|--------|
| Public site, auth, college/admin shells | Live in this codebase |
| Student master + Excel roster import | Working (`/college/students/upload`) |
| Scheme submission (Excel → premium → submit → admin) | Working (Phase 15 Part B) |
| Workflow overlay, work queue, action center | Working (Phase 15 Part A) |
| Notifications, analytics, reports, AI (read-only tools) | Working |
| Document **file** upload/download HTTP | Feature-flagged; typically **501** |
| Insurance / payment / e-card **HTTP APIs** | Feature-flagged; typically **501** (status UI placeholders exist) |
| Live payment gateway | Not implemented |
| Legacy production data migration into this DB | Tooling exists; **not** a production cutover |
| Old production hosts / DNS | **Untouched** |

**Recommended next work (Phase 16, not started):** authorised document, insurance, payment, and e-card HTTP with short-lived file access. Do not migrate legacy production data or shut down the old portal unless a later dedicated phase is approved.

---

## 3. Architecture

```
Browser (React 18 + Vite + TypeScript + Tailwind)
        |
        | JSON over HTTP, HttpOnly cookies (access + refresh JWT)
        v
Express API (Node.js 20+ + TypeScript)
        |
        +--> MongoDB Atlas  (database name: SVYSY)
        +--> S3-compatible object storage (documents; file HTTP often disabled)
        +--> Optional email (password reset / notifications — PRODUCTION CONFIGURATION REQUIRED)
```

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, TypeScript, React Router, Axios, Tailwind CSS, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript, Mongoose, Zod, Multer, `xlsx` |
| Auth | JWT in HttpOnly cookies, bcrypt passwords, roles `ADMIN` and `COLLEGE` |
| Tests | Backend `tsx --test`; frontend Vitest |

### Repository layout

```
Fresh SVY/
├── frontend/          React app (public + college + admin)
├── backend/           Express API
├── migration/         Phase 8 dry-run / staging / reports (read-only vs old system)
├── docs/              Architecture, schema, API, security, backup
├── deploy/            Deployment notes
├── .env.example
├── package.json       npm workspaces (frontend + backend)
├── README.md          Install / run
└── PROJECT.md         This file
```

### Backend (`backend/src/`)

| Folder | Role |
|--------|------|
| `config/` | Env, MongoDB, academic year, Excel limits, collections |
| `routes/` | `/api/health`, `/api/auth`, `/api/admin`, `/api/college`, public data |
| `controllers/` | HTTP handlers |
| `services/` | Students, submissions, Excel parse, premium, audit, institutes |
| `models/` | Mongoose schemas |
| `validators/` | Zod request schemas |
| `middleware/` | Auth, roles, rate limits, Excel upload |
| `workflow/` | Overlay state machine, work queue, action center |
| `notifications/` | In-app + email notifications |
| `analytics/` | Dashboards, reports, jobs |
| `ai/` | Read-only assistant tools / RAG (no approve/reject) |
| `migration/` | Import pipeline used by `migration/` CLI |

### Frontend (`frontend/src/`)

| Folder | Role |
|--------|------|
| `pages/public/` | Public website |
| `pages/auth/` | Login, signup, password reset |
| `pages/college/` | College portal |
| `pages/admin/` | Admin portal |
| `pages/portal/` | Shared notifications / AI / module records |
| `components/` | Layout, forms, submission/workflow UI |
| `services/api.ts` | Axios client |
| `context/AuthContext.tsx` | Session |
| `data/` | Public copy + portal nav |
| `routes/` | React Router |

---

## 4. How to run locally

Prerequisites: Node.js 20+, npm 10+, MongoDB Atlas (database **`SVYSY`**).

```bash
copy .env.example .env
copy .env.example frontend\.env
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:4000  
- Health: http://localhost:4000/api/health  

Keep `VITE_API_URL=http://localhost:4000` in `frontend/.env`. Set `MONGODB_URI`, JWT secrets (≥32 characters), and `FRONTEND_ORIGIN` in root `.env`. Never commit `.env`.

| Command | Purpose |
|---------|---------|
| `npm run dev` | API + Vite together |
| `npm run build` | Production build |
| `npm run lint` | Typecheck / ESLint |
| `npm run test:unit` | Unit tests (no Atlas for most) |
| `npm run ci` | Lint + unit tests + build |
| `npm run seed:admin` | Dev ADMIN user (`ALLOW_ADMIN_SEED=true`) |

---

## 5. Roles and security (non-negotiable)

| Role | Scope |
|------|--------|
| `ADMIN` | All institutes, students, submissions, work queue, settings |
| `COLLEGE` | Only the `instituteId` on the signed-in user |

- Access and refresh tokens are **HttpOnly cookies**, not localStorage JWT for the session.  
- College cannot approve its own registration or invent premium/student counts on submit.  
- AI tools are **read-only**; they cannot approve, reject, or change records.  
- Excel formula-like cells are sanitized. File type/size/row limits are enforced on the server.  
- Stack traces are not returned in production JSON.

JSON envelope:

```json
{ "success": true, "message": "OK", "data": {} }
```

```json
{ "success": false, "message": "Readable message", "code": "ERROR_CODE" }
```

---

## 6. Portals and main screens

### Public website

Home, about/scheme, implementing body, nodal agency, insurance / personal accidents / mediclaim, documents, downloads/GR, useful links, contact, FAQ, press, GIGW-style policy pages, public AI assistant, login, signup, forgot/reset password.

### College portal (`/college`)

| Path | Purpose |
|------|---------|
| `/college` | Dashboard |
| `/college/submissions` | Scheme submissions (draft → submit) |
| `/college/submissions/new` | Create draft for an academic year |
| `/college/submissions/:id/upload` | Upload/validate Excel for that submission |
| `/college/submissions/:id/preview` | Preview validated rows |
| `/college/submissions/:id/premium` | Backend-calculated premium |
| `/college/submissions/:id/review` | Declare and submit (locks the pack) |
| `/college/students` | Roster |
| `/college/students/add` | Manual add student |
| `/college/students/upload` | Roster Excel import (**not** a scheme submission) |
| `/college/notifications`, `/college/profile` | Alerts, profile |
| `/college/reports` | College reports |
| `/college/insurance`, `/documents`, `/ecard`, `/payment-status`, `/review` | Placeholders / metadata until HTTP APIs are enabled |
| `/college/ai-assistant` | Read-only assistant |

### Admin portal (`/admin`)

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard |
| `/admin/submissions` | College scheme submissions |
| `/admin/work-queue` | Workflow tasks / assignment |
| `/admin/universities`, `/admin/institutes`, `/admin/students` | Master data |
| `/admin/registrations` | College signup approve / reject / correction |
| `/admin/reports`, `/admin/audit-logs`, `/admin/login-activity` | Oversight |
| `/admin/notifications`, `/admin/announcements` | Comms |
| `/admin/system-jobs`, `/admin/system-health`, `/admin/storage-health`, `/admin/support` | Operations |
| `/admin/knowledge`, `/admin/ai-assistant`, `/admin/ai-usage` | AI |
| `/admin/settings`, `/admin/users`, `/admin/profile` | Config |

---

## 7. College data: two Excel paths

Both use the **same template and parser**. They are different products:

1. **Roster import** — `/college/students/upload` — adds students to the college list. Not a locked scheme submission.  
2. **Scheme submission** — `/college/submissions/.../upload` — Excel is attached to a draft `DataSubmission`. Confirm writes students with `submissionId`. Submit locks the pack for admin.

### Template columns

Headings only (no sample student rows). **TODO: VERIFY AGAINST OFFICIAL STUDENT FORMAT.**

| Column | Required |
|--------|----------|
| Sr No | Yes (also used as roll number) |
| Student ID No | Yes (also stored as enrollment number) |
| Student Name | Yes (split into first / middle / last) |
| Parent Name | Yes |
| Student's DOB | Yes |
| Parent's DOB (Optional) | No |
| Age | No (computed from student DOB if blank) |
| Parent -Age | No (not cross-checked against parent DOB) |
| Student Gender | Yes (`Male` / `Female` / `Other`) |
| Father/Mother | Yes (`Father` / `Mother`) |
| Student's Mail Id | Yes |
| Student's Mobile No | Yes (10-digit Indian mobile) |

Course, year of study, and academic year are **not** on the sheet. Import stores course as `Not specified`, year as `First Year`, and academic year from the college year (roster) or the submission year (scheme pack).

See [EXCEL_VALIDATION.md](./EXCEL_VALIDATION.md).

---

## 8. Scheme submission flow (Phase 15)

Excel work in a draft is **not** a submission. Only submit after confirm + complete backend premium.

```
College login
  → New submission (academic year from settings)
  → Upload Excel → server validate → preview
  → Confirm student data (writes Student rows)
  → Calculate premium (backend only; ignores client amounts)
  → Review + declaration
  → Submit → locked
  → Admin list/detail/review (approve / reject / correction)
```

**Statuses:** `DRAFT` → `VALIDATING` → `VALIDATED` → `PREMIUM_CALCULATED` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` | `REJECTED` | `CORRECTION_REQUIRED`

After submit the college cannot replace Excel, students, premium, or status unless admin sets `CORRECTION_REQUIRED`. Double submit is idempotent.

**Premium:** configurable per-student rate × confirmed student count. Official GoM/insurer rates were **not** found in recovered source. GST is not applied. **TODO: VERIFY OFFICIAL PREMIUM RULE.** Admin can set a rule; do not seed a production rate until an authorised value exists.

Excel **bytes** are not stored in object storage. Checksum, filename, size, parsed rows (TTL `UploadJob`), and `Student` documents after confirm are what persist.

Details: [COLLEGE_SUBMISSION_FLOW.md](./COLLEGE_SUBMISSION_FLOW.md), [PREMIUM_CALCULATION.md](./PREMIUM_CALCULATION.md), [ADMIN_SUBMISSION_GUIDE.md](./ADMIN_SUBMISSION_GUIDE.md).

---

## 9. Workflow overlay (Phase 15)

Entity records stay canonical (`Institute.status`, `Student`, `Document.fileStatus`, etc.). A `WorkflowInstance` + history + tasks overlay supports:

- College registration: start review, approve, reject, request correction, resubmit  
- Admin work queue and assignment (bulk **assign** only, not bulk approve)  
- College action center  
- Document review status + versions (`fileStatus` unchanged)  
- Excel upload overlay states (best-effort if overlay write fails after a successful parse)

See [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md), [WORK_QUEUE_GUIDE.md](./WORK_QUEUE_GUIDE.md), [WORKFLOW_SECURITY.md](./WORKFLOW_SECURITY.md).

---

## 10. Data model (MongoDB `SVYSY`)

Collections the API expects (created on startup if missing):

`users`, `universities`, `institutes`, `students`, `documents`, `enrollments`, `insurance`, `payments`, `reviews`, `ecards`, `uploads`, `auditLogs`, `notifications`, `settings`, `refreshTokens`, `migrationIdMaps`, `migrationRuns`, `migrationIssues`, `knowledgeDocuments`, `knowledgeChunks`, `aiConversations`, `aiFeedback`, `aiUsage`, `announcements`, `notificationTemplates`, `emailLogs`, `jobRuns`, `dataSubmissions`, `premiumRules`, `premiumCalculations`, `submissionVersions`

Plus workflow collections used by Phase 15: `WorkflowInstance`, `WorkflowHistory`, `WorkflowTask`, document versions/requirements/checklists.

Student uniqueness (per institute): `studentId`; `enrollmentNumber`; (`academicYear` + `rollNumber`).

Schema notes: [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md).

---

## 11. API map (high level)

Base (dev): `http://localhost:4000`

| Prefix | Auth | Purpose |
|--------|------|---------|
| `GET /`, `GET /api/health` | Public | Liveness |
| `/api/auth/*` | Mixed | Login, signup, session, password reset, universities |
| `/api/college/*` | COLLEGE | Dashboard, students, Excel, submissions, workflow, records |
| `/api/admin/*` | ADMIN | Statewide data, submissions, work queue, operations |
| `/api/notifications/*` | Signed in | In-app notifications |
| `/api/ai/*` | Mixed | Assistant (read-only tools for signed-in roles) |

College submissions (session institute only):

- `GET/POST /api/college/submissions`  
- `POST /api/college/submissions/:id/upload`  
- `POST /api/college/submissions/:id/confirm`  
- `POST /api/college/submissions/:id/calculate-premium`  
- `POST /api/college/submissions/:id/submit` `{ declarationAccepted: true }`

Admin submissions:

- `GET /api/admin/submissions`  
- `POST /api/admin/submissions/:id/review`  
- `GET/PUT /api/admin/premium-rules`

Full lists: [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md), [PHASE_15_FINAL_REPORT.md](./PHASE_15_FINAL_REPORT.md).

---

## 12. Build phases (what each added)

| Phase | Theme |
|-------|--------|
| 1 | Repo, Express, Vite, MongoDB health |
| 2 | Public website |
| 3 | Auth, cookies, ADMIN / COLLEGE |
| 4 | Admin dashboard, institute registration |
| 5 | College students + Excel |
| 6 | Documents / object storage wiring |
| 7 | Enrollment / insurance / e-card / payment **status** (not live gateways) |
| 8 | Migration tooling (`migration/`) |
| 9 | Security / production checklist (no live cutover) |
| 10 | Deployment docs; old hosts stay up |
| 11 | Operations instrumentation |
| 12 | AI assistant (read-only) |
| 13 | Notifications, analytics, reports, jobs |
| 14 | PWA / mobile UX |
| 15 | Workflow overlay **and** college submit → premium → admin |
| 16 | Not started — flagged file/payment HTTP |

---

## 13. Tests

From repo root: `npm test` (workspaces). Backend integration tests need Atlas (`SVYSY_TEST` or the URI in env).

Notable files:

- `backend/src/phase15.unit.test.ts` — workflow rules, premium engine, Excel headers/rows  
- `backend/src/student.api.test.ts` — college isolation + roster Excel  
- `backend/src/submission.api.test.ts` — draft → submit → admin, isolation  
- `backend/src/workflow.e2e.test.ts` — add student + Excel import  
- `frontend/src/phase15.test.ts` — nav for work queue and submissions  

---

## 14. What this project will not do (unless a later phase says so)

- Copy compiled JavaScript from the old production bundles as architecture  
- Change DNS or shut down `svyuvasuraksha.org` / `app.` / `admin.`  
- Invent official premium rates, GST, or Government Resolution rules  
- Let AI approve or reject  
- Let a college see another college’s data  
- Treat roster Excel import as a scheme submission  

---

## 15. Documentation index

### Start here

| File | Contents |
|------|----------|
| [README.md](./README.md) | Install, env, scripts |
| [PROJECT.md](./PROJECT.md) | This overview |
| [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) | Original greenfield analysis (historical) |

### Product / Phase 15

| File | Contents |
|------|----------|
| [PHASE_15_FINAL_REPORT.md](./PHASE_15_FINAL_REPORT.md) | Workflow + submission completion report |
| [COLLEGE_SUBMISSION_FLOW.md](./COLLEGE_SUBMISSION_FLOW.md) | Draft → submit |
| [EXCEL_VALIDATION.md](./EXCEL_VALIDATION.md) | Template and server checks |
| [PREMIUM_CALCULATION.md](./PREMIUM_CALCULATION.md) | Configurable engine |
| [ADMIN_SUBMISSION_GUIDE.md](./ADMIN_SUBMISSION_GUIDE.md) | Admin review |
| [LEGACY_SUBMISSION_FLOW_ANALYSIS.md](./LEGACY_SUBMISSION_FLOW_ANALYSIS.md) | Old vs new flow |

### Workflow

| File | Contents |
|------|----------|
| [WORKFLOW_ENGINE.md](./WORKFLOW_ENGINE.md) | Overlay + entity sync |
| [WORKFLOW_STATES.md](./WORKFLOW_STATES.md) | States |
| [WORK_QUEUE_GUIDE.md](./WORK_QUEUE_GUIDE.md) | Admin queue |
| [APPROVAL_GUIDE.md](./APPROVAL_GUIDE.md) | Approvals |
| [DOCUMENT_VERSIONING.md](./DOCUMENT_VERSIONING.md) | Document versions |
| [WORKFLOW_SECURITY.md](./WORKFLOW_SECURITY.md) | Isolation and guards |

### Core docs

| File | Contents |
|------|----------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Collections |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | REST overview |
| [docs/COLLEGE_PORTAL.md](./docs/COLLEGE_PORTAL.md) | College portal |
| [docs/ADMIN_PORTAL.md](./docs/ADMIN_PORTAL.md) | Admin portal |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security requirements |

### Operations / production (prepared; no live cutover)

[DEPLOYMENT.md](./DEPLOYMENT.md), [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md), [PRODUCTION_CUTOVER_PLAN.md](./PRODUCTION_CUTOVER_PLAN.md), [PRODUCTION_ROLLBACK_PLAN.md](./PRODUCTION_ROLLBACK_PLAN.md), [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md), [migration/README.md](./migration/README.md).

Phase completion reports (`PHASE_*_FINAL_REPORT.md`, `PHASE_*_STATUS.md`) remain in the repo root for history.

---

## 16. Contact for implementers

- Academic year format in data: `YYYY-YY` (display may show `YYYY-YYYY`). Configurable via `academicYears.current` / `academicYears.available`.  
- Submission numbers: configurable prefix, default `SVYS` — **not official**.  
- Password-reset and notification email: configure before production.  
- If Atlas DNS fails on Windows, the API forces IPv4-first DNS; whitelist the machine in Network Access.
