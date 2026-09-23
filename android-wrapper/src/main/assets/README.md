# Hearth & Hope

A calm, mobile-first **Progressive Web App (PWA)** that helps new and expecting mothers find resources, local pro-life–aligned support, and draft outreach to nearby centers — with explicit consent before anything is sent.

> **Framing:** Supports life as Christ intended, with dignity for every woman. No Planned Parenthood. No abortion referrals.

## Quick start (local)

This is a static site (HTML / CSS / JS). No build step or backend required.

```bash
cd /workspace/mothers-support-app
python3 -m http.server 8080
```

Then open in a browser:

```
http://127.0.0.1:8080
```

(or `http://localhost:8080`)

Hash navigation and filters work over `file://` too, but **PWA install + service worker require http(s)**. `mailto:` / `sms:` links work best from a real browser session.

## Project layout

```
mothers-support-app/
├── PRODUCT_PLAN.md         Full product outline + native roadmap
├── README.md               This file
├── index.html              Single-page app shell (PWA meta + install UI)
├── manifest.webmanifest    Web app manifest (name, icons, standalone)
├── sw.js                   Service worker (shell cache, network-first)
├── icons/                  PNG icons (192, 512, maskable, apple-touch)
├── css/
│   └── styles.css          Theme, layout, safe-area, bottom nav
├── js/
│   └── app.js              Nav, filters, form, mailto/sms, PWA install
└── data/
    └── centers.js          Sample directory (fictional)
```

## Prototype screens

| Section | Hash | What it does |
|---------|------|--------------|
| Home | `#home` | Welcome, gentle faith line, CTAs |
| Resources | `#resources` | Categorized cards + search |
| Directory | `#directory` | Filterable local centers |
| Get Help | `#help` | Consent form → preview → mailto/sms |
| About | `#about` | Our promise, privacy, install tip |

## Install on your phone (PWA)

Once the app is reachable from your phone (see **Reach the demo from a phone** below), you can add it to the home screen.

### iPhone (Safari)

1. Open the app URL in **Safari** (Chrome on iOS cannot Add to Home Screen the same way).
2. Tap the **Share** button (square with arrow).
3. Scroll and tap **Add to Home Screen**.
4. Tap **Add**. The app opens full-screen with the Hearth & Hope icon.

### Android (Chrome)

1. Open the app URL in **Chrome**.
2. When the install banner appears, tap **Install this app** — or use the browser menu **⋮ → Install app** / **Add to Home screen**.
3. Confirm. The app launches in standalone mode (no browser chrome).

Tips:

- A dismissible install banner appears when the browser supports it (Android) or as a gentle Safari how-to (iOS). Use **Not now** if you prefer — the same tip lives under **Our promise**.
- Offline: previously opened shell pages (home, resources, directory, about, help) work from cache. The app never invents medical content beyond what was cached.

## Reach the demo from a phone

Local `http://127.0.0.1:8080` on the development box is only visible on that machine. Options:

1. **Open on this computer’s desktop / browser** — verify PWA (manifest, service worker, install UI) at `http://127.0.0.1:8080`.
2. **Same Wi‑Fi tunnel** — later, serve from a laptop/phone hotspot IP (e.g. `http://192.168.x.x:8080`) so a phone can reach the host.
3. **Deploy** — host on HTTPS (required for reliable install on many phones) via Netlify, GitHub Pages, Cloudflare Pages, etc.

For now, verifying on `127.0.0.1` in a desktop Chrome/Edge session is enough to confirm the PWA shell.

## Content rules (encoded in copy)

- Affirm the woman; never shame past choices
- Faith as optional encouragement, not condemnation
- Practical steps over slogans
- Not a substitute for medical care; emergencies → 911
- **Never** list abortion providers or Planned Parenthood

## Notes for Angel

- App name options and roadmap (including **Phase: Native apps** with Expo / React Native) live in `PRODUCT_PLAN.md`.
- Directory entries are fictional placeholders for demo matching.
- Production will need a verified SMS gateway and partner directory API (see plan Phase 2–3).
- **PWA is Phase 1 ship path** — installable today without app stores; native follows after shared content + backend are ready.
