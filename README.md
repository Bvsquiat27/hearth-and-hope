# Hearth & Hope

A calm, mobile-first **Progressive Web App (PWA)** that helps new and expecting mothers find resources, local pro-life–aligned support, and draft outreach to nearby centers — with explicit consent before anything is sent.

> **Framing:** Supports life as Christ intended, with dignity for every woman. No Planned Parenthood. No abortion referrals.

## Find help anywhere

Enter **any US city, town, or ZIP**. Find help and Get Help sort by distance using ZIP centroids and center coordinates.

The directory lists **verified real** pregnancy resource centers from public **Option Line** (Heartbeat International) and **Birthright** directories (retrieved 2026-09-23), plus national helplines. More listings may be added over time. Optional **Use my location** uses browser geolocation when allowed.

## Voice help

Every screen has **Read aloud** / voice controls using the Web Speech API (`speechSynthesis`). Turn on **Voice** in the header to hear each page automatically, or tap **Read this page**. Play / Pause / Stop cancel overlapping speech. Preference is saved in `localStorage`.

## Quick start (local)

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`.

## Live

- GitHub Pages: https://bvsquiat27.github.io/hearth-and-hope/
- Android APK: see GitHub Releases (v1.1.0+)

## License / data notes

Local center listings from public Option Line and Birthright directories (see `source` / `source_date` on each record). ZIP centroids from SimpleMaps US Zips basic data. Verify hours before referral. No Planned Parenthood or abortion providers.
