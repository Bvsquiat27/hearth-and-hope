# Hearth & Hope

A calm, mobile-first **Progressive Web App (PWA)** that helps new and expecting mothers find resources, local pro-life–aligned support, and draft outreach to nearby centers — with explicit consent before anything is sent.

> **Framing:** Supports life as Christ intended, with dignity for every woman. No Planned Parenthood. No abortion referrals.

## Find help anywhere

Enter **any US city, town, or ZIP**. Find help and Get Help sort by distance using ZIP centroids and center coordinates:

1. Exact ZIP / city matches first  
2. Nearest centers within ~100 miles  
3. Otherwise nearest **in-state**, then nearest **nationwide** (clearly labeled)

The directory is a **starter partner network** across all 50 states + DC (hundreds of sample listings at real city centroids). **Not every municipality has its own unique entry** — unknown towns still resolve via ZIP or city geocoding to the nearest listed centers. Optional **Use my location** uses browser geolocation when allowed.

## Quick start (local)

```bash
cd mothers-support-app   # or repo root on GitHub Pages
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`. Hash navigation works over `file://`, but PWA install needs http(s).

## Project layout

```
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/styles.css
├── js/app.js              # proximity matching, Get Help, PWA
├── data/
│   ├── centers.js         # 50 states + DC starter network (+ national helplines)
│   └── zips.js            # US ZIP centroids + city→ZIP (SimpleMaps-derived)
└── icons/
```

## Live

- GitHub Pages: https://bvsquiat27.github.io/hearth-and-hope/
- Android APK: see GitHub Releases (v1.0.1+)

## License / data notes

Sample center names, phones (555), and emails (`example.org`) are fictional placeholders for product testing unless noted as public national helplines. ZIP centroids derived from public SimpleMaps US Zips basic data. Verify any referral before client use.
