# Scheduled jobs

In-process interval (`JOB_TICK_MS`, default 60s). Disabled when `NODE_ENV=test` or `JOBS_ENABLED=false`.

Jobs:

- `process_scheduled_announcements`
- `fanout_announcements`
- `send_pending_reminders`
- `process_email_queue`
- `cleanup_expired_notifications`

Each run is locked (`status=running` + `lockUntil`). Reminder rows use daily unique `reminderKey` values.

Admin UI: `/admin/system-jobs`. Retry is per named retryable job only — there is no run-everything action.

Not a distributed queue. A single API process should run the scheduler.
