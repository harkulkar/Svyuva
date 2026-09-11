# MOBILE UX GUIDE

Use this guide when extending college or admin screens. Do not invent official scheme copy. Do not bypass RBAC.

## Breakpoints

| Token | Width | Typical device |
| --- | --- | --- |
| (default) | 320–374 | Small Android |
| `xs` | 375 | iPhone SE / compact |
| `sm` | 640 | Large phone / small tablet |
| `md` | 768 | Tablet / sidebar appears |
| `lg` | 1024 | Laptop |
| `xl` | 1280 | Desktop |
| `2xl` | 1440 | Large desktop |

Test at 320, 375, 390, 414, 768, 1024, 1280, and 1440+. Avoid fixed widths that cause horizontal overflow. Prefer `min-w-0`, `max-w-*`, and `overflow-x-auto` only for tables that truly need many columns.

Touch targets should be at least 44px (`min-h-11`).

## Navigation

**Desktop (`md+`):** navy sidebar from `portalNav.ts`. Breadcrumbs above page content.

**Mobile:** hamburger opens a slide-out drawer of the full sidebar. Bottom nav is a short list of high-frequency routes (not a second information architecture).

College bottom: Dashboard, Students, Insurance, Documents, Notifications, Profile.

Admin bottom: Dashboard, Institutes, Students, Insurance, Reports, Notifications.

The header notification bell is always visible on portal pages.

## Dashboards

College: compact `StatCard`s with “View details” links, pending actions, quick actions, recent notifications. Hide charts below `lg`.

Admin: compact operational cards plus quick actions. Extra statistic grid from `md`. Charts from `lg`.

Quick actions must match the signed-in role. Do not show admin routes to college users.

## Tables

Desktop: full table.

Mobile: card/list with the important fields (name, id, institute, status, insurance/status, actions). The card or “View” opens the existing detail route.

If a table genuinely needs many columns, allow horizontal scroll and keep the first column sticky via `ResponsiveTable`.

## Filters and search

Desktop: filter controls in a horizontal bar.

Mobile: **Filters** button opens an accessible bottom drawer.

Search:

- Visible label (or `sr-only` plus `aria-label`)
- Clear button
- 400ms debounce (`DebouncedSearchField`)
- Loading indicator while the draft differs from the committed query
- Backend search for large lists (existing paginated APIs)
- Empty: “No students found.” / equivalent

Do not fire an API request on every keystroke. Keep filters in the URL query string where the page already used `useSearchParams`.

## Forms

- Labels are required; do not rely on placeholders alone.
- `type="email"`, `type="tel"`, `type="date"`, `type="number"`, `type="password"` as appropriate.
- Errors use `role="alert"` on field messages.
- Complex flows (signup, student create/edit) use `Stepper`. Business rules and Zod payloads stay the same.

## Uploads

States: SELECTED → VALIDATING → UPLOADING → PROCESSING → SUCCESS / FAILED.

Show filename, type, size, image preview when possible, remove, progress, Retry, Cancel.

Excel: download template, read instructions, select file, validate, import. State clearly that there is no in-browser spreadsheet editor.

Camera: `capture="environment"` only on image/document pickers where a photo of paper is useful. Never on Excel.

Frontend checks are hints. The server remains authoritative.

## Notifications

Unread badge on the bell. Centre supports type filter, mark one / mark all, and the related `actionUrl`. Preferences (in-app / email for non-critical types) live on profile pages and the centre. Browser push is optional and never required.

## E-cards and documents

Metadata lists are institute-scoped for college users. File bytes are not returned until feature-flagged HTTP APIs exist. Do not create public document URLs. `DocumentViewer` must only receive authorised blob or authenticated download URLs.

## Loading, empty, error

Every API-driven page: skeleton or `Loading`, empty copy, error copy, Retry. Avoid a blank white main area.

## Confirmation

Use `ConfirmDialog` for logout, deactivate, reject, publish announcement, and similar irreversible actions. Do not confirm routine “Apply filters” or “Save profile”.
