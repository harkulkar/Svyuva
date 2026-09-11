# Analytics architecture

Admin and college dashboards use MongoDB aggregations. The frontend never loads raw collections.

## APIs

- `GET /api/admin/dashboard` and `/dashboard/summary` — consolidated counts (cached briefly except in tests)
- `GET /api/admin/dashboard/analytics` — date range / university / institute / status filters (UTC on the server)
- `GET /api/admin/dashboard/activity` — recent audit rows
- `GET /api/admin/dashboard/insights` — attention list from computed stats; optional AI restatement
- `GET /api/college/dashboard` and `/dashboard/summary` — session `instituteId` only
- `GET /api/college/dashboard/insights` — same isolation

College query/body `instituteId` is ignored.

## Date ranges

`today`, `yesterday`, `last_7_days`, `last_30_days`, `last_90_days`, `this_month`, `previous_month`, `this_year`, `custom` (UTC). Display conversion is the client’s `toLocaleString`.

## Indexes

`createdAt`, `instituteId`, `universityId`, and `status` indexes exist on the collections used in aggregations.

## Performance

Aggregations `$limit` chart buckets. Dashboard summary is cached for `DASHBOARD_CACHE_SECONDS` (default 30; disabled in tests). Large exports use `MAX_EXPORT_ROWS` and batched cursors.
