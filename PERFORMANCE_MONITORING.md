# Performance monitoring

Do not invent SLAs. Thresholds below are starting points from current application behaviour (paginated lists, export caps, Excel parse limits). Tune after staging load tests.

| Signal | How it is observed | Warning (starting point) |
| --- | --- | --- |
| API response time | `durationMs` on `http` logs | p95 above TODO: CONFIGURE (suggested starting watch: 2000 ms) |
| Database query time | `slow_query` log when duration ≥ `SLOW_QUERY_MS` (default 500) | Repeated slow commands |
| Page load | Browser / hosting RUM — TODO: CONFIGURE | TODO: CONFIGURE |
| Large tables | Server pagination `limit` ≤ 100 | Client must not request full dumps |
| Upload | Excel size/row/time env caps | Timeouts / `FILE_TOO_LARGE` |
| Download / export | `MAX_EXPORT_ROWS` (default 5000); formula neutralization | Export 429 via `exportLimiter` |

Load tests belong on **staging** (`LOAD_TEST_PLAN.md`). Do not run destructive load against production.
