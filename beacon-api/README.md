# Hearth Ember API

Public HTTPS REST backend for the Postpartum **Ember** live map.

## Endpoints

- `GET /beacons` → `{ id: { lat, lng, createdAt, expiresAt, coarseZip? } }`
- `POST /beacons` → `{ id }`
- `PUT /beacons/:id` → `{ id }`
- `DELETE /beacons/:id`
- `GET /beacons/:id/notes`
- `POST /beacons/:id/notes`

CORS: `*` for GET/POST/PUT/DELETE. JSON only. Coarse locations; no PII; prune expired.

## Run locally

```bash
npm install
npm start
```

## Deploy options

- **Express** (`server.js`): Render / Fly / any Node host — file persistence in `data/beacons.json`
- **Cloudflare Worker** (`worker.js`): `npx wrangler deploy` — in-memory (lights expire anyway)
