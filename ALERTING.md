# Alerting

Wire these signals into the monitoring product you choose. Contact points are **TODO: CONFIGURE**. Do not invent email addresses or phone numbers.

| Alert | Trigger | Severity | Who should respond | Recommended first action |
| --- | --- | --- | --- | --- |
| Backend unavailable | `GET /api/health` fails or no process | P1 | TODO: CONFIGURE | Check process/host; do not change DNS blindly |
| Repeated HTTP 5xx | `http` logs `status >= 500` above baseline | P1/P2 | TODO: CONFIGURE | Inspect `requestId`; roll back last deploy if correlated |
| Database unavailable | `GET /api/health/db` 503 or `slow_query`/`db_command_failed` burst | P1 | TODO: CONFIGURE | Atlas status; do not restore over production |
| Storage unavailable | Storage health `not_configured` after go-live **or** upload/download 5xx when document APIs exist | P2 | TODO: CONFIGURE | Confirm bucket from secret store; document APIs are not live yet |
| Excessive authentication failures | Audit `LOGIN_FAILED` spike / 429 on `/api/auth/login` | P2 | TODO: CONFIGURE | Rate-limit already on; review audit; do not email passwords |
| Repeated upload failures | `FILE_TOO_LARGE` / `UPLOAD_ERROR` / Excel import failures | P3 | TODO: CONFIGURE | Check file type/size; college isolation still applies |
| High API latency | `durationMs` p95 above TODO: CONFIGURE | P3 | TODO: CONFIGURE | Check DB `slow_query` logs; avoid full-collection scans |
| Application crash | `uncaught_exception` / process exit | P1 | TODO: CONFIGURE | Restart from known build; collect logs by `requestId` |

External uptime probe: `GET /api/health` expecting HTTP 200 and `data.status` of `ok` (or `degraded` with a separate DB alert). Never scrape health for URIs or secrets.
