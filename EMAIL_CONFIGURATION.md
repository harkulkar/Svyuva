# Email configuration

Environment only (never Mongo settings, never `VITE_*`):

- `EMAIL_PROVIDER=none|smtp`
- `EMAIL_ENABLED=true` required before settings can send
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` / `SMTP_PASSWORD`, `SMTP_FROM`
- aliases: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`

`emailService.sendEmail` / `sendTemplateEmail` / `sendBulkEmail` write `emailLogs` and **do not throw** if SMTP is missing.

If host is set, status is currently `TRANSPORT_NOT_IMPLEMENTED` (same as Phase 11). The application keeps running. Do not send test mail to real users.
