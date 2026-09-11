# PWA CONFIGURATION

The public site and portals remain ordinary websites if PWA features are unavailable.

## Files

| File | Role |
| --- | --- |
| `frontend/public/manifest.webmanifest` | Name, icons, theme, `standalone` display |
| `frontend/public/icons/icon-192.png` | Install / home-screen icon |
| `frontend/public/icons/icon-512.png` | Maskable / splash icon |
| `frontend/public/offline.html` | Offline fallback for navigations |
| `frontend/public/sw.js` | Service worker |
| `frontend/src/pwa/register.ts` | Registers SW in **production** only |
| `frontend/src/pwa/cachePolicy.ts` | Unit-tested “never handle `/api/`” rule |
| `frontend/index.html` | `theme-color`, apple-mobile metadata, manifest link |

## Registration

`registerServiceWorker()` runs from `main.tsx` on `window.load` when `import.meta.env.PROD` is true. Development (`npm run dev`) does not register a worker, so API proxying and HMR stay predictable.

## Caches

- `svysy-shell-v1`: `/offline.html`, manifest, favicon, logo, icons.
- `svysy-static-v1`: hashed `/assets/` and `/icons/` after a successful GET.

Activate deletes older `svysy-*` cache names so deployments pick up a new shell version when the cache name is bumped.

## Fetch rules

1. Non-GET: ignore.
2. Path starts with `/api/` (or contains `/api/`): **do not intercept**. The browser talks to the network (or Vite proxy) as usual.
3. Navigations: network first; on failure serve `/offline.html`.
4. Hashed assets: cache-first after the first successful fetch.

## Installability

Chromium-based browsers can offer install when the site is served over HTTPS (or localhost), the manifest is valid, and a service worker controls the page. Safari iOS uses “Add to Home Screen”; behaviour differs and is not guaranteed.

`start_url` is `/` (public home). Logged-in users still authenticate via httpOnly cookies after opening the installed app.

## Optional web push

Not required.

Backend:

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` in `.env` (documented in `.env.example`).
- `GET /api/notifications/push/status` reports whether keys exist. `permissionRequired` is always true.
- `POST` / `DELETE /api/notifications/push/subscribe` return 501 until a delivery provider is implemented.

Do not prompt for Notification permission automatically. In-app notifications and email (if SMTP is configured) continue independently.

## Logout

`AuthContext.logout` clears `svysy-shell-*` and `svysy-static-*` caches. Session cookies are cleared by `POST /api/auth/logout`. The worker is not unregistered so the public site can still load offline chrome after sign-out.

## Updating a deployment

Bump `SHELL_CACHE` / `STATIC_CACHE` in `sw.js` when the offline page or precache list changes. Hashed Vite assets get new filenames, so `svysy-static-v1` stores the new files on first visit after deploy.
