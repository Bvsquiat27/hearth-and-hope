# Hearth Ember API (v1.7.1)

Public HTTPS REST backend for the Postpartum **Ember** live map + Hope board + private accounts.

## Live URL

`https://hearth-ember-api.piquant-filament-122.workers.dev`

Host: **Cloudflare Workers + KV**. Live production may still be on an older Worker until 1.7.1 is deployed to the **Piquant Filament** account (see Deploy notes).

## Security (1.7.1)

- **Owner secrets (C1/C2):** `POST /beacons` returns `ownerSecret` once; hash stored as `ownerHash`. `PUT`/`DELETE` `/beacons/:id` and `GET .../notes` require `X-Hearth-Beacon` or `Authorization: Beacon …`. Public note posts stay open + content filter.
- **Quiet health (M3):** `GET /health` → `{ ok, lights, version }` — **no `accounts`**.
- **CORS allowlist (H3):** `https://bvsquiat27.github.io`, `http://localhost:5173|3000`, `http://127.0.0.1:5173|3000`. Reflect only if allowlisted. `Vary: Origin`. `null` Origin is **not** allowed (Android `file://` WebView may need Pages hosting or a future origin).
- **Rate limits (H1):** KV/`rl:*` windows — beacons 5/10m, notes 20/10m, hope 10/10m, signup 5/h, login 20/15m per IP (hashed). `429 { error: "rate" }`.
- **Body cap:** reject > 64 KB → `413`.
- **KV layout (H2):** per-entity keys `b:{id}`, `h:{id}`, `u:{email}`, `tok:{tokenHash}`; indexes `idx:beacons` / `idx:hope`. One-shot migrate from legacy `all` blob.
- **Legacy unsigned lights (H5):** beacons without `ownerHash` are **deleted** on load/prune (cannot be managed after C1).
- **Session tokens (M2):** SHA-256 hashed at rest; lookup via `tok:{hash}`.
- **Signup (M1):** keep `409 { error: "exists" }` for UI compatibility; ~200 ms delay on both paths.
- **/me/sync (H4):** strip unknown keys; array caps; ≤ 48 KB serialized; server `updatedAt`.
- **Notes/hope (L5):** server-only `createdAt`; max 50 notes per beacon.
- **Headers:** `X-Content-Type-Options: nosniff`; `Cache-Control: no-store` on auth/notes GET.
- **Hope admin delete (1.7.1):** set Worker/Express secret `HOPE_ADMIN_SECRET`. Without it, DELETE returns `503 { error: "admin unset" }`.

## Endpoints

- `GET /health` → `{ ok, lights, version }`
- `GET|POST /beacons` · `PUT|DELETE /beacons/:id` · `GET|POST /beacons/:id/notes`
- `GET|POST /hope` · `DELETE /hope/:id` · `DELETE /hope` / `POST /admin/hope/clear` (requires `HOPE_ADMIN_SECRET` via `X-Hearth-Admin` or `Authorization: Admin …`)
- `POST /auth/signup|login|logout` · `GET /auth/me` · `GET|PUT /me/sync`

## Local

```bash
npm install
node server.js          # PORT=8765
RATE_TEST=1 node server.js   # lower rate ceilings for proof
./scripts/prove-1.7.0.sh
```

Express mirrors Worker security with file Maps under `data/`.

## Deploy

```bash
# Must use Piquant Filament Cloudflare account + token (live Workers.dev host).
# wrangler.toml account_id currently points at 9dfa3f… (new) — not live PF.
# Do not deploy from this sandbox without the correct PF credentials.
npx wrangler deploy
```

## Proof

`scripts/prove-1.7.0.sh` starts Express with `RATE_TEST=1` and asserts owner secrets, 401s, health shape, CORS, 413, and rate 429.
