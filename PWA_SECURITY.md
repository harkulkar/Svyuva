# PWA SECURITY

The service worker is a privileged client-side component. Treat it as untrusted for private data: it must never become a second copy of the API.

## Must not cache

- `/api/` requests or responses
- Student personal information
- Documents, payment records, insurance records, e-card files
- Authentication tokens, refresh tokens, CSRF secrets
- Notification payloads that include private student or payment data

`frontend/public/sw.js` returns immediately for `/api/` URLs and does not call `cache.put` on them. `frontend/src/pwa/cachePolicy.ts` encodes the same rule for tests.

Allowed caches: application shell HTML (`offline.html`), icons, logo, hashed static JS/CSS.

## Authentication

The portal uses httpOnly cookies (`svysy_access`, `svysy_refresh`) with `withCredentials`. Tokens are not written to `localStorage` or `sessionStorage`.

Implications:

- XSS cannot read cookie values if `HttpOnly` is set (still prevent XSS).
- The installed PWA shares the browser cookie jar for the origin.
- Logout must hit the API and clear shell caches; it must not leave API JSON in Cache Storage (it never should, because API was never cached).

If a future change stores JWTs in JavaScript memory only, never persist them in Cache Storage or IndexedDB from the worker.

## XSS / CSRF

- Continue to render user-supplied text as React text, not `dangerouslySetInnerHTML`, unless a later phase sanitises HTML.
- CSRF: cookie-based session on a same-site or configured `COOKIE_SAMESITE` deployment. Do not add open redirect targets in `actionUrl` handling; notification links must stay on-origin routes.

## Documents and IDOR

College list endpoints filter by session `instituteId`. COLLEGE query `instituteId` is ignored. Admin may filter by institute. File download routes remain 501 until `FEATURE_DOCUMENT_HTTP` / `FEATURE_ECARD_HTTP` are designed with authorisation checks **before** bytes are streamed.

`DocumentViewer` must not be pointed at a permanent public object URL.

## Uploads

Frontend type/size checks are advisory. Malicious files are rejected by existing Excel middleware and by 501 on document POST until storage APIs exist. Do not accept executable types.

## Push notifications

Subscriptions would identify a user/device. Do not implement subscribe storage without authentication, VAPID, and role-based fan-out. Current subscribe endpoints return 501. Never put VAPID private keys in `VITE_*` variables.

## Offline queue

This phase does **not** queue authenticated mutations offline. A failed upload must show Retry / Cancel, not infinite automatic retries.

## Open redirects

Notification `actionUrl` values must remain application paths. Do not accept absolute URLs to third-party hosts from stored notifications without an allow-list (existing Phase 13 service should already constrain these).
