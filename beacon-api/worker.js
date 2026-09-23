/**
 * Cloudflare Worker — same Ember API shape (in-memory + prune).
 * Deploy: wrangler deploy (account required). Express server.js is the live default.
 */
const MAX_NOTE = 200;
const MAX_HOURS = 48;
const store = { beacons: {} };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
}

function prune() {
  const now = Date.now();
  for (const id of Object.keys(store.beacons)) {
    const b = store.beacons[id];
    if (!b || (b.expiresAt && b.expiresAt < now)) delete store.beacons[id];
  }
}

function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function sanitize(body, existing) {
  const now = Date.now();
  const lat = Number(body && body.lat);
  const lng = Number(body && body.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "invalid lat" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "invalid lng" };
  let expiresAt = Number(body && body.expiresAt);
  if (!Number.isFinite(expiresAt)) expiresAt = now + 24 * 3600 * 1000;
  const maxExp = now + MAX_HOURS * 3600 * 1000;
  if (expiresAt > maxExp) expiresAt = maxExp;
  if (expiresAt <= now) return { error: "expired" };
  const createdAt = existing && existing.createdAt ? existing.createdAt : (Number(body.createdAt) || now);
  const out = {
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
    createdAt,
    expiresAt,
    coarseZip: String((body && body.coarseZip) || "").slice(0, 10)
  };
  if (existing && existing.notes) out.notes = existing.notes;
  return { value: out };
}

function publicBeacons() {
  prune();
  const out = {};
  for (const [id, b] of Object.entries(store.beacons)) {
    out[id] = { lat: b.lat, lng: b.lng, createdAt: b.createdAt, expiresAt: b.expiresAt, coarseZip: b.coarseZip || "" };
  }
  return out;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/$/, "") || "/";

    if (p === "/" || p === "/health") {
      prune();
      return json({ ok: true, service: "hearth-ember-api", lights: Object.keys(store.beacons).length });
    }

    if (p === "/beacons" && request.method === "GET") return json(publicBeacons());

    if (p === "/beacons" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitize(body, null);
      if (error) return json({ error }, 400);
      const id = newId();
      store.beacons[id] = value;
      return json({ id }, 201);
    }

    const m = p.match(/^\/beacons\/([^/]+)(?:\/(notes))?$/);
    if (!m) return json({ error: "not found" }, 404);
    const id = m[1];
    const notesPath = m[2] === "notes";

    if (!notesPath && request.method === "PUT") {
      const existing = store.beacons[id];
      if (!existing) return json({ error: "not found" }, 404);
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitize(body, existing);
      if (error) return json({ error }, 400);
      store.beacons[id] = value;
      return json({ id });
    }

    if (!notesPath && request.method === "DELETE") {
      delete store.beacons[id];
      return json({ ok: true });
    }

    if (notesPath && request.method === "GET") {
      prune();
      const b = store.beacons[id];
      if (!b) return json({ error: "not found" }, 404);
      return json(b.notes || {});
    }

    if (notesPath && request.method === "POST") {
      prune();
      const b = store.beacons[id];
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
      return json({ id: nid }, 201);
    }

    return json({ error: "not found" }, 404);
  }
};
