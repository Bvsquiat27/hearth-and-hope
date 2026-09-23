/**
 * Cloudflare Worker — Hearth Ember API with KV persistence.
 * Bindings: BEACONS, HOPE (KV namespaces). Keys: "all" → JSON object blob.
 * Deploy: npx wrangler deploy
 */
const MAX_NOTE = 200;
const MAX_HOURS = 48;
const MAX_HOPE = 400;
const MAX_HOPE_POSTS = 200;
const BEACONS_KEY = "all";
const HOPE_KEY = "all";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function loadBeacons(env) {
  try {
    const raw = await env.BEACONS.get(BEACONS_KEY, "json");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function saveBeacons(env, beacons) {
  await env.BEACONS.put(BEACONS_KEY, JSON.stringify(beacons));
}

async function loadHope(env) {
  try {
    const raw = await env.HOPE.get(HOPE_KEY, "json");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

async function saveHope(env, hopePosts) {
  await env.HOPE.put(HOPE_KEY, JSON.stringify(hopePosts));
}

function pruneBeacons(beacons) {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(beacons)) {
    const b = beacons[id];
    if (!b || (b.expiresAt && b.expiresAt < now)) {
      delete beacons[id];
      changed = true;
    }
  }
  return changed;
}

function pruneHope(hopePosts) {
  const ids = Object.keys(hopePosts).sort((a, b) => {
    return (hopePosts[a].createdAt || 0) - (hopePosts[b].createdAt || 0);
  });
  if (ids.length <= MAX_HOPE_POSTS) return false;
  const drop = ids.slice(0, ids.length - MAX_HOPE_POSTS);
  for (const id of drop) delete hopePosts[id];
  return true;
}

function sanitizeBeacon(body, existing) {
  const now = Date.now();
  let lat = Number(body && body.lat);
  let lng = Number(body && body.lng);
  const stateHint = String((body && body.state) || "").trim().toUpperCase().slice(0, 2);
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && /^[A-Z]{2}$/.test(stateHint)) {
    lat = 0;
    lng = 0;
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "invalid lat" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "invalid lng" };
  let expiresAt = Number(body && body.expiresAt);
  if (!Number.isFinite(expiresAt)) expiresAt = now + 24 * 3600 * 1000;
  const maxExp = now + MAX_HOURS * 3600 * 1000;
  if (expiresAt > maxExp) expiresAt = maxExp;
  if (expiresAt <= now) return { error: "expired" };
  const createdAt =
    existing && existing.createdAt ? existing.createdAt : Number(body && body.createdAt) || now;
  const coarseZip = String((body && body.coarseZip) || "").slice(0, 10);
  let state = String((body && body.state) || "").trim().toUpperCase().slice(0, 2);
  if (state && !/^[A-Z]{2}$/.test(state)) state = "";
  const out = {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    createdAt,
    expiresAt,
    coarseZip,
    state
  };
  if (existing && existing.notes) out.notes = existing.notes;
  return { value: out };
}

function publicBeacons(beacons) {
  const out = {};
  for (const [id, b] of Object.entries(beacons)) {
    out[id] = {
      lat: b.lat,
      lng: b.lng,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt,
      coarseZip: b.coarseZip || "",
      state: b.state || ""
    };
  }
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const p = url.pathname.replace(/\/$/, "") || "/";

    if (p === "/" || p === "/health") {
      const beacons = await loadBeacons(env);
      const changed = pruneBeacons(beacons);
      if (changed) await saveBeacons(env, beacons);
      if (p === "/") {
        return json({
          ok: true,
          service: "hearth-ember-api",
          version: "1.6.0",
          host: "cloudflare-workers-kv",
          endpoints: ["/beacons", "/beacons/:id", "/beacons/:id/notes", "/hope", "/health"]
        });
      }
      return json({ ok: true, lights: Object.keys(beacons).length });
    }

    if (p === "/beacons" && request.method === "GET") {
      const beacons = await loadBeacons(env);
      if (pruneBeacons(beacons)) await saveBeacons(env, beacons);
      return json(publicBeacons(beacons));
    }

    if (p === "/beacons" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitizeBeacon(body, null);
      if (error) return json({ error }, 400);
      const beacons = await loadBeacons(env);
      pruneBeacons(beacons);
      const id = newId();
      beacons[id] = value;
      await saveBeacons(env, beacons);
      return json({ id }, 201);
    }

    if (p === "/hope" && request.method === "GET") {
      const hopePosts = await loadHope(env);
      if (pruneHope(hopePosts)) await saveHope(env, hopePosts);
      const out = {};
      for (const [id, post] of Object.entries(hopePosts)) {
        out[id] = {
          text: post.text,
          createdAt: post.createdAt,
          fromLabel: post.fromLabel || "A mom"
        };
      }
      return json(out);
    }

    if (p === "/hope" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const textBody = String((body && body.text) || "").trim().slice(0, MAX_HOPE);
      if (!textBody) return json({ error: "empty" }, 400);
      const fromLabel =
        String((body && body.fromLabel) || "A mom").trim().slice(0, 40) || "A mom";
      const blocked =
        /\b(kill|murder|rape|suicide|bomb|shoot|fuck|shit|bitch|cunt|nigg|faggot|https?:\/\/|www\.|@[a-z0-9_]{3,}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i;
      if (blocked.test(textBody)) return json({ error: "blocked" }, 400);
      const hopePosts = await loadHope(env);
      const id = newId();
      hopePosts[id] = {
        text: textBody,
        createdAt: Number(body.createdAt) || Date.now(),
        fromLabel
      };
      pruneHope(hopePosts);
      await saveHope(env, hopePosts);
      return json({ id }, 201);
    }

    if (p === "/hope" && request.method === "DELETE") {
      /* optional wipe not exposed publicly in express; keep 404 */
      return json({ error: "not found" }, 404);
    }

    const m = p.match(/^\/beacons\/([^/]+)(?:\/(notes))?$/);
    if (!m) return json({ error: "not found" }, 404);
    const id = m[1];
    const notesPath = m[2] === "notes";

    if (!notesPath && request.method === "PUT") {
      const beacons = await loadBeacons(env);
      pruneBeacons(beacons);
      const existing = beacons[id];
      if (!existing) return json({ error: "not found" }, 404);
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitizeBeacon(body, existing);
      if (error) return json({ error }, 400);
      beacons[id] = value;
      await saveBeacons(env, beacons);
      return json({ id });
    }

    if (!notesPath && request.method === "DELETE") {
      const beacons = await loadBeacons(env);
      if (beacons[id]) {
        delete beacons[id];
        await saveBeacons(env, beacons);
      }
      return json({ ok: true });
    }

    if (notesPath && request.method === "GET") {
      const beacons = await loadBeacons(env);
      if (pruneBeacons(beacons)) await saveBeacons(env, beacons);
      const b = beacons[id];
      if (!b) return json({ error: "not found" }, 404);
      return json(b.notes || {});
    }

    if (notesPath && request.method === "POST") {
      const beacons = await loadBeacons(env);
      if (pruneBeacons(beacons)) await saveBeacons(env, beacons);
      const b = beacons[id];
      if (!b) return json({ error: "not found" }, 404);
      const body = await request.json().catch(() => ({}));
      const text = String(body.text || "").trim().slice(0, MAX_NOTE);
      if (!text) return json({ error: "empty" }, 400);
      const nid = newId();
      if (!b.notes) b.notes = {};
      b.notes[nid] = {
        text,
        createdAt: Number(body.createdAt) || Date.now(),
        fromLabel: String(body.fromLabel || "A mom nearby").slice(0, 40)
      };
      beacons[id] = b;
      await saveBeacons(env, beacons);
      return json({ id: nid }, 201);
    }

    return json({ error: "not found" }, 404);
  }
};
