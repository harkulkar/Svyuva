# Reporting guide

`GET /api/admin/reports` still returns aggregation charts.

Filtered exports:

- Admin: `GET /api/admin/reports/preview` and `/export?category=&format=csv|xlsx`
- College: `GET /api/college/reports/preview` and `/export` (own institute; institutes/registrations forbidden)

Categories: institutes, students, insurance, payments, documents, ecards, registrations, activity.

Security: authentication, RBAC, `MAX_EXPORT_ROWS`, sanitized filenames, no secrets in URLs, `REPORT_EXPORTED` audit, spreadsheet formula neutralization. PDF is not implemented.
