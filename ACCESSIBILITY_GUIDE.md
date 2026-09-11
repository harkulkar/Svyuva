# ACCESSIBILITY GUIDE

Improvements in Phase 14 sit on the existing semantic layout (skip link, `main`, labelled inputs). This is not a WCAG certification.

## Semantic HTML

- One `h1` per view.
- Tables use `th scope="col"` on student lists where converted.
- Dialogs: `role="dialog"`, `aria-modal="true"`, labelled heading, focus on close/cancel, Tab cycle, Escape to dismiss (`ConfirmDialog`, filter drawer, nav drawer).
- Navigation: `aria-label` on side, bottom, and breadcrumb nav.

## Keyboard

- Skip to main content (portal header).
- Focusable controls use `min-h-11` and visible `focus:ring-2 focus:ring-navy`.
- Menus and drawers close on Escape.
- Do not remove focus outlines.

## Labels and errors

- `FormField` associates `<label>` with the control and exposes errors with `role="alert"` and `aria-invalid`.
- Search fields have an accessible name (`sr-only` label or `aria-label`).
- Notification bell: `aria-label` includes unread count.

## Contrast

Navy, saffron, and slate text on `#f4f1ea` / white follow the existing public-site palette. Do not use light grey text on white for primary content. Error text is `text-red-700` / `text-red-800`.

## Screen readers

- Loading and success messages use `role="status"` where added.
- Empty and error states are text, not icon-only.
- Bottom nav labels are visible text, not icon-only.

## Zoom

Layouts use fluid grids. At 200% zoom, stacked cards should remain usable; sidebars collapse below `md`. Verify zoom on college students, Excel upload, and dashboards.

## Manual checks (minimum)

1. Keyboard-only: login, open mobile menu, open filters, tab through a student form stepper, confirm logout.
2. Screen reader basics: page title (`Seo`), heading order, notification unread, form errors.
3. Zoom 200% on a 375px-wide emulated phone and a 1280px desktop.
