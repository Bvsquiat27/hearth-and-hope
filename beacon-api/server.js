/**
 * Hearth & Hope — Postpartum Ember + Accounts API
 * Public: /beacons (coarse lights only). Private: /auth + /me/sync (never on public map).
 */
"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const PORT = Number(process.env.PORT || 8765);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "beacons.json");
const HOPE_FILE = process.env.HOPE_FILE || path.join(__dirname, "data", "hope.json");
const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, "data", "users.json");
const MAX_NOTE = 200;
const MAX_HOURS = 48;
const MAX_HOPE = 400;
const MAX_HOPE_POSTS = 200;
const TOKEN_TTL_MS = 90 * 24 * 3600 * 1000; // 90 days
const BCRYPT_ROUNDS = 10;

/** @type {Record<string, any>} */
let beacons = {};
/** @type {Record<string, any>} */
let hopePosts = {};
/** @type {Record<string, any>} */
let users = {}; // emailLower -> { id, email, passHash, createdAt, token, tokenExp, private }

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(file, obj) {
  ensureDataDir();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file);
}

function loadJson(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      return raw && typeof raw === "object" ? raw : fallback;
    }
  } catch (e) {
    console.warn("load failed", file, e.message);
  }
  return fallback;
}

function load() {
  ensureDataDir();
  beacons = loadJson(DATA_FILE, {});
  hopePosts = loadJson(HOPE_FILE, {});
  users = loadJson(USERS_FILE, {});
  prune();
  pruneHope();
}

function save() { atomicWrite(DATA_FILE, beacons); }
function saveHope() { atomicWrite(HOPE_FILE, hopePosts); }
function saveUsers() { atomicWrite(USERS_FILE, users); }

function pruneHope() {
  const ids = Object.keys(hopePosts).sort((a, b) => (hopePosts[a].createdAt || 0) - (hopePosts[b].createdAt || 0));
  if (ids.length <= MAX_HOPE_POSTS) return;
  for (const id of ids.slice(0, ids.length - MAX_HOPE_POSTS)) delete hopePosts[id];
  saveHope();
}

function prune() {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(beacons)) {
    const b = beacons[id];
    if (!b || (b.expiresAt && b.expiresAt < now)) {
      delete beacons[id];
      changed = true;
    }
  }
  if (changed) save();
}

function newId() {
  return crypto.randomBytes(8).toString("hex");
}

function newOwnerSecret() {
  return crypto.randomBytes(32).toString("base64url");
}
function hashOwnerSecret(secret) {
  return crypto.createHash("sha256").update(String(secret || ""), "utf8").digest("base64");
}
function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
function extractBeaconSecret(req) {
  const h = String(req.get("Authorization") || "");
  const m = h.match(/^Beacon\s+(.+)$/i);
  if (m) return m[1].trim();
  return String(req.get("X-Hearth-Beacon") || "").trim();
}
function verifyBeaconOwner(req, beacon) {
  if (!beacon || !beacon.ownerHash) return false;
  const secret = extractBeaconSecret(req);
  if (!secret) return false;
  return timingSafeEqualStr(hashOwnerSecret(secret), beacon.ownerHash);
}


function sanitizeBeacon(body, existing) {
  const now = Date.now();
  let lat = Number(body && (body.lat != null ? body.lat : body.latitude));
  let lng = Number(body && (body.lng != null ? body.lng : body.longitude));
  const stateHint = String((body && body.state) || "").trim().toUpperCase().slice(0, 2);
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && /^[A-Z]{2}$/.test(stateHint)) {
    lat = 0; lng = 0;
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "invalid lat" };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "invalid lng" };
  let expiresAt = Number(body && (body.expiresAt != null ? body.expiresAt : body.expires));
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
  if (existing && existing.ownerHash) out.ownerHash = existing.ownerHash;
  return { value: out };
}

