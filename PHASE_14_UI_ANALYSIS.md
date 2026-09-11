# PHASE 14 UI ANALYSIS

PROJECT: SV Yuva Suraksha Yojana Portal  
PHASE: 14 — Mobile / PWA & Advanced User Experience  
STATUS: Analysis complete (pre-implementation)

This document records the **existing** frontend before Phase 14 changes. It does not invent Government of Maharashtra or insurer content, and it does not propose replacing working business modules.

Related prior work: Phases 1–13. Insurance, document, payment, review, and e-card **HTTP APIs remain feature-flagged off** (`FEATURE_*_HTTP=false`). Phase 14 must not invent those workflows.

---

## 1. Current routes and layouts

### Public site (`PublicLayout`)

- Header: skip link, accessibility bar, logo, desktop dropdowns, **hamburger below `lg`**.
- Footer: contact and policy links.
- Auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password/:token`) sit inside the public layout.

### College portal (`CollegeLayout` → `PortalLayout`)

Routes include dashboard, notifications, profile, students (list/add/edit/detail/upload), reports, AI assistant, and placeholders for insurance, documents, e-card, payment status, and review.

### Admin portal (`AdminLayout` → `PortalLayout`)

Routes include dashboard, institutes, students, registrations, reports, announcements, jobs, health, knowledge, users, profile, and notifications.

### Shared shell

`PortalLayout` already has:

- Skip to main content
- Header with institute/admin title, email, **notification bell**, logout
- A **“Menu” button below `md`** that shows/hides the sidebar as a **stacked block** (not a drawer)
- Sidebar links (long admin list; grouped college student links)

There is **no bottom navigation**, **no overlay drawer**, and **no breadcrumbs** on portal pages.

---

## 2. Current responsive behaviour

| Area | Behaviour today |
| --- | --- |
| Breakpoints | Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). No explicit 320 / 375 / 390 / 414 tokens. |
| Overflow | `html`/`body` use `overflow-x: hidden`. This hides overflow; it does not always prevent unusable tables. |
| Public header | Desktop nav hidden until `lg`; mobile accordion works. |
| Portal sidebar | Hidden until `md`; then a 240px column. On phones the menu **pushes content down** instead of overlaying. |
| Grids | Dashboards use `sm:grid-cols-2` / `lg:grid-cols-3|4`. Cards wrap; many charts still render on a phone. |
| College students | **Already** card list on `< md` and full table on `md+`. |
| Admin students | Same card/table split. |
| Admin institutes, registrations, announcements, audit, users | **Desktop tables only** (`overflow-x-auto`). |
| Forms | Two-column from `sm`. Inputs are ~32–36px tall (below 44px touch target). |
| Notification bell | Dropdown `w-80 max-w-[90vw]` — usable but labelled “Notifications” (wide for a phone header). |
| Excel upload | File input + wide preview table. No camera capture, no size/type preview card, no cancel during upload. |
| Charts | `SimpleBars` is CSS-only and wraps; **too many** charts on college/admin dashboards for a small screen. |

Test widths required by this phase (320, 375, 390, 414, 768, 1024, 1280, 1440+) are **not currently verified** as a checklist.

---

## 3. Desktop-only or desktop-biased components

- Admin institutes table
- Admin registrations table
- Admin announcements table
- Admin audit logs / login activity / users / universities tables (horizontal scroll only)
- Admin dashboard “Recent activity” table
- Excel validation preview table
- Report preview tables
- Long admin sidebar (many links; hard to scan on a phone)
- Date-range analytics charts (admin dashboard shows ~12 bar charts at once)

---

## 4. Mobile problems (before Phase 14)

1. **Portal menu is not a drawer** — opening it lengthens the page; no backdrop, no focus trap, no Escape-to-close besides toggling.
2. **No bottom nav** for the college tasks staff actually do on a phone (dashboard, students, insurance, documents, notifications, profile).
3. **College dashboard** shows 12 stat cards plus four charts — dense on 320–390px.
4. **Placeholder modules** (`CollegeComingSoon`) for insurance / documents / e-card / payments / review — college staff cannot “check status” on mobile even though dashboard already has counts.
5. **Filters** on student lists are a long grid of inputs; no “Filters” sheet on small screens.
6. **Search** is submit-only (good: not every keystroke) but has no clear button, debounce helper, or loading indicator on the field.
7. **Signup** is one long form (institution, location, principal, password) — fatiguing on a phone.
8. **Student create/edit** is sectioned but still one scroll; no step indicator.
9. **Logout** has no confirmation (easy to tap in a crowded header).
10. **Notification centre** filters are a cramped row; no dedicated mobile header bell icon.
11. **Session expiry** after failed refresh is a raw 401 on the current page — no dedicated session-expired screen.
12. **Network errors** are inline messages only; no branded network-error page.
13. **Touch targets** and `type="tel"` are inconsistent (mobile often uses `inputMode="numeric"` without `type="tel"`).
14. **PWA**: no manifest, no service worker, no install metadata, no offline fallback.

---

## 5. Components requiring redesign (not replacement)

Do **not** blindly replace these; wrap or extend them:

| Component | Keep | Change |
| --- | --- | --- |
| `PortalLayout` | Auth, RBAC outlet, existing routes | Drawer + bottom nav + logout confirm + bell icon |
| `NotificationBell` | Poll `/api/notifications/unread`, mark read | Compact icon, `aria-label`, mobile-friendly panel |
| `CollegeDashboardPage` / `AdminDashboardPage` | Existing APIs and stats | Compact cards, View Details, fewer charts on small screens, Quick Actions |
| `CollegeStudentsPage` | Existing card/table split and URL filters | Shared `ResponsiveTable` + `FilterPanel` + search UX |
| `StudentForm` / `SignupPage` | Zod schemas and field names | Multi-step UI only |
| `CollegeUploadStudentsPage` | Validate → import flow | File preview, states, mobile instructions (no fake Excel editor) |
| `FormField` | Labels, `aria-invalid`, error ids | 44px min height, `type=tel` / `email` / `date` usage |
| `ConfirmDialog` | Cancel/confirm, Escape | Focus trap, labelled overlay |
| `StatusPages` | 404 / 403 / 500 / maintenance | Add network + session expired |
| `Seo` | Titles, OG, canonical | `noindex` on private routes |
| Placeholders for insurance/docs/e-card/payments | Honest “HTTP API not live” | Status lists from stored metadata (no file URLs) |

---

## 6. Reusable components (existing)

- `FormField` / `SelectField` / `TextAreaField`
- `Loading` / `ButtonSpinner`
- `ErrorMessage`
- `EmptyState`, `ConfirmDialog`, `SimpleBars` (`AdminUi`)
- `Seo`, `Hero`, `DocumentCard` (public files only)
- `DateRangeFilters`, `ActivityTimeline`, `NotificationBell`
- `Pagination` (currently exported from college Students page — should move to common)
- College students already demonstrate the **card-on-mobile / table-on-desktop** pattern to standardise

---

## 7. Accessibility issues

Already present: skip link, `:focus-visible` outline, some `aria-expanded` on menus, labelled form fields, `role="alert"` on errors.

Gaps:

- Portal “Menu” button text only; no `aria-controls` drawer semantics with inert background
- Notification bell has no `aria-label` including unread count
- Dialogs do not trap Tab
- Many tables lack `scope` or a caption (college students are better)
- Filter controls rely on placeholder text in several list pages
- Bottom/hamburger duplication risk if both show the same long list
- Contrast is generally navy/saffron on cream; keep that
- Portal pages are not marked `noindex` in `Seo` (robots.txt already disallows `/admin` and `/college`)

---

## 8. PWA readiness (before Phase 14)

| Requirement | Status |
| --- | --- |
| Web app manifest | Missing |
| App icons 192 / 512 | Missing (favicon + logo SVG only) |
| Theme colour / apple-mobile-web-app | Missing |
| Service worker | Missing |
| Installability | Not possible |
| Offline fallback | Missing |
| API caching | N/A (must **never** cache authenticated `/api` bodies) |
| Auth storage | **HttpOnly cookies** (`svysy_access`, `svysy_refresh`) via `withCredentials: true` — do not move tokens to `localStorage` |
| Push | Not implemented; in-app + optional email already exist (Phase 13) |

---

## 9. Authentication and session (do not weaken)

- Login/refresh/logout use **cookie-based JWT**, not localStorage tokens.
- Axios retries once on 401 via `/api/auth/refresh`.
- `ProtectedRoute` redirects unauthenticated users to `/login`.
- Password-reset-required users are forced to profile pages.
- Phase 14 should add session-expired UX and logout confirmation **without** changing cookie flags except documentation.

Sensitive data (students, documents, payments, insurance) must **not** be stored in `localStorage` or cached by the service worker.

---

## 10. Module HTTP APIs (unchanged business rules)

Feature flags default **false**:

- `FEATURE_INSURANCE_HTTP`
- `FEATURE_DOCUMENT_HTTP`
- `FEATURE_PAYMENT_HTTP`
- `FEATURE_REVIEW_HTTP`
- `FEATURE_ECARD_HTTP`

College dashboard **already aggregates** stored MongoDB counts. Phase 14 should expose **paginated metadata lists** (no private file URLs, no storage keys) so mobile users can check status. Upload/download of private files stays unavailable until those flags and storage APIs are enabled in a later phase.

Excel student upload remains the live file pipeline (frontend + backend validation).

---

## 11. Implementation principles for Phase 14

1. Extend existing layouts and list pages; do not rebuild the SPA.
2. Prefer overlay drawer + bottom nav over duplicating every sidebar link on the phone.
3. Reuse the college-students card/table pattern everywhere large tables appear.
4. Multi-step forms must call the **same** submit payloads.
5. Service worker: cache app shell and static public assets only.
6. Optional web push: permission-based and disabled when VAPID env is absent.
7. No legacy data migration, no old-system changes, no invented official scheme text.
