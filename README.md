# SV Yuva Suraksha Yojana

New production codebase for **Swami Vivekananda Yuva Suraksha Yojana** (SVYSY): public website, college/institute portal, and admin portal.

Whole-project map (portals, Excel, submissions, APIs, phases, doc index): [PROJECT.md](./PROJECT.md).

This is an independent rebuild. The live site at [https://svyuvasuraksha.org/](https://svyuvasuraksha.org/) is used as a **reference** for navigation, content, and branding. Compiled JavaScript from the old application is not used as architecture.

**Current development phase: 15 complete** (workflow overlay + college Excel → premium → submit → admin). Phase 16 (document/insurance/payment/e-card HTTP) is not started. The old production hosts stay live.

The old production hosts stay live. This repo does not change DNS or shut them down. See [PHASE_11_FINAL_REPORT.md](./PHASE_11_FINAL_REPORT.md).

Insurance, documents, e-card, and payment **HTTP APIs** are still later work (UI placeholders). Password-reset email is **PRODUCTION CONFIGURATION REQUIRED**.

## Architecture

```
sv-yuva-suraksha/
├── frontend/     React + Vite + TypeScript + Tailwind CSS
├── backend/      Node.js + Express + TypeScript + Mongoose
├── migration/    Phase 8 dry-run / staging / reports (read-only vs old system)
├── docs/         Architecture, schema, API, security, backup, migration
├── .env.example
└── PROJECT_ANALYSIS.md
```

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, React Router, Axios, Tailwind CSS, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas, database name **`SVYSY`** |
| Auth (Phase 3) | JWT, bcrypt, role-based access (`ADMIN`, `COLLEGE`) |
| Files (Phase 6) | S3-compatible object storage via environment variables |

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- MongoDB Atlas cluster with network access for this machine
- Object storage credentials (Phase 6)

## Installation

From the repository root (`sv-yuva-suraksha/`):

```bash
copy .env.example .env
```

Edit `.env` and set `MONGODB_URI` (database name must be `SVYSY`).

Frontend Vite variables:

```bash
copy .env.example frontend\.env
```

Keep only `VITE_API_URL=http://localhost:4000` in `frontend/.env`.

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Health: http://localhost:4000/api/health

Phase 1 home page shows whether the API and MongoDB are connected.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and Vite together |
| `npm run build` | Production build of backend and frontend |
| `npm run lint` | Typecheck / ESLint |
| `npm run ci` | Lint + unit tests + production build (no Atlas required) |
| `npm start` | Run compiled API (`backend/dist`) |
| `npm run seed:admin` | Create a development ADMIN user if missing (`ALLOW_ADMIN_SEED=true` required) |
| `npm run migration:dry-run` | Phase 8: read authorized export, validate, write reports (no DB writes) |
| `npm run migration:staging` | Phase 8: idempotent upsert into `MONGODB_URI_MIGRATION_STAGING` |
| `npm run migration:verify` | Phase 8: sample relationship checks on staging |
| `npm run maintenance:check-db` | Read-only DB ping and estimated collection counts |
| `npm run maintenance:check-storage` | Read-only orphan/missing file report (does not delete) |
| `npm run maintenance:check-indexes` | Read-only index name review |
| `npm run maintenance:verify-backup` | Backup file presence if `BACKUP_VERIFY_DIR` is set |

## Environment variables

See `.env.example`. Never commit `.env`.

Required for Phase 3:

- `MONGODB_URI`
- `MONGODB_DB_NAME=SVYSY`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (each at least 32 characters)
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`
- `CLIENT_URL` / `FRONTEND_ORIGIN`
- `VITE_API_URL` (frontend only)

Optional development seed (never enable in production unless explicitly required):

- `ALLOW_ADMIN_SEED=true`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`

Do not hardcode admin credentials in React.

## MongoDB

The application uses Atlas database **`SVYSY`**. On startup the API creates these collections if they are missing:

`users`, `universities`, `institutes`, `students`, `documents`, `enrollments`, `insurance`, `payments`, `reviews`, `ecards`, `uploads`, `auditLogs`, `notifications`, `settings`, `refreshTokens`, `migrationIdMaps`, `migrationRuns`, `migrationIssues`

If the health endpoint cannot connect, check Atlas IP access list and the URI.

## Documentation

| File | Contents |
|------|----------|
| [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) | Workspace inspection and phase plan |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Collections (filled as models are added) |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | REST API overview |
| [docs/ADMIN_PORTAL.md](./docs/ADMIN_PORTAL.md) | Admin dashboard, approvals, reports, audit |
| [docs/DATA_MIGRATION.md](./docs/DATA_MIGRATION.md) | Pointer to Phase 8 `migration/` |
| [migration/README.md](./migration/README.md) | Dry-run, staging, reports, rollback, cutover checklist |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Frontend/API/Atlas/CORS/CI (no secrets) |
| [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) | Staging UAT |
| [PRODUCTION_CUTOVER_PLAN.md](./PRODUCTION_CUTOVER_PLAN.md) | Cutover gates; old system stays up |
| [PRODUCTION_ROLLBACK_PLAN.md](./PRODUCTION_ROLLBACK_PLAN.md) | New-stack rollback; old system untouched |
| [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md) | Operations |
| [PHASE_11_FINAL_REPORT.md](./PHASE_11_FINAL_REPORT.md) | Phase 11 operations status |
| [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) | Daily / weekly / monthly checks |
| [ADMIN_SUPPORT_GUIDE.md](./ADMIN_SUPPORT_GUIDE.md) | Support troubleshooting |
| [docs/BACKUP_AND_RESTORE.md](./docs/BACKUP_AND_RESTORE.md) | Backup process |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security requirements |

## Troubleshooting

**MongoDB `IP not whitelisted` / `querySrv ENOTFOUND`:** add this machine (or `0.0.0.0/0` for a locked-down development cluster) in Atlas Network Access. Confirm the cluster hostname.

**MongoDB `querySrv ECONNREFUSED` on Windows:** Node’s DNS resolver can fail Atlas SRV lookups while `nslookup` works. The API sets IPv4-first DNS (`8.8.8.8`) on Windows before connecting. You can also switch the Atlas user password if credentials were exposed.

**Frontend cannot reach API:** start backend first, confirm `VITE_API_URL`, confirm `FRONTEND_ORIGIN` matches the Vite origin.

**Do not paste Atlas passwords into git, tickets, or frontend code.** If a URI was shared in chat, rotate the database user password before production.

## Phases

1. Project setup (this phase)
2. Public website
3. Authentication
4. Admin dashboard
5. College dashboard / students / Excel
6. Documents / object storage
7. Enrollment / insurance / e-card / payment status
8. Security hardening
9. Data migration tooling (this tree: `migration/`)
10. Production deployment (this tree: prepared only — no live cutover)

Phase 10 does **not** cut over production or modify the old hosts. See [PRODUCTION_CUTOVER_PLAN.md](./PRODUCTION_CUTOVER_PLAN.md).
