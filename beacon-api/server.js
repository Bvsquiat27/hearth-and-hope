/**
 * Hearth & Hope — Postpartum Ember public API
 * Coarse/fuzzy locations only. No PII. Prunes expired lights.
 */
"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "beacons.json");
const MAX_NOTE = 200;
const MAX_HOURS = 48;

/** @type {Record<string, any>} */
let beacons = {};

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      beacons = raw && typeof raw === "object" ? raw : {};
    }
  } catch (e) {
    console.warn("load failed", e.message);
    beacons = {};
  }
  prune();
}

function save() {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(beacons));
  } catch (e) {
    console.warn("save failed", e.message);
  }
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

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "32kb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "hearth-ember-api",
    version: "1.0.0",
    endpoints: ["/beacons", "/beacons/:id", "/beacons/:id/notes", "/health"]
  });
});

app.get("/health", (_req, res) => {
  prune();
  res.json({ ok: true, lights: Object.keys(beacons).length });
});

app.get("/beacons", (_req, res) => {
  res.json(publicBeacons());
});

app.post("/beacons", (req, res) => {
  const { value, error } = sanitizeBeacon(req.body, null);
  if (error) return res.status(400).json({ error });
  const id = newId();
  beacons[id] = value;
  save();
  res.status(201).json({ id });
});

app.put("/beacons/:id", (req, res) => {
  const id = req.params.id;
  const existing = beacons[id];
  if (!existing) return res.status(404).json({ error: "not found" });
  const { value, error } = sanitizeBeacon(req.body, existing);
  if (error) return res.status(400).json({ error });
  beacons[id] = value;
  save();
  res.json({ id });
});

app.delete("/beacons/:id", (req, res) => {
  const id = req.params.id;
  if (beacons[id]) {
    delete beacons[id];
    save();
  }
  res.json({ ok: true });
});

app.get("/beacons/:id/notes", (req, res) => {
  prune();
  const b = beacons[req.params.id];
  if (!b) return res.status(404).json({ error: "not found" });
  res.json(b.notes || {});
});

app.post("/beacons/:id/notes", (req, res) => {
  prune();
  const b = beacons[req.params.id];
  if (!b) return res.status(404).json({ error: "not found" });
  const text = String((req.body && req.body.text) || "").trim().slice(0, MAX_NOTE);
  if (!text) return res.status(400).json({ error: "empty" });
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

load();
setInterval(prune, 60 * 1000);

app.listen(PORT, "0.0.0.0", () => {
  console.log("hearth-ember-api listening on " + PORT);
});
