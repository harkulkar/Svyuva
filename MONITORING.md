# Monitoring readiness

No third-party vendor is mandated yet. Wire the signals below into the platform you choose (**TODO: CONFIGURE**).

---

## Health endpoints

| Endpoint | Purpose | Safe content |
| --- | --- | --- |
| `GET /api/health` | Liveness + DB connected flag | `status`, `database.connected` |
| `GET /api/health/db` | DB ping | `status`, `database.connected`; HTTP 503 if ping fails |

Do not scrape these for URIs, env vars, collection lists, or secrets.

Suggested probe: HTTP 200 and `data.status === "ok"` on `/api/health`.

---

## Application logs

Backend logs JSON-ish lines via `logger` with:

- `requestId`
- method, path (query string stripped)
- status, durationMs
- userId and role when authenticated

**Do not** send passwords, JWTs, refresh tokens, API keys, storage tokens, payment credentials, or reset URLs to the log sink.

Unhandled errors are logged with name/message only (no stack in HTTP responses).

---

## Signals to alert on

| Signal | How to see it today | Suggested alert |
| --- | --- | --- |
| Application 5xx | `http` log `status >= 500` | Error rate vs baseline |
| Database errors | `GET /api/health/db` 503; Mongo connection logs | Consecutive failures |
| Authentication failures | Audit `LOGIN_FAILED`; 401/403 rates | Spike (credential stuffing) |
| Rate limiting | HTTP 429 `RATE_LIMITED` | Sustained 429 on `/api/auth/login` |
| Upload failures | 400 `INVALID_FILE_TYPE` / `FILE_TOO_LARGE`; audit `STUDENT_EXCEL_UPLOADED` | Unusual failure ratio |
| API latency | `durationMs` on `http` logs | p95 above TODO: CONFIGURE |
| Storage failures | Not live until Phase 7 document APIs | TODO: CONFIGURE |

---

## Audit trail (security, not APM)

Admin audit log UI: `/admin/audit-logs`  
API: `GET /api/admin/audit-logs` (ADMIN only)

Useful actions: `LOGIN_SUCCESS`, `LOGIN_FAILED`, `PASSWORD_CHANGED`, `INSTITUTE_APPROVED`, `INSTITUTE_REJECTED`, `DATA_EXPORT`, student Excel events.

---

## Frontend

Browser errors: TODO: CONFIGURE (for example a privacy-respecting RUM tool). Do not load analytics that send student PII.

Uptime of the static host: TODO: CONFIGURE.

---

## On-call

Roster, severity definitions, and paging: TODO: CONFIGURE.
