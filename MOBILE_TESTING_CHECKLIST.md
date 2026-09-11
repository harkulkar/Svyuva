# MOBILE TESTING CHECKLIST

Complete in a browser device toolbar and, before production, on real devices. Do not use production student data.

## Viewports

- [ ] 320px
- [ ] 375px
- [ ] 390px
- [ ] 414px
- [ ] 768px
- [ ] 1024px
- [ ] 1280px
- [ ] 1440px+

No horizontal overflow on dashboard, students, forms, notifications, or e-card list (tables may scroll internally).

## Browsers (minimum)

- [ ] Desktop Chrome
- [ ] Desktop Edge
- [ ] Desktop Firefox
- [ ] Android Chrome
- [ ] iPhone Safari (where available)

## College

- [ ] Login
- [ ] Signup (multi-step, validation, review)
- [ ] Dashboard cards, pending actions, quick actions, notifications
- [ ] Students: search debounce, filters drawer, card list, pagination, detail, edit
- [ ] Add student stepper
- [ ] Excel: template, instructions, select, validate, cancel, result (no fake editor)
- [ ] Insurance / documents / payments / e-card lists (metadata)
- [ ] Document picker + camera where supported; 501 message if upload API is off
- [ ] Notifications: bell, unread, filter, mark read, mark all
- [ ] Profile: allowed fields, password, notification preferences
- [ ] Logout confirmation

## Admin

- [ ] Login
- [ ] Dashboard search (2+ characters, empty state)
- [ ] Quick actions (admin only)
- [ ] Institutes, registrations, students, users, universities, audit, announcements (cards on mobile)
- [ ] Insurance metadata list
- [ ] Reports
- [ ] Notifications and announcements (confirm publish)
- [ ] System jobs
- [ ] Profile + preferences
- [ ] Logout

## Network

- [ ] Fast connection
- [ ] Slow 4G throttling
- [ ] Offline: public/PWA shell shows offline page; API calls fail with retry (no cached student JSON)
- [ ] Upload cancel / fail does not loop retries

## PWA (production build over HTTPS or localhost preview)

- [ ] `manifest.webmanifest` loads
- [ ] Icons load
- [ ] Service worker registers
- [ ] Install prompt appears where the browser supports it
- [ ] Offline fallback for navigations
- [ ] Application Cache Storage has no `/api/` JSON
- [ ] Logout clears shell caches
- [ ] New deploy eventually serves new hashed assets

## Accessibility

- [ ] Keyboard-only through login and a student form
- [ ] Visible focus
- [ ] Screen reader: headings and unread count
- [ ] Zoom 200%

## Security smoke

- [ ] College A cannot see College B insurance/students
- [ ] 401 → session expired on portal routes
- [ ] No tokens in localStorage