function publicBeacons() {
  prune();
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

function issueToken(user) {
  user.token = crypto.randomBytes(24).toString("hex");
  user.tokenExp = Date.now() + TOKEN_TTL_MS;
  return user.token;
}

function findUserByToken(req) {
  const h = String(req.headers.authorization || "");
  const m = h.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : String(req.headers["x-hearth-token"] || "").trim();
  if (!token) return null;
  const now = Date.now();
  for (const u of Object.values(users)) {
    if (u && u.token === token && u.tokenExp && u.tokenExp > now) return u;
  }
  return null;
}

function publicUser(u) {
  return { id: u.id, email: u.email, createdAt: u.createdAt };
}

function emptyPrivate() {
  return {
    baby: null,
    contractions: null,
    reminders: null,
    ember: null,
    updatedAt: 0
  };
}

/** Prefer newer timestamps when merging cloud ↔ device */
function mergePrivate(cloud, local) {
  const c = cloud && typeof cloud === "object" ? cloud : emptyPrivate();
  const l = local && typeof local === "object" ? local : emptyPrivate();
  const out = emptyPrivate();
  out.updatedAt = Math.max(Number(c.updatedAt) || 0, Number(l.updatedAt) || 0, Date.now());

  function pick(key, tsKey) {
    const cv = c[key], lv = l[key];
    if (cv == null && lv == null) return null;
    if (cv == null) return lv;
    if (lv == null) return cv;
    const ct = Number((cv && cv[tsKey]) || c.updatedAt || 0);
    const lt = Number((lv && lv[tsKey]) || l.updatedAt || 0);
    return lt >= ct ? lv : cv;
  }

  out.baby = pick("baby", "updatedAt");
  out.contractions = pick("contractions", "updatedAt");
  out.reminders = pick("reminders", "updatedAt");
  out.ember = pick("ember", "updatedAt");
  return out;
}

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Hearth-Token", "X-Hearth-Beacon"]
}));
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "hearth-ember-api",
    version: "1.6.2",
    endpoints: [
      "/health", "/beacons", "/beacons/:id", "/beacons/:id/notes", "/hope",
      "/auth/signup", "/auth/login", "/auth/logout", "/auth/me", "/me/sync"
    ]
  });
});

app.get("/health", (_req, res) => {
  prune();
  res.json({
    ok: true,
    lights: Object.keys(beacons).length,
    accounts: Object.keys(users).length,
    version: "1.6.2"
  });
});

app.get("/beacons", (_req, res) => {
  res.json(publicBeacons());
});

app.post("/beacons", (req, res) => {
  const { value, error } = sanitizeBeacon(req.body, null);
  if (error) return res.status(400).json({ error });
  const id = newId();
  const ownerSecret = newOwnerSecret();
  value.ownerHash = hashOwnerSecret(ownerSecret);
  beacons[id] = value;
  save();
  res.status(201).json({ id, ownerSecret, beacon: publicBeacons()[id] });
});

app.put("/beacons/:id", (req, res) => {
  const id = req.params.id;
  const existing = beacons[id];
  if (!existing) return res.status(404).json({ error: "not found" });
  if (!verifyBeaconOwner(req, existing)) return res.status(401).json({ error: "auth" });
  const { value, error } = sanitizeBeacon(req.body, existing);
  if (error) return res.status(400).json({ error });
  beacons[id] = value;
  save();
  res.json({ id });
});

app.delete("/beacons/:id", (req, res) => {
  const id = req.params.id;
  if (!beacons[id]) return res.status(404).json({ error: "not found" });
  if (!verifyBeaconOwner(req, beacons[id])) return res.status(401).json({ error: "auth" });
  delete beacons[id];
  save();
  res.json({ ok: true });
});

app.get("/beacons/:id/notes", (req, res) => {
  prune();
  const b = beacons[req.params.id];
  if (!b) return res.status(404).json({ error: "not found" });
  if (!verifyBeaconOwner(req, b)) return res.status(401).json({ error: "auth" });
  res.json(b.notes || {});
});

