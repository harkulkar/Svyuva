# PHASE 14 REPORT

PROJECT: SV Yuva Suraksha Yojana Portal

PHASE: 14 — Mobile / PWA & Advanced User Experience

This phase extends Phases 1–13. It does **not** start Phase 15, rebuild the portal, migrate legacy data, shut down the old system, invent official Government of Maharashtra / insurer content, or weaken ADMIN vs COLLEGE RBAC.

Related documents: `PHASE_14_UI_ANALYSIS.md`, `MOBILE_UX_GUIDE.md`, `PWA_CONFIGURATION.md`, `PWA_SECURITY.md`, `ACCESSIBILITY_GUIDE.md`, `MOBILE_TESTING_CHECKLIST.md`, `PHASE_14_FINAL_REPORT.md`.

---

## Scope

Transform the existing portal into a mobile-first, responsive web application with optional PWA installability. College staff are the primary mobile users. Admin remains fully usable on phones, with a compact dashboard and bottom navigation.

## Responsive system

Breakpoints (Tailwind): `xs` 375, `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1440.

Documented test widths: 320, 375, 390, 414, 768, 1024, 1280, 1440+.

Shared UI: `StatCard`, `QuickActions`, `ResponsiveTable`, `FilterPanel`, `SearchField` / `DebouncedSearchField`, `Stepper`, `Pagination`, `FileUpload`, `DocumentViewer`, `PageState`.

## Navigation

- Desktop: existing sidebar.
- Mobile: hamburger + overlay drawer; sticky header with notification bell; bottom navigation.
- College bottom: Home, Students, Insurance, Documents, Alerts, Profile.
- Admin bottom: Home, Institutes, Students, Insurance, Reports, Alerts.
- Desktop breadcrumbs; hidden on small screens.
- Logout uses a confirmation dialog.

## Dashboards and lists

College dashboard shows compact cards (students, documents, insurance, payments, e-cards, institute status), pending actions, quick actions, recent notifications. Charts hide below `lg`.

Admin dashboard shows operational cards, quick actions, and extra stats/charts on larger screens. Search is debounced (2+ characters).

Major tables use card/list layouts on mobile and full tables from `md` up. Search is debounced against existing list APIs. Filters open in a drawer on mobile and stay in a horizontal bar on desktop, synchronized with URL query parameters.

## Forms and uploads

- College registration (signup) and student create/edit are multi-step; payloads unchanged.
- Inputs use appropriate types (`email`, `tel`, `date`, `number`, `password`).
- Excel upload: template download, instructions, file picker, validation, abort. No spreadsheet editor.
- Document picker supports camera capture where the browser allows `capture="environment"`. Upload HTTP remains feature-flagged (`FEATURE_DOCUMENT_HTTP`). Frontend validation is never trusted alone.

## Notifications and PWA

- In-app centre: unread count, list, type filter, mark read / mark all, details via `actionUrl`.
- Preferences on profile pages and the notification centre.
- Optional browser push: `GET /api/notifications/push/status`. Subscribe endpoints return 501 unless a future delivery implementation is enabled with VAPID keys. Permission is never forced.
- Production-only service worker: caches the application shell and hashed static assets. **Never caches `/api/`**. Offline navigations fall back to `/offline.html`. Logout clears shell/static caches.

## Security (unchanged architecture)

Authentication remains httpOnly cookies (`svysy_access`, `svysy_refresh`) with `withCredentials`. Tokens and student/payment/document payloads are not stored in `localStorage`. 401 after failed refresh on portal paths redirects to `/session-expired`.

College scheme list endpoints always filter by session `instituteId`. Query `instituteId` from a COLLEGE user is ignored.

## APIs added (metadata lists only)

- `GET /api/college/insurance|documents|payments|ecards`
- `GET /api/admin/insurance|documents|payments|ecards`
- `POST /api/college/documents` → 501 `FEATURE_DISABLED`
- `GET /api/college/ecards/:id/file` → 501 `FEATURE_DISABLED`
- `GET /api/notifications/push/status`
- `POST|DELETE /api/notifications/push/subscribe` → 501

Existing mutation APIs and feature flags are unchanged.

## Known limitations

- Document/e-card/insurance/payment HTTP mutations remain off.
- Browser push delivery is not implemented; status/subscribe endpoints exist so configuration can be added later without forcing users.
- Excel editing on phones is impractical; the UI states this clearly.
- Physical device lab (Android Chrome, iPhone Safari) must be completed in the deployment environment.
