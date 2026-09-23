# Hearth Ember API

Public HTTPS REST backend for the Postpartum **Ember** live map + Hope board.

## Live URL

`https://hearth-ember-api.piquant-filament-122.workers.dev`

Host: **Cloudflare Workers + KV** (durable free). CORS `*`.

## Endpoints

- `GET /health` → `{ ok, lights }`
- `GET|POST /beacons`
- `PUT|DELETE /beacons/:id`
- `GET|POST /beacons/:id/notes`
- `GET|POST /hope`

## Deploy

```bash
# Node 22+
npx wrangler kv namespace create BEACONS
npx wrangler kv namespace create HOPE
# put ids in wrangler.toml, then:
npx wrangler deploy
```

Express `server.js` remains for local/dev file persistence.
