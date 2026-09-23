/**
 * Cloudflare Worker — Hearth Ember API + Accounts (KV).
 * Public /beacons never include private account payloads.
 */
const MAX_NOTE = 200;
const MAX_HOURS = 48;
const MAX_HOPE = 400;
const MAX_HOPE_POSTS = 200;
const TOKEN_TTL_MS = 90 * 24 * 3600 * 1000;
const BEACONS_KEY = "all";
const HOPE_KEY = "all";
const USERS_KEY = "all";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Hearth-Token",
    "Content-Type": "application/json"
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}
function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
async function loadMap(kv, key) {
  try {
    const raw = await kv.get(key, "json");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}
async function saveMap(kv, key, obj) {
  await kv.put(key, JSON.stringify(obj));
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
  const ids = Object.keys(hopePosts).sort(
    (a, b) => (hopePosts[a].createdAt || 0) - (hopePosts[b].createdAt || 0)
  );
  if (ids.length <= MAX_HOPE_POSTS) return false;
  for (const id of ids.slice(0, ids.length - MAX_HOPE_POSTS)) delete hopePosts[id];
  return true;
}
function sanitizeBeacon(body, existing) {
  const now = Date.now();
  let lat = Number(body && body.lat);
  let lng = Number(body && body.lng);
  const stateHint = String((body && body.state) || "").trim().toUpperCase().slice(0, 2);
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && /^[A-Z]{2}$/.test(stateHint)) {
    lat = 0; lng = 0;
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "invalid lat" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "invalid lng" };
  let expiresAt = Number(body && body.expiresAt);
  if (!Number.isFinite(expiresAt)) expiresAt = now + 24 * 3600 * 1000;
  const maxExp = now + MAX_HOURS * 3600 * 1000;
  if (expiresAt > maxExp) expiresAt = maxExp;
  if (expiresAt <= now) return { error: "expired" };
  const createdAt = existing && existing.createdAt ? existing.createdAt : (Number(body.createdAt) || now);
  const coarseZip = String((body && (body.coarseZip || body.coarseZip || body.zip)) || "").slice(0, 10);
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
function emptyPrivate() {
  return { baby: null, contractions: null, reminders: null, ember: null, updatedAt: 0 };
}
function normEmail(e) {
  return String(e || "").trim().toLowerCase().slice(0, 120);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validPassword(p) {
  const s = String(p || "");
  return s.length >= 6 && s.length <= 72;
}
function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: b64(bits), salt: b64(salt) };
}
async function verifyPassword(password, saltB64, hashB64) {
  const { hash } = await hashPassword(password, saltB64);
  return hash === hashB64;
}
function issueToken(user) {
  user.token = newId() + newId();
  user.tokenExp = Date.now() + TOKEN_TTL_MS;
  return user.token;
}
function publicUser(u) {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}
function findByToken(users, req) {
  const h = String(req.headers.get("Authorization") || "");
  const m = h.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : String(req.headers.get("X-Hearth-Token") || "").trim();
  if (!token) return null;
  const now = Date.now();
  for (const u of Object.values(users)) {
    if (u && u.token === token && u.tokenExp && u.tokenExp > now) return u;
  }
  return null;
}
function mergePrivate(cloud, local) {
  const c = cloud && typeof cloud === "object" ? cloud : emptyPrivate();
  const l = local && typeof local === "object" ? local : emptyPrivate();
  const out = emptyPrivate();
  out.updatedAt = Math.max(Number(c.updatedAt) || 0, Number(l.updatedAt) || 0, Date.now());
  function pick(key) {
    const cv = c[key], lv = l[key];
    if (cv == null && lv == null) return null;
    if (cv == null) return lv;
    if (lv == null) return cv;
    const ct = Number((cv && cv.updatedAt) || c.updatedAt || 0);
    const lt = Number((lv && lv.updatedAt) || l.updatedAt || 0);
    return lt >= ct ? lv : cv;
  }
  out.baby = pick("baby");
  out.contractions = pick("contractions");
  out.reminders = pick("reminders");
  out.ember = pick("ember");
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
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      pruneBeacons(beacons);
      let accounts = 0;
      try {
        const users = await loadMap(env.USERS, USERS_KEY);
        accounts = Object.keys(users).length;
      } catch (_) {}
      if (p === "/health") {
        return json({ ok: true, lights: Object.keys(beacons).length, accounts, version: "1.6.0" });
      }
      return json({
        ok: true,
        service: "hearth-ember-api",
        version: "1.6.0",
        host: "cloudflare-workers-kv",
        endpoints: [
          "/beacons", "/beacons/:id", "/beacons/:id/notes", "/hope", "/health",
          "/auth/signup", "/auth/login", "/auth/logout", "/auth/me", "/me/sync"
        ]
      });
    }

    /* ——— Embers ——— */
    if (p === "/beacons" && request.method === "GET") {
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      if (pruneBeacons(beacons)) await saveMap(env.BEACONS, BEACONS_KEY, beacons);
      return json(publicBeacons(beacons));
    }
    if (p === "/beacons" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitizeBeacon(body, null);
      if (error) return json({ error }, 400);
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      pruneBeacons(beacons);
      const id = newId();
      beacons[id] = value;
      await saveMap(env.BEACONS, BEACONS_KEY, beacons);
      return json({ id, beacon: publicBeacons(beacons)[id] }, 201);
    }
    const beaconPut = p.match(/^\/beacons\/([^/]+)$/);
    if (beaconPut && request.method === "PUT") {
      const id = beaconPut[1];
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      if (!beacons[id]) return json({ error: "not found" }, 404);
      const body = await request.json().catch(() => ({}));
      const { value, error } = sanitizeBeacon(body, beacons[id]);
      if (error) return json({ error }, 400);
      beacons[id] = value;
      await saveMap(env.BEACONS, BEACONS_KEY, beacons);
      return json({ id });
    }
    if (beaconPut && request.method === "DELETE") {
      const id = beaconPut[1];
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      if (beacons[id]) {
        delete beacons[id];
        await saveMap(env.BEACONS, BEACONS_KEY, beacons);
      }
      return json({ ok: true });
    }
    const notesMatch = p.match(/^\/beacons\/([^/]+)\/notes$/);
    if (notesMatch && request.method === "GET") {
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      pruneBeacons(beacons);
      const b = beacons[notesMatch[1]];
      if (!b) return json({ error: "not found" }, 404);
      return json(b.notes || {});
    }
    if (notesMatch && request.method === "POST") {
      const beacons = await loadMap(env.BEACONS, BEACONS_KEY);
      pruneBeacons(beacons);
      const b = beacons[notesMatch[1]];
      if (!b) return json({ error: "not found" }, 404);
      const body = await request.json().catch(() => ({}));
      const text = String((body && body.text) || "").trim().slice(0, MAX_NOTE);
      if (!text) return json({ error: "empty" }, 400);
      const blocked = /\b(kill|murder|rape|suicide|bomb|shoot|fuck|shit|bitch|cunt|nigg|faggot|https?:\/\/|www\.|@[a-z0-9_]{3,}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i;
      if (blocked.test(text)) return json({ error: "blocked" }, 400);
      const nid = newId();
      if (!b.notes) b.notes = {};
      b.notes[nid] = {
        text,
        createdAt: Number(body.createdAt) || Date.now(),
        fromLabel: String((body && (body.fromLabel || body.fromLabel)) || "A mom nearby").slice(0, 40)
      };
      await saveMap(env.BEACONS, BEACONS_KEY, beacons);
      return json({ id: nid }, 201);
    }

    if (p === "/hope" && request.method === "GET") {
      const hopePosts = await loadMap(env.HOPE, HOPE_KEY);
      if (pruneHope(hopePosts)) await saveMap(env.HOPE, HOPE_KEY, hopePosts);
      const out = {};
      for (const [id, post] of Object.entries(hopePosts)) {
        out[id] = { text: post.text, createdAt: post.createdAt, fromLabel: post.fromLabel || "A mom" };
      }
      return json(out);
    }
    if (p === "/hope" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const textBody = String((body && body.text) || "").trim().slice(0, MAX_HOPE);
      if (!textBody) return json({ error: "empty" }, 400);
      const fromLabel = String((body && body.fromLabel) || "A mom").trim().slice(0, 40) || "A mom";
      const blocked = /\b(kill|murder|rape|suicide|bomb|shoot|fuck|shit|bitch|cunt|nigg|faggot|https?:\/\/|www\.|@[a-z0-9_]{3,}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i;
      if (blocked.test(textBody)) return json({ error: "blocked" }, 400);
      const hopePosts = await loadMap(env.HOPE, HOPE_KEY);
      const id = newId();
      hopePosts[id] = { text: textBody, createdAt: Number(body.createdAt) || Date.now(), fromLabel };
      pruneHope(hopePosts);
      await saveMap(env.HOPE, HOPE_KEY, hopePosts);
      return json({ id }, 201);
    }

    /* ——— Accounts (private; never on /beacons) ——— */
    if (p === "/auth/signup" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const email = normEmail(body.email);
      const password = String(body.password || "");
      if (!validEmail(email)) return json({ error: "email" }, 400);
      if (!validPassword(password)) return json({ error: "password" }, 400);
      const users = await loadMap(env.USERS, USERS_KEY);
      if (users[email]) return json({ error: "exists" }, 409);
      const { hash, salt } = await hashPassword(password);
      const u = {
        id: newId(),
        email,
        passHash: hash,
        passSalt: salt,
        createdAt: Date.now(),
        token: null,
        tokenExp: 0,
        private: emptyPrivate()
      };
      const token = issueToken(u);
      users[email] = u;
      await saveMap(env.USERS, USERS_KEY, users);
      return json({ token, user: publicUser(u), private: u.private }, 201);
    }
    if (p === "/auth/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const email = normEmail(body.email);
      const password = String(body.password || "");
      const users = await loadMap(env.USERS, USERS_KEY);
      const u = users[email];
      if (!u || !(await verifyPassword(password, u.passSalt, u.passHash))) {
        return json({ error: "credentials" }, 401);
      }
      const token = issueToken(u);
      await saveMap(env.USERS, USERS_KEY, users);
      return json({ token, user: publicUser(u), private: u.private || emptyPrivate() });
    }
    if (p === "/auth/logout" && request.method === "POST") {
      const users = await loadMap(env.USERS, USERS_KEY);
      const u = findByToken(users, request);
      if (u) {
        u.token = null;
        u.tokenExp = 0;
        await saveMap(env.USERS, USERS_KEY, users);
      }
      return json({ ok: true });
    }
    if (p === "/auth/me" && request.method === "GET") {
      const users = await loadMap(env.USERS, USERS_KEY);
      const u = findByToken(users, request);
      if (!u) return json({ error: "auth" }, 401);
      return json({ user: publicUser(u), private: u.private || emptyPrivate() });
    }
    if (p === "/me/sync" && request.method === "GET") {
      const users = await loadMap(env.USERS, USERS_KEY);
      const u = findByToken(users, request);
      if (!u) return json({ error: "auth" }, 401);
      return json({ private: u.private || emptyPrivate() });
    }
    if (p === "/me/sync" && request.method === "PUT") {
      const users = await loadMap(env.USERS, USERS_KEY);
      const u = findByToken(users, request);
      if (!u) return json({ error: "auth" }, 401);
      const body = await request.json().catch(() => ({}));
      const incoming = (body && body.private) || body || {};
      const safe = {
        baby: incoming.baby != null ? incoming.baby : null,
        contractions: incoming.contractions != null ? incoming.contractions : null,
        reminders: incoming.reminders != null ? incoming.reminders : null,
        ember: incoming.ember != null ? incoming.ember : null,
        updatedAt: Number(incoming.updatedAt) || Date.now()
      };
      if (safe.ember && typeof safe.ember === "object") {
        safe.ember = {
          id: String(safe.ember.id || "").slice(0, 32),
          state: String(safe.ember.state || "").toUpperCase().slice(0, 2),
          expiresAt: Number(safe.ember.expiresAt) || 0,
          hours: Number(safe.ember.hours) || 0,
          updatedAt: Number(safe.ember.updatedAt) || Date.now()
        };
      }
      u.private = mergePrivate(u.private, safe);
      u.private.updatedAt = Date.now();
      await saveMap(env.USERS, USERS_KEY, users);
      return json({ private: u.private });
    }

    return json({ error: "not found" }, 404);
  }
};
