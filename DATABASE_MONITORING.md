# Database monitoring (application view)

Administrators see **connection, ping time, and status** on `/admin/system-health`. They do not see MongoDB hostnames, URIs, collection inventories, or Atlas admin metrics.

| Concern | How |
| --- | --- |
| Connection failures | Health DB endpoint; `db_command_failed` logs |
| Query performance / slow queries | `slow_query` logs (`SLOW_QUERY_MS`, default 500). Command **name and duration only** — filters/documents are not logged |
| Collection growth | `npm run maintenance:check-db` estimated counts |
| Storage usage | Atlas console — TODO: CONFIGURE |
| Index health | `npm run maintenance:check-indexes` |

College users have no access to these endpoints.
