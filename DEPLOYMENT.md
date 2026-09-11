# Deployment

Provider-neutral deployment notes for the SV Yuva Suraksha Yojana rebuild. **No hosting vendor is selected in this repository.** Commands and hostnames that are not decided are **TODO: CONFIGURE**.

Do not put production secrets in this file.

The **old** live hosts remain the current public system until cutover is formally approved:

- Public (old): https://svyuvasuraksha.org/
- College (old): https://app.svyuvasuraksha.org/
- Admin (old): https://admin.svyuvasuraksha.org/

The new application is a **single SPA** (public + college + admin) plus a **Node API**. New production hostnames for that SPA and API are **TODO: CONFIGURE**. Do not change DNS from this repository.

---

## Architecture

```
Browser
  → Frontend static files (HTTPS)
  → Backend API (HTTPS)
       → MongoDB Atlas (TLS, not exposed to the browser)
       → Object storage (when document APIs exist)
       → Email (PRODUCTION CONFIGURATION REQUIRED — transport not implemented)
```

Environments: `development` | `test` | `staging` (operator-defined URI) | `production`.

---

## Frontend

1. Set `frontend/.env` with `VITE_API_URL` to the **https** API origin. This value is baked in at build time.
2. `npm run build -w frontend` (or `npm run build` from the repo root).
3. Serve `frontend/dist` over HTTPS.
4. SPA refresh on nested routes requires a fallback to `index.html`:
   - nginx: `deploy/nginx-spa.conf.example`
   - Netlify-style: `frontend/public/_redirects`
   - IIS: `frontend/public/web.config`

Routes that exist in this SPA include `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`, `/admin`, `/college`, `/college/students`, `/college/insurance` (placeholder), `/college/documents` (placeholder), `/college/ecard` (placeholder), `/college/payment-status` (placeholder), `/college/review` (placeholder). There is no top-level `/students` or `/payment` route.

---

## Backend

1. `npm run build -w backend`
2. `NODE_ENV=production npm start` (`node dist/server.js` in the backend workspace)
3. Health: `GET /api/health` and `GET /api/health/db`
4. Trust proxy is enabled in production (TLS terminator in front).
5. CORS allowlist: `FRONTEND_ORIGIN` / `FRONTEND_URL` / `CLIENT_URL`. Not `*`.
6. Cookies: HttpOnly; `Secure` in production; `COOKIE_SAMESITE=strict` recommended when SPA and API share a site.

Example reverse proxy: `deploy/nginx-api.conf.example`.

---

## MongoDB Atlas

- Database name: `SVYSY` (application). Staging/test must use a **different** URI or database name (`SVYSY_TEST` is used by automated tests).
- Least-privilege database user; TLS (`mongodb+srv`).
- Network access: application host IPs only. Not `0.0.0.0/0` in production.
- Indexes are created by Mongoose on startup; partial unique `{ legacySystem, legacyId }` is repaired in `connectDatabase`.
- Backups: Atlas snapshots. Procedure: `BACKUP_RESTORE.md`.
- The browser never receives `MONGODB_URI`.

Production localhost MongoDB is **not** allowed.

---

## Storage

S3-compatible variables: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. Document HTTP APIs are not live (Phase 7). Do not expose private buckets as public websites.

---

## Email

**PRODUCTION CONFIGURATION REQUIRED.** `SMTP_*` / `EMAIL_*` are accepted as env aliases. The process logs that SMTP is missing in production and does not send mail. Do not invent a provider.

---

## DNS / TLS

- Registrar, DNS, certificates: **TODO: CONFIGURE**
- HTTPS only in production
- Do not point the old live names at the new stack until `PRODUCTION_CUTOVER_PLAN.md` is complete

---

## CI/CD

GitHub Actions: `.github/workflows/ci.yml`

1. Install  
2. Lint  
3. Unit tests  
4. Production build  
5. `npm audit` (non-blocking while known `xlsx` findings remain)

Integration tests need Atlas and are **not** auto-run. There is **no** job that deploys `main` to production.

Suggested mapping (when a hoster is chosen): `development` → staging; `main` → production **with manual approval**.

---

## Containers (optional)

Examples only: `deploy/Dockerfile.api`, `deploy/Dockerfile.web`, `deploy/compose.example.yml`.

---

## Backup / restore / rollback

- `BACKUP_RESTORE.md`
- `PRODUCTION_ROLLBACK_PLAN.md`
- `DISASTER_RECOVERY.md`

---

## Monitoring

`MONITORING.md` — vendor **TODO: CONFIGURE**.