app.post("/beacons/:id/notes", (req, res) => {
  prune();
  const b = beacons[req.params.id];
  if (!b) return res.status(404).json({ error: "not found" });
  const text = String((req.body && req.body.text) || "").trim().slice(0, MAX_NOTE);
  if (!text) return res.status(400).json({ error: "empty" });
  const blocked = /\b(kill|murder|rape|suicide|bomb|shoot|fuck|shit|bitch|cunt|nigg|faggot|https?:\/\/|www\.|@[a-z0-9_]{3,}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i;
  if (blocked.test(text)) return res.status(400).json({ error: "blocked" });
  const nid = newId();
  if (!b.notes) b.notes = {};
  b.notes[nid] = {
    text,
    createdAt: Number(req.body.createdAt) || Date.now(),
    fromLabel: String((req.body && req.body.fromLabel) || "A mom nearby").slice(0, 40)
  };
  save();
  res.status(201).json({ id: nid });
});

app.get("/hope", (_req, res) => {
  pruneHope();
  const out = {};
  for (const [id, p] of Object.entries(hopePosts)) {
    out[id] = { text: p.text, createdAt: p.createdAt, fromLabel: p.fromLabel || "A mom" };
  }
  res.json(out);
});

app.post("/hope", (req, res) => {
  const textBody = String((req.body && req.body.text) || "").trim().slice(0, MAX_HOPE);
  if (!textBody) return res.status(400).json({ error: "empty" });
  const fromLabel = String((req.body && req.body.fromLabel) || "A mom").trim().slice(0, 40) || "A mom";
  const blocked = /\b(kill|murder|rape|suicide|bomb|shoot|fuck|shit|bitch|cunt|nigg|faggot|https?:\/\/|www\.|@[a-z0-9_]{3,}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/i;
  if (blocked.test(textBody)) return res.status(400).json({ error: "blocked" });
  const id = newId();
  hopePosts[id] = { text: textBody, createdAt: Number(req.body.createdAt) || Date.now(), fromLabel };
  pruneHope();
  saveHope();
  res.status(201).json({ id });
});

/* ——— Accounts (private; never mixed into /beacons) ——— */

app.post("/auth/signup", (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const password = String((req.body && req.body.password) || "");
  if (!validEmail(email)) return res.status(400).json({ error: "email" });
  if (!validPassword(password)) return res.status(400).json({ error: "password" });
  if (users[email]) return res.status(409).json({ error: "exists" });
  const id = newId();
  const passHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const u = {
    id,
    email,
    passHash,
    createdAt: Date.now(),
    token: null,
    tokenExp: 0,
    private: emptyPrivate()
  };
  const token = issueToken(u);
  users[email] = u;
  saveUsers();
  res.status(201).json({ token, user: publicUser(u), private: u.private });
});

app.post("/auth/login", (req, res) => {
  const email = normEmail(req.body && req.body.email);
  const password = String((req.body && req.body.password) || "");
  const u = users[email];
  if (!u || !bcrypt.compareSync(password, u.passHash)) {
    return res.status(401).json({ error: "credentials" });
  }
  const token = issueToken(u);
  saveUsers();
  res.json({ token, user: publicUser(u), private: u.private || emptyPrivate() });
});

app.post("/auth/logout", (req, res) => {
  const u = findUserByToken(req);
  if (u) {
    u.token = null;
    u.tokenExp = 0;
    saveUsers();
  }
  res.json({ ok: true });
});

app.get("/auth/me", (req, res) => {
  const u = findUserByToken(req);
  if (!u) return res.status(401).json({ error: "auth" });
  res.json({ user: publicUser(u), private: u.private || emptyPrivate() });
});

app.get("/me/sync", (req, res) => {
  const u = findUserByToken(req);
  if (!u) return res.status(401).json({ error: "auth" });
  res.json({ private: u.private || emptyPrivate() });
});

app.put("/me/sync", (req, res) => {
  const u = findUserByToken(req);
  if (!u) return res.status(401).json({ error: "auth" });
  const incoming = (req.body && req.body.private) || req.body || {};
  // Strip anything that looks like it belongs on the public map
  const safe = {
    baby: incoming.baby != null ? incoming.baby : null,
    contractions: incoming.contractions != null ? incoming.contractions : null,
    reminders: incoming.reminders != null ? incoming.reminders : null,
    ember: incoming.ember != null ? incoming.ember : null,
    updatedAt: Number(incoming.updatedAt) || Date.now()
  };
  // Never accept raw beacon coordinates lists here
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
  saveUsers();
  res.json({ private: u.private });
});

load();
setInterval(prune, 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log("hearth-ember-api " + "1.6.0 listening on " + PORT);
});
