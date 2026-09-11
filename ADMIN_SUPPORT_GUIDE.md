# Admin support guide

Administrators use `/admin/support`, `/admin/system-health`, `/admin/audit-logs`, and `/admin/login-activity`. Passwords are never displayed.

## Login problem

**Symptoms:** User cannot sign in; 401/403.  
**Possible causes:** Wrong password; `INACTIVE`/`PENDING` user; institute not `ACTIVE` (college); maintenance mode; JWT cookie/CORS mismatch.  
**What admin should check:** Users screen status; institute status; login activity failures; `requestId` on the error.  
**When to escalate:** P1 if all logins fail; suspected stuffing → `INCIDENT_RESPONSE.md`.

## College registration problem

**Symptoms:** Signup pending; cannot reach college portal.  
**Possible causes:** Still `PENDING`; `REJECTED`; incomplete form.  
**What admin should check:** `/admin/registrations`; audit `INSTITUTE_APPROVED` / `REJECTED`.  
**When to escalate:** Duplicate institutes or data corruption.

## Student import problem

**Symptoms:** Excel rejected or partial import.  
**Possible causes:** File type/size; row cap; validation errors; college isolation.  
**What admin should check:** College’s own students only; upload job issues; audit Excel events.  
**When to escalate:** Repeated `UPLOAD_ERROR` across institutes.

## Document upload / download problem

**Symptoms:** College “Documents” page is coming soon.  
**Possible causes:** Phase 7 HTTP APIs are not implemented.  
**What admin should check:** Storage health metadata counts; do not invent file URLs.  
**When to escalate:** If production promised document APIs without this work.

## Insurance / payment status / e-card / review problem

**Symptoms:** Coming soon UI.  
**Possible causes:** Feature flags default **false**; no HTTP API.  
**What admin should check:** `/admin/reports` scheme module counts (metadata only).  
**When to escalate:** Product decision to implement Phase 7 APIs.

## Password reset email

**Symptoms:** Forgot-password does not arrive.  
**Possible causes:** SMTP not implemented; `SMTP_HOST` empty.  
**What admin should check:** System health email implementation field.  
**When to escalate:** PRODUCTION CONFIGURATION REQUIRED for a mailer.
