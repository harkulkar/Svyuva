# Load test plan

**Do not run destructive or high-volume tests against production.** Use staging.

Repeatable scenarios (authenticated where required):

1. Login (`POST /api/auth/login`) — stay within rate limits
2. Admin dashboard `GET /api/admin/dashboard`
3. College dashboard `GET /api/college/dashboard`
4. Student list with pagination
5. Institute list with pagination
6. Search `GET /api/admin/search?q=`
7. Document listing — **N/A until document HTTP APIs exist**
8. Report generation `GET /api/admin/reports`

Tooling: TODO: CONFIGURE (k6, artillery, or platform load test). Record p95 `durationMs`, error rate, and Atlas metrics. Stop if the staging cluster approaches production-sharing limits.
