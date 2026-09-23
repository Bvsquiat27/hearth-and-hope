/**
 * Hearth & Hope geo helpers — pure functions for ZIP/city → nearest centers.
 * Depends on window.HEARTH_ZIPS / HEARTH_CITIES (data/zips.js) and HEARTH_CENTERS.
 */
(function (w) {
  "use strict";

  var R_MI = 3958.7613;

  function toRad(d) {
    return (d * Math.PI) / 180;
  }

  function haversineMiles(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return Infinity;
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function normalizeZip(z) {
    if (z == null) return "";
    var s = String(z).replace(/\D/g, "");
    if (s.length >= 5) return s.slice(0, 5);
    return s;
  }

  /**
   * Among HEARTH_ZIPS keys sharing prefix, pick closest numeric ZIP to target.
   * Tries 4-digit then 3-digit (SCF). Returns {key, rec} or null.
   */
  function nearestZipByPrefix(zipOnly, zips) {
    var zipNum = parseInt(zipOnly, 10);
    if (!isFinite(zipNum)) return null;
    var prefixes = [zipOnly.slice(0, 4), zipOnly.slice(0, 3)];
    for (var pi = 0; pi < prefixes.length; pi++) {
      var p = prefixes[pi];
      if (!p || p.length < 3) continue;
      var bestKey = null;
      var bestDist = Infinity;
      for (var zk in zips) {
        if (zk.indexOf(p) !== 0) continue;
        var d = Math.abs(parseInt(zk, 10) - zipNum);
        if (d < bestDist) {
          bestDist = d;
          bestKey = zk;
        }
      }
      if (bestKey && zips[bestKey]) {
        return { key: bestKey, rec: zips[bestKey] };
      }
    }
    return null;
  }

  /**
   * Resolve a query string (ZIP, "City, ST", or "City ST") to
   * {lat,lng,city,state,zip, matchedZip?}.
   * For PO Box / unique ZIPs missing from HEARTH_ZIPS, falls back to nearest
   * 4-digit then 3-digit (SCF) neighbor. `.zip` stays the user-typed ZIP;
   * `.matchedZip` is the centroid ZIP actually used when they differ.
   */
  function lookupZip(query) {
    var q = (query || "").trim();
    if (!q) return null;
    var zips = w.HEARTH_ZIPS || {};
    var cities = w.HEARTH_CITIES || {};
    var zipCoords = w.HEARTH_ZIP_COORDS || {};

    var zipOnly = normalizeZip(q);
    if (/^\d{5}$/.test(zipOnly)) {
      if (zips[zipOnly]) {
        var z = zips[zipOnly];
        return { lat: z.lat, lng: z.lng, city: z.city, state: z.state, zip: zipOnly };
      }

      // Exact miss in HEARTH_ZIPS: prefer zip-coords centroid when present,
      // enrich city/state from nearest SCF neighbor; else use neighbor lat/lng.
      var near = nearestZipByPrefix(zipOnly, zips);
      if (zipCoords[zipOnly]) {
        var pair = zipCoords[zipOnly];
        var lat = Array.isArray(pair) ? pair[0] : pair.lat;
        var lng = Array.isArray(pair) ? pair[1] : pair.lng;
        if (lat != null && lng != null) {
          return {
            lat: lat,
            lng: lng,
            city: near ? near.rec.city : null,
            state: near ? near.rec.state : null,
            zip: zipOnly,
            matchedZip: near ? near.key : null
          };
        }
      }
      if (near) {
        return {
          lat: near.rec.lat,
          lng: near.rec.lng,
          city: near.rec.city,
          state: near.rec.state,
          zip: zipOnly,
          matchedZip: near.key
        };
      }
      // Valid 5-digit with no SCF neighbor in DB — fail closed (no city parse)
      return null;
    }

    // "City, ST" or "City ST"
    var m = q.match(/^(.+?)[,\s]+([A-Za-z]{2})\s*$/);
    if (m) {
      var key = m[1].trim().toLowerCase() + "|" + m[2].toUpperCase();
      var cz = cities[key];
      if (cz && zips[cz]) {
        var c = zips[cz];
        return { lat: c.lat, lng: c.lng, city: c.city, state: c.state, zip: cz };
      }
    }

    // Bare city: try unique match across states (prefer larger? first hit)
    var lower = q.toLowerCase();
    var hits = [];
    for (var k in cities) {
      if (k.indexOf(lower + "|") === 0) hits.push(cities[k]);
    }
    if (hits.length === 1 && zips[hits[0]]) {
      var h = zips[hits[0]];
      return { lat: h.lat, lng: h.lng, city: h.city, state: h.state, zip: hits[0] };
    }

    // Partial ZIP prefix (3–4 digits typed) — closest numeric among matches
    if (/^\d{3,4}$/.test(zipOnly)) {
      var bestKey = null;
      var bestDist = Infinity;
      var zipNum = parseInt((zipOnly + "00000").slice(0, 5), 10);
      for (var zk in zips) {
        if (zk.indexOf(zipOnly) !== 0) continue;
        var d = Math.abs(parseInt(zk, 10) - zipNum);
        if (d < bestDist) {
          bestDist = d;
          bestKey = zk;
        }
      }
      if (bestKey && zips[bestKey]) {
        var zp = zips[bestKey];
        return { lat: zp.lat, lng: zp.lng, city: zp.city, state: zp.state, zip: bestKey };
      }
    }
    return null;
  }

  /**
   * Return centers sorted by distance to query.
   * @param {string|object} query ZIP/city string or {lat,lng}
   * @param {array} centers HEARTH_CENTERS
   * @param {{limit?:number, needs?:string[], maxMiles?:number}} opts
   */
  function nearestCenters(query, centers, opts) {
    opts = opts || {};
    var limit = opts.limit != null ? opts.limit : 10;
    var list = centers || w.HEARTH_CENTERS || [];
    var origin =
      query && typeof query === "object" && query.lat != null
        ? query
        : lookupZip(query);

    var scored = list
      .filter(function (c) {
        return c && c.state !== "US" && c.lat != null && c.lng != null;
      })
      .map(function (c) {
        var miles = origin ? haversineMiles(origin, c) : null;
        var overlap = 0;
        if (opts.needs && opts.needs.length) {
          overlap = opts.needs.filter(function (n) {
            return (c.needs || []).indexOf(n) >= 0;
          }).length;
        }
        return { c: c, miles: miles, overlap: overlap };
      });

    if (origin && opts.maxMiles != null) {
      scored = scored.filter(function (s) {
        return s.miles <= opts.maxMiles;
      });
    }

    scored.sort(function (a, b) {
      if (origin) {
        if (a.miles !== b.miles) return a.miles - b.miles;
      }
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return a.c.name.localeCompare(b.c.name);
    });

    // Always include national helplines at the end if room / as extras
    var nationals = list.filter(function (c) {
      return c && c.state === "US";
    });

    var out = scored.slice(0, limit).map(function (s) {
      var copy = Object.assign({}, s.c);
      if (s.miles != null && isFinite(s.miles)) {
        copy.distanceMiles = Math.round(s.miles * 10) / 10;
      }
      return copy;
    });

    nationals.forEach(function (n) {
      if (out.length < limit + 2 && !out.find(function (x) { return x.id === n.id; })) {
        out.push(Object.assign({}, n, { distanceMiles: null }));
      }
    });

    return out;
  }

  w.HearthGeo = {
    haversineMiles: haversineMiles,
    lookupZip: lookupZip,
    nearestCenters: nearestCenters,
    normalizeZip: normalizeZip,
  };
})(typeof window !== "undefined" ? window : globalThis);
