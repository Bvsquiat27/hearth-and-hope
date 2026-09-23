/**
 * Postpartum Beacon — anonymous area-glow map + one-way encouragement notes.
 * Never stores or displays exact GPS. Opt-in only. Lights expire.
 */
(function () {
  "use strict";

  var LS_ID = "hearth_beacon_id";
  var LS_META = "hearth_beacon_meta";
  var MAX_NOTE = 180;
  var MAX_OFFSET_DEG = 0.12; /* ~10 miles */
  var NEAR_MILES = 40;
  var map = null;
  var markersLayer = null;
  var myCircle = null;
  var unsub = null;
  var beaconsCache = {};
  var viewReady = false;

  var SUGGESTED = [
    "You're not alone",
    "Praying for you",
    "One day at a time",
    "You're a good mom",
    "This hard night will pass",
    "Sending quiet strength",
    "Rest when you can",
    "God sees you",
    "Take a slow breath",
    "You've got this"
  ];

  /* Client blocklist — profanity, threats, contact sharing */
  var BLOCK = [
    /\b(kill|murder|rape|suicide|kms|kys|die\s*bitch|hurt\s*you|stalk|bomb|shoot)\b/i,
    /\b(fuck|fucking|shit|bitch|asshole|cunt|slut|whore|nigg|faggot|retard)\b/i,
    /\b(sex|sexy|nude|porn|onlyfans)\b/i,
    /\b(kill\s*yourself|hang\s*yourself|cut\s*yourself)\b/i,
    /\b(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b)/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    /(?:^|\s)@[a-z0-9_]{3,}/i,
    /\b(snapchat|instagram|tiktok|discord|telegram|whatsapp|dm\s*me|text\s*me|call\s*me)\b/i
  ];

  function $(id) { return document.getElementById(id); }


  function restBase() {
    var c = window.HEARTH_FIREBASE;
    return (c && c.restBaseUrl) ? String(c.restBaseUrl).replace(/\/$/, "") : "";
  }
  function isBackendReady() {
    return isFirebaseReady() || !!restBase();
  }
  function isFirebaseReady() {
    var c = window.HEARTH_FIREBASE;
    return !!(c && c.configured && c.databaseURL && c.apiKey && window.firebase);
  }

  function filterNote(text) {
    var t = (text || "").trim().replace(/\s+/g, " ");
    if (!t) return { ok: false, reason: "empty" };
    if (t.length > MAX_NOTE) return { ok: false, reason: "long" };
    for (var i = 0; i < BLOCK.length; i++) {
      if (BLOCK[i].test(t)) return { ok: false, reason: "blocked" };
    }
    return { ok: true, text: t };
  }

  function haversineMiles(a, b) {
    if (window.HearthGeo && HearthGeo.haversineMiles) return HearthGeo.haversineMiles(a, b);
    var R = 3958.7613;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** Snap query/geo → zip/city centroid, then random offset ≤ ~10 mi. Never exact home. */
  function coarseLocation(queryOrCoords, cb) {
    function fromCentroid(lat, lng, zip) {
      var ang = Math.random() * Math.PI * 2;
      var dist = Math.random() * MAX_OFFSET_DEG;
      cb(null, {
        lat: lat + Math.cos(ang) * dist,
        lng: lng + Math.sin(ang) * dist * Math.cos((lat * Math.PI) / 180),
        coarseZip: zip || ""
      });
    }

    function resolveZip(q) {
      var zip = null;
      if (window.HearthGeo && HearthGeo.lookupZip) zip = HearthGeo.lookupZip(q);
      if (zip && zip.lat != null) return fromCentroid(zip.lat, zip.lng, zip.zip);
      /* HEARTH_ZIP_COORDS fallback */
      var coords = window.HEARTH_ZIP_COORDS || {};
      var z = String(q || "").replace(/\D/g, "").slice(0, 5);
      if (/^\d{5}$/.test(z) && coords[z]) return fromCentroid(coords[z][0], coords[z][1], z);
      cb(new Error("Could not find that ZIP or city."));
    }

    if (queryOrCoords && typeof queryOrCoords === "object" && queryOrCoords.lat != null) {
      /* Reverse: find nearest zip centroid, then offset from THAT — never raw GPS */
      var best = null, bestD = Infinity;
      var zips = window.HEARTH_ZIPS || {};
      var keys = Object.keys(zips);
      if (!keys.length && window.HEARTH_ZIP_COORDS) {
        var c = window.HEARTH_ZIP_COORDS;
        keys = Object.keys(c);
        for (var i = 0; i < keys.length; i++) {
          var p = c[keys[i]];
          var d = haversineMiles(queryOrCoords, { lat: p[0], lng: p[1] });
          if (d < bestD) { bestD = d; best = { lat: p[0], lng: p[1], zip: keys[i] }; }
        }
      } else {
        for (var j = 0; j < keys.length; j++) {
          var z = zips[keys[j]];
          var dd = haversineMiles(queryOrCoords, z);
          if (dd < bestD) { bestD = dd; best = { lat: z.lat, lng: z.lng, zip: keys[j] }; }
        }
      }
      if (!best) return cb(new Error("No ZIP data loaded."));
      return fromCentroid(best.lat, best.lng, best.zip);
    }
    resolveZip(queryOrCoords);
  }

  function getDb() {
    if (!isFirebaseReady()) return null;
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.HEARTH_FIREBASE);
      return firebase.database();
    } catch (e) {
      console.warn("Firebase init", e);
      return null;
    }
  }

  function myMeta() {
    try { return JSON.parse(localStorage.getItem(LS_META) || "null"); } catch (e) { return null; }
  }
  function setMyMeta(m) {
    if (m) localStorage.setItem(LS_META, JSON.stringify(m));
    else localStorage.removeItem(LS_META);
  }
  function myId() { return localStorage.getItem(LS_ID) || ""; }
  function setMyId(id) {
    if (id) localStorage.setItem(LS_ID, id);
    else localStorage.removeItem(LS_ID);
  }

  function setStatus(msg, isError) {
    var el = $("beacon-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  function updateLightUI() {
    var meta = myMeta();
    var on = !!(meta && meta.expiresAt > Date.now());
    var btnOn = $("beacon-light-on");
    var btnOff = $("beacon-light-off");
    var dur = $("beacon-duration");
    if (btnOn) btnOn.hidden = on;
    if (btnOff) btnOff.hidden = !on;
    if (dur) dur.hidden = on;
    var notesWrap = $("beacon-my-notes");
    if (notesWrap) notesWrap.hidden = !on;
    if (on) loadMyNotes();
  }

  function initMap() {
    if (map || !window.L) return;
    var el = $("beacon-map");
    if (!el) return;
    map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([39.5, -98.35], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  function glowIcon(mine) {
    var cls = mine ? "beacon-glow mine" : "beacon-glow";
    return L.divIcon({
      className: "",
      html: '<div class="' + cls + '" aria-hidden="true"></div>',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  }

  function renderBeacons(data) {
    beaconsCache = data || {};
    if (!markersLayer) return;
    markersLayer.clearLayers();
    var now = Date.now();
    var origin = null;
    var meta = myMeta();
    if (meta && meta.lat != null) origin = { lat: meta.lat, lng: meta.lng };
    var mid = myId();
    var near = 0;
    var all = [];
    Object.keys(beaconsCache).forEach(function (id) {
      var b = beaconsCache[id];
      if (!b || b.lat == null || b.lng == null) return;
      if (b.expiresAt && b.expiresAt < now) return;
      all.push({ id: id, b: b });
      var mine = id === mid;
      var marker = L.marker([b.lat, b.lng], { icon: glowIcon(mine), keyboard: true, title: mine ? "Your light" : "A mom nearby" });
      marker.on("click", function () { openEncourage(id, mine); });
      markersLayer.addLayer(marker);
      if (origin && !mine) {
        var miles = haversineMiles(origin, b);
        if (miles <= NEAR_MILES) near++;
      } else if (!origin && !mine) {
        near++;
      }
    });

    var countEl = $("beacon-count");
    if (countEl) {
      if (!isBackendReady()) {
        countEl.textContent = "Live map needs a one-time Firebase connect.";
      } else if (near === 0 && all.length === 0) {
        countEl.textContent = "Be the first light in your area.";
      } else if (near === 0) {
        countEl.textContent = all.length === 1
          ? "1 light is on. Zoom out or light yours so others nearby can find you."
          : (all.length + " lights are on across the map.");
      } else if (near === 1) {
        countEl.textContent = "1 mom has a light on near you.";
      } else {
        countEl.textContent = near + " moms have a light on near you.";
      }
    }

    if (meta && meta.lat != null && map) {
      map.setView([meta.lat, meta.lng], 9);
    }
  }


  function listenBeaconsRest() {
    var base = restBase();
    if (!base) return;
    setStatus("Listening for lights…");
    function poll() {
      fetch(base + "/beacons").then(function (r) { return r.json(); }).then(function (val) {
        renderBeacons(val || {});
        setStatus("Live · lights update as moms opt in.");
        updateLightUI();
      }).catch(function () {
        setStatus("Could not reach live map server.", true);
      });
    }
    poll();
    if (window.__hearthBeaconPoll) clearInterval(window.__hearthBeaconPoll);
    window.__hearthBeaconPoll = setInterval(poll, 8000);
  }
  function listenBeacons() {
    var db = getDb();
    if (!db) {
      if (restBase()) return listenBeaconsRest();
      renderBeacons({});
      setStatus("Live map needs a one-time Firebase connect (see js/firebase-beacon-config.js).", true);
      return;
    }
    setStatus("Listening for lights…");
    var ref = db.ref("beacons");
    if (unsub) { try { ref.off("value", unsub); } catch (e) {} }
    unsub = function (snap) {
      var val = snap.val() || {};
      /* prune expired locally */
      var now = Date.now();
      Object.keys(val).forEach(function (id) {
        if (val[id] && val[id].expiresAt && val[id].expiresAt < now) {
          /* best-effort delete expired */
          try { db.ref("beacons/" + id).remove(); } catch (e) {}
          delete val[id];
        }
      });
      renderBeacons(val);
      setStatus("Live · lights update as moms opt in.");
      updateLightUI();
    };
    ref.on("value", unsub);
  }

  function lightBeacon(hours) {
    if (!isBackendReady()) {
      setStatus("Live map needs a one-time Firebase connect before lights can be shared.", true);
      return;
    }
    var zipInput = $("beacon-zip");
    var q = zipInput ? zipInput.value.trim() : "";

    function place(err, coarse) {
      if (err) { setStatus(err.message || String(err), true); return; }
      var now = Date.now();
      var expires = now + hours * 3600 * 1000;
      var payload = {
        lat: Math.round(coarse.lat * 10000) / 10000,
        lng: Math.round(coarse.lng * 10000) / 10000,
        createdAt: now,
        expiresAt: expires,
        coarseZip: coarse.coarseZip || ""
      };
      var existing = myId();
      var done = function (id) {
        setMyId(id);
        setMyMeta({ lat: payload.lat, lng: payload.lng, expiresAt: expires, hours: hours });
        updateLightUI();
        setStatus("Your light is on for about " + hours + " hours. Location is approximate — never your exact home.");
        if (window.HearthSounds) HearthSounds.play("chime");
      };
      var db = getDb();
      if (db) {
        var ref = existing ? db.ref("beacons/" + existing) : db.ref("beacons").push();
        if (existing) {
          ref.set(payload).then(function () { done(existing); }).catch(function (e) { setStatus("Could not update light. Try again.", true); console.warn(e); });
        } else {
          ref.set(payload).then(function () { done(ref.key); }).catch(function (e) { setStatus("Could not light beacon. Try again.", true); console.warn(e); });
        }
        return;
      }
      var base = restBase();
      if (!base) return;
      var url = existing ? base + "/beacons/" + existing : base + "/beacons";
      var method = existing ? "PUT" : "POST";
      fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (j) { done(existing || j.id); })
        .catch(function () { setStatus("Could not light beacon. Try again.", true); });
    }

    if (q) return coarseLocation(q, place);
    if (!navigator.geolocation) {
      setStatus("Enter a ZIP or city so we can place a soft glow nearby (never exact).", true);
      return;
    }
    setStatus("Finding a nearby area (not your exact pin)…");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        coarseLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, place);
      },
      function () {
        setStatus("Location unavailable. Enter a ZIP or city instead.", true);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  }

  function turnOff() {
    var id = myId();
    var db = getDb();
    function clearLocal() {
      setMyId("");
      setMyMeta(null);
      updateLightUI();
      setStatus("Your light is off. You can light it again anytime.");
    }
    if (id && db) {
      db.ref("beacons/" + id).remove().then(clearLocal).catch(clearLocal);
    } else if (id && restBase()) {
      fetch(restBase() + "/beacons/" + id, { method: "DELETE" }).then(clearLocal).catch(clearLocal);
    } else clearLocal();
  }

  function openEncourage(beaconId, mine) {
    var panel = $("beacon-encourage-panel");
    if (!panel) return;
    if (mine) {
      panel.hidden = true;
      loadMyNotes();
      return;
    }
    panel.hidden = false;
    panel.dataset.beaconId = beaconId;
    var chips = $("beacon-note-chips");
    if (chips) {
      chips.innerHTML = SUGGESTED.map(function (s) {
        return '<button type="button" class="chip beacon-chip" data-note="' + s.replace(/"/g, "&quot;") + '">' + s + "</button>";
      }).join("");
    }
    var ta = $("beacon-note-text");
    if (ta) ta.value = "";
    $("beacon-note-feedback").textContent = "";
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function sendNote() {
    var panel = $("beacon-encourage-panel");
    var beaconId = panel && panel.dataset.beaconId;
    var ta = $("beacon-note-text");
    var fb = $("beacon-note-feedback");
    if (!beaconId) return;
    var checked = filterNote(ta ? ta.value : "");
    if (!checked.ok) {
      if (fb) fb.textContent = "That note couldn’t be sent. Try a kind word instead.";
      return;
    }
    if (!isBackendReady()) {
      if (fb) fb.textContent = "Live notes need Firebase connect.";
      return;
    }
    var note = {
      text: checked.text,
      createdAt: Date.now(),
      fromLabel: "A mom nearby"
    };
    function ok() {
      if (fb) fb.textContent = "Sent — thank you for the kindness.";
      if (ta) ta.value = "";
      if (window.HearthSounds) HearthSounds.play("ping");
      panel.hidden = true;
    }
    function fail() {
      if (fb) fb.textContent = "That note couldn’t be sent. Try a kind word instead.";
    }
    var db = getDb();
    if (db) {
      db.ref("beacons/" + beaconId + "/notes").push(note).then(ok).catch(fail);
      return;
    }
    fetch(restBase() + "/beacons/" + beaconId + "/notes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(note)
    }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(ok).catch(fail);
  }

  function loadMyNotes() {
    var list = $("beacon-notes-list");
    if (!list) return;
    var id = myId();
    if (!id || !isBackendReady()) {
      list.innerHTML = "<p class=\"hint\">Notes from other moms will show here while your light is on.</p>";
      return;
    }
    function showNotes(val) {
      val = val || {};
      var items = Object.keys(val).map(function (k) { return val[k]; });
      items.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      if (!items.length) {
        list.innerHTML = "<p class=\"hint\">No notes yet — when another mom sends encouragement, it will appear here.</p>";
        return;
      }
      list.innerHTML = items.slice(0, 40).map(function (n) {
        var when = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
        return '<article class="beacon-note-card"><p>' + escapeHtml(n.text) + '</p><p class="meta">' +
          escapeHtml(n.fromLabel || "A mom nearby") + (when ? " · " + when : "") + "</p></article>";
      }).join("");
    }
    var db = getDb();
    if (db) {
      db.ref("beacons/" + id + "/notes").once("value").then(function (snap) { showNotes(snap.val()); });
      return;
    }
    fetch(restBase() + "/beacons/" + id + "/notes")
      .then(function (r) { return r.json(); })
      .then(showNotes)
      .catch(function () {
        list.innerHTML = "<p class=\"hint\">Could not load notes right now.</p>";
      });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function onView() {
    if (!viewReady) {
      viewReady = true;
      initMap();
      listenBeacons();
      updateLightUI();
    } else if (map) {
      setTimeout(function () { map.invalidateSize(); }, 100);
      updateLightUI();
    }
  }

  function bind() {
    var on24 = $("beacon-light-24");
    var on8 = $("beacon-light-8");
    var off = $("beacon-light-off");
    if (on24) on24.addEventListener("click", function () { lightBeacon(24); });
    if (on8) on8.addEventListener("click", function () { lightBeacon(8); });
    /* primary big button defaults to 24h */
    var primary = $("beacon-light-on");
    if (primary) primary.addEventListener("click", function () { lightBeacon(24); });
    if (off) off.addEventListener("click", turnOff);

    var send = $("beacon-note-send");
    if (send) send.addEventListener("click", sendNote);
    var chips = $("beacon-note-chips");
    if (chips) chips.addEventListener("click", function (e) {
      var t = e.target.closest("[data-note]");
      if (!t) return;
      var ta = $("beacon-note-text");
      if (ta) ta.value = t.getAttribute("data-note");
    });
    var cancel = $("beacon-note-cancel");
    if (cancel) cancel.addEventListener("click", function () {
      var p = $("beacon-encourage-panel");
      if (p) p.hidden = true;
    });

    window.addEventListener("hashchange", function () {
      if ((location.hash || "") === "#postpartum") onView();
    });
    if ((location.hash || "") === "#postpartum") onView();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.HearthBeacon = { filterNote: filterNote, onView: onView };
})();
