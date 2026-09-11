# Operations logging

Production logs must not grow without a retention policy on the **hosting platform**. This application writes structured JSON to stdout/stderr. It does not ship a built-in log file rotator (no hosting provider is assumed).

## Format

Each line is JSON:

```json
{
  "timestamp": "2026-09-09T00:00:00.000Z",
  "level": "info",
  "message": "http",
  "requestId": "…",
  "method": "POST",
  "route": "/api/auth/login",
  "status": 200,
  "durationMs": 120
}
```

Errors include `category`, `status`, and a **safe** message. Passwords, tokens, API keys, database URIs, payment credentials, request bodies, response bodies, and uploaded files are not logged.

## Correlation

- Incoming `X-Request-ID` / `X-Request-Id` is reused when it matches `[\w-]{8,128}`.
- Otherwise a UUID is generated.
- The same value is returned on `X-Request-ID` and `X-Request-Id`.
- Failed JSON responses include `requestId` for support.

## Retention / rotation / access / archival

| Topic | Value |
| --- | --- |
| Retention | TODO: CONFIGURE on the log sink (for example 30–90 days) |
| Rotation | Platform log rotation / log driver — TODO: CONFIGURE |
| Access | Administrators and on-call only — TODO: CONFIGURE |
| Archival | TODO: CONFIGURE (cold storage if required by policy) |

Do not copy production logs into this git repository.
