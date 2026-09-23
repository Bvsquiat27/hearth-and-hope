/**
 * Nationwide ZIP proof for Hearth & Hope ≥1.6.10
 * Asserts lookupZip prefix/SCF fallback covers PO Box / unique ZIPs,
 * nearest life-affirming centers have finite miles, and no abortion providers.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadWindowScripts(files) {
  const window = globalThis;
  window.window = window;
  for (const f of files) {
    const code = fs.readFileSync(path.join(root, f), "utf8");
    vm.runInThisContext(code, { filename: f });
  }
  return window;
}

loadWindowScripts([
  "data/centers.js",
  "data/zips.js",
  "data/zip-coords.js",
  "js/centers-filter.js",
  "js/geo.js"
]);

const zips = globalThis.HEARTH_ZIPS || {};
const filter = globalThis.HearthCentersFilter;
let centers = globalThis.HEARTH_CENTERS || [];
if (filter) centers = filter.filterLifeAffirming(centers);

const PROVEN_CITIES = [
  "10001", "77002", "90210", "60614", "33101", "98101",
  "19103", "02115", "75201", "80202", "37203", "94102", "10458"
];

const FORMER_FAILS = ["30301", "85001"]; // Atlanta PO Box, Phoenix PO Box
const RURAL = ["59715", "83201"]; // Bozeman MT, Pocatello ID
const EXTRA = [
  "19107", "20001", "30303", "85003", "99501", "96813",
  "87101", "64101", "55401", "43215"
];

const PR_CANDIDATES = ["00601", "00602", "00901", "00725"];
const prPresent = PR_CANDIDATES.filter((z) => zips[z] || (globalThis.HEARTH_ZIP_COORDS && globalThis.HEARTH_ZIP_COORDS[z]));
const prAnyScf = Object.keys(zips).some((k) => k.startsWith("006") || k.startsWith("007") || k.startsWith("009"));

const TEST_ZIPS = [...new Set([...PROVEN_CITIES, ...FORMER_FAILS, ...RURAL, ...EXTRA, ...prPresent])];

function scfNeighborExists(z) {
  const z3 = z.slice(0, 3);
  return Object.keys(zips).some((k) => k.startsWith(z3));
}

function topResults(origin, limit = 8) {
  return centers
    .filter((c) => {
      if (c.lat == null || c.lng == null) return false;
      const nat =
        (c.type || "").toLowerCase().includes("national") ||
        c.zip === "00000" ||
        (c.city || "").toLowerCase() === "nationwide";
      return !nat;
    })
    .map((c) => ({
      c,
      miles: globalThis.HearthGeo.haversineMiles(origin, c)
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, limit);
}

const ABORTION_RE =
  /\b(planned\s*parenthood|abortion\s*clinic|abortion\s*provider|provide[s]?\s+abortions?|abortion\s+services)\b/i;

let failed = false;
let passed = 0;
const rows = [];

console.log("HEARTH_ZIPS count:", Object.keys(zips).length);
console.log("PR in dataset?", prPresent.length ? prPresent.join(",") : "none");
if (!prPresent.length) {
  console.log(
    prAnyScf
      ? "NOTE: PR SCF keys exist but candidates not listed — skipping PR-specific asserts."
      : "NOTE: Puerto Rico ZIPs not present in HEARTH_ZIPS — skip PR honestly."
  );
}

for (const zip of TEST_ZIPS) {
  const hit = globalThis.HearthGeo.lookupZip(zip);
  const hasScf = scfNeighborExists(zip);
  const exactInDb = !!zips[zip];

  if (!hit) {
    if (hasScf) {
      console.error(`FAIL ${zip}: lookupZip null but SCF neighbor exists`);
      failed = true;
      rows.push({ zip, ok: false, reason: "null despite SCF" });
      continue;
    }
    console.log(`SKIP ${zip}: no SCF neighbor in HEARTH_ZIPS (honest miss)`);
    rows.push({ zip, ok: true, skipped: true });
    continue;
  }

  if (hit.zip !== zip) {
    console.error(`FAIL ${zip}: .zip should preserve typed ZIP, got ${hit.zip}`);
    failed = true;
  }
  if (!exactInDb && !hit.matchedZip && hit.lat == null) {
    console.error(`FAIL ${zip}: miss without matchedZip/coords`);
    failed = true;
  }
  if (hit.lat == null || hit.lng == null || !isFinite(hit.lat) || !isFinite(hit.lng)) {
    console.error(`FAIL ${zip}: bad lat/lng`, hit);
    failed = true;
    continue;
  }

  const top = topResults(hit);
  if (!top.length) {
    console.error(`FAIL ${zip}: no local centers ranked`);
    failed = true;
    continue;
  }
  const badMiles = top.filter((t) => !isFinite(t.miles));
  if (badMiles.length) {
    console.error(`FAIL ${zip}: non-finite miles in top`);
    failed = true;
  }
  const abortHit = top.find((t) => {
    const blob = [t.c.name, t.c.city, t.c.notes, t.c.services, (t.c.needs || []).join(" ")].join(" ");
    return ABORTION_RE.test(blob) || /planned\s*parenthood/i.test(t.c.name || "");
  });
  if (abortHit) {
    console.error(`FAIL ${zip}: abortion provider in top: ${abortHit.c.name}`);
    failed = true;
  }

  const nearest = top[0];
  const note =
    hit.matchedZip && hit.matchedZip !== zip
      ? `via ${hit.matchedZip}`
      : exactInDb
        ? "exact"
        : "zip-coords";
  console.log(
    `OK  ${zip} ${String(hit.city || "").padEnd(14)} ${hit.state || "--"}  ` +
      `→ #1 ${nearest.miles.toFixed(1)} mi ${nearest.c.city}, ${nearest.c.state} (${note})`
  );
  passed++;
  rows.push({ zip, ok: true, city: hit.city, state: hit.state, matchedZip: hit.matchedZip || null, nearestMi: nearest.miles });
}

// Explicit before/after style checks for former fails
for (const z of FORMER_FAILS) {
  const hit = globalThis.HearthGeo.lookupZip(z);
  if (!hit || hit.zip !== z || hit.lat == null) {
    console.error(`FAIL former-miss ${z} still unresolved`);
    failed = true;
  } else {
    console.log(`FORMER FAIL FIXED: ${z} → ${hit.city}, ${hit.state} matchedZip=${hit.matchedZip || "(coords)"}`);
  }
}

// ZIP with no SCF neighbor in HEARTH_ZIPS should stay null (unless zip-coords only)
const nonsense = "00000";
const nonsenseHit = globalThis.HearthGeo.lookupZip(nonsense);
if (nonsenseHit && !scfNeighborExists(nonsense) && !(globalThis.HEARTH_ZIP_COORDS && globalThis.HEARTH_ZIP_COORDS[nonsense])) {
  console.error("FAIL: 00000 should not resolve without SCF/coords");
  failed = true;
} else if (!nonsenseHit) {
  console.log("OK  00000 correctly unresolved (no SCF)");
} else {
  console.log("OK  00000 resolved via available data");
}

console.log(`\nNationwide proof: ${passed} ZIPs passed (${TEST_ZIPS.length} tested, PR skipped=${prPresent.length === 0})`);
if (failed) {
  console.error("FAIL: nationwide ZIP proof");
  process.exit(1);
}
console.log("PASS: nationwide ZIP lookup + finite miles + life-affirming top lists");
