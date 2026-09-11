# Notification architecture

The existing `notifications` collection is extended (not replaced).

## Lifecycle

1. Domain events (approve/reject, student import) or jobs/announcements call `createNotification`.
2. Unique `reminderKey` and `{userId, announcementId}` prevent duplicates.
3. Recipients read via `GET /api/notifications` (own `userId` only).
4. Mark read / mark all read.
5. Expired rows are deleted by `cleanup_expired_notifications`.

## Types

Account, upload, document, payment, insurance, e-card, review, system, announcement, reminder. Critical types (`ACCOUNT_APPROVED`, `ACCOUNT_REJECTED`, `SYSTEM_ALERT`) ignore preference opt-out.

## Announcements

Audience: ALL, ROLE, UNIVERSITY, INSTITUTES, USERS. Publish fans out in batches of 200. Unpublished drafts do not notify. Actions are audited.

## Templates

`notificationTemplates` with IN_APP / EMAIL and `en` / `hi` / `mr`. Only allow-listed `{{variables}}` are substituted. Official legal text: TODO: VERIFY OFFICIAL CONTENT.
