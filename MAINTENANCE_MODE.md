# Maintenance mode

Environment (not exposed to browsers):

```
MAINTENANCE_MODE=true
MAINTENANCE_ALLOW_ADMIN=true
```

Defaults are **false** (safe).

## When enabled

- `GET /api/health` and `GET /api/health/db` continue to answer (uptime probes).
- Other API routes return HTTP **503** with code `MAINTENANCE` and a `requestId`.
- If `MAINTENANCE_ALLOW_ADMIN=true`, login/refresh and authenticated **ADMIN** calls still work so operators can use System health.
- College and unauthenticated portal APIs are blocked.
- The public website is a static SPA and **keeps rendering** information pages without the API.
- The SPA shows `/maintenance` when it receives `MAINTENANCE`.

Do not put `MAINTENANCE_MODE` into `VITE_*` (that would bake it into the public bundle).
