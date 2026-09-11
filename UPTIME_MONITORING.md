# Uptime monitoring

If the host supports an external HTTP check, probe:

`GET /api/health`

Expect HTTP 200. Treat `data.status === "ok"` as healthy. `degraded` means the process is up but MongoDB is not connected — page the database alert, not a “fake healthy” SPA.

`GET /api/health/db` is a deeper DB ping (503 when unavailable). Do not expose it with extra inventory or secrets (it does not).

| Item | Value |
| --- | --- |
| Probe URL | TODO: CONFIGURE |
| Interval | TODO: CONFIGURE |
| Public status page | Not approved — keep internal unless explicitly authorised |

Frontend static hosting uptime is separate from the API. The public website does not require the API to render scheme pages.
