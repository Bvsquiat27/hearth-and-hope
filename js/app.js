(function () {
  "use strict";

  const RESOURCES = [
    {
      id: "pregnancy-health",
      cat: "Pregnancy & health",
      icon: "🌿",
      iconClass: "green",
      title: "Pregnancy & health basics",
      summary: "What to expect week by week, prenatal visits, and when to call your doctor.",
      body: [
        "Early pregnancy can bring excitement and a lot of questions. A trusted clinician can confirm pregnancy, discuss prenatal vitamins, and help you plan your first visit.",
        "Watch for warning signs your doctor has named for you — severe pain, heavy bleeding, fainting, or sudden swelling. When in doubt, call your care team or go to urgent care / ER.",
        "Practical next step: schedule (or confirm) a prenatal appointment and write down your questions beforehand."
      ],
      medical: true,
      faith: "“For you created my inmost being; you knit me together in my mother’s womb.” — Psalm 139:13 (optional reflection)"
    },
    {
      id: "parenting-basics",
      cat: "Parenting basics",
      icon: "🤍",
      iconClass: "cream",
      title: "Newborn & early parenting",
      summary: "Feeding, sleep, soothing, and finding your rhythm without perfectionism.",
      body: [
        "There is no single “right” way to be a mom. Safe sleep, feeding (breast, bottle, or both), and asking for help are the foundations.",
        "If possible, line up one trusted person who can bring a meal or watch the baby so you can rest.",
        "Practical next step: pick one local class or mentor (see Directory) and one supply need to check off this week."
      ],
      medical: true,
      faith: null
    },
    {
      id: "adoption",
      cat: "Adoption options",
      icon: "🤝",
      iconClass: "",
      title: "Learning about adoption",
      summary: "Clear, non-pressure information if you want to explore adoption as a loving path.",
      body: [
        "Adoption can be an act of love — for your child and for you. You deserve unhurried, honest information without coercion.",
        "Ask about open vs. closed options, counseling for birth parents, and timelines. Reputable agencies put your dignity first.",
        "Practical next step: talk with a counselor or center that offers adoption education (see Directory) and bring a support person if you want."
      ],
      medical: false,
      faith: "You are not alone in discerning this path. Wisdom and peace are gifts you can ask for — at your own pace."
    },
    {
      id: "financial-housing",
      cat: "Financial & housing aid",
      icon: "🏠",
      iconClass: "green",
      title: "Money, housing & supplies",
      summary: "Rent help, food, diapers, and places that quietly fill the gaps.",
      body: [
        "Many communities have pregnancy centers, churches, diaper banks, and benevolence funds ready to help — often without long waitlists.",
        "Bring ID if you have it, but ask what they need; some places meet you with fewer barriers.",
        "Practical next step: use Find help nearby, filter by your ZIP, and call two places this week."
      ],
      medical: false,
      faith: null
    },
    {
      id: "emotional-faith",
      cat: "Emotional support & faith",
      icon: "💛",
      iconClass: "cream",
      title: "Someone to talk to",
      summary: "Peer support, mentoring, and optional prayer — without pressure or shame.",
      body: [
        "Feeling overwhelmed, lonely, or unsure does not make you weak. It makes you human — and help is wise.",
        "You can ask for a mentor who shares your faith, or simply a kind listener. Skip any spiritual content that doesn’t feel right today.",
        "Practical next step: use Get Help and select “need someone to talk to,” or call a center’s peer line."
      ],
      medical: false,
      faith: "Optional prayer: “Lord, give me courage for today and people who will walk with me. Amen.”"
    },
    {
      id: "crisis",
      cat: "Crisis help",
      icon: "🆘",
      iconClass: "",
      title: "If you are in crisis",
      summary: "Safety first. Emergency services, hotlines, and immediate local options.",
      body: [
        "If you or your child are in immediate danger, call 911 (or your local emergency number) now.",
        "For emotional crisis support in the U.S., you can dial or text 988 (Suicide & Crisis Lifeline).",
        "Local pregnancy centers and churches in our Directory often offer same-week listening and practical aid — they are not a substitute for emergency services."
      ],
      medical: true,
      faith: null
    }
  ];

  const NEED_LABELS = {
    expecting: "I’m expecting",
    "new-mom": "I’m a new mom",
    housing: "I need housing",
    supplies: "I need supplies",
    talk: "I need someone to talk to"
  };

  /* ---------- Navigation ---------- */
  const views = document.querySelectorAll(".view");
  const navLinks = document.querySelectorAll("[data-nav]");
  const navToggle = document.getElementById("nav-toggle");
  const siteNav = document.getElementById("site-nav");

  function showView(hash) {
    const id = (hash || "#home").replace(/^#/, "") || "home";
    views.forEach((v) => {
      const active = v.id === "view-" + id;
      v.classList.toggle("active", active);
      v.hidden = !active;
    });
    navLinks.forEach((a) => {
      const target = (a.getAttribute("href") || "").replace(/^#/, "");
      a.classList.toggle("active", target === id);
    });
    if (siteNav) siteNav.classList.remove("open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.HearthVoice) {
      window.HearthVoice.stop();
      if (window.HearthVoice.getPref()) {
        setTimeout(function () {
          if (window.HearthVoice.getPref()) window.HearthVoice.speakSection(id);
        }, 350);
      }
    }
  }

  function route() {
    showView(location.hash || "#home");
  }

  window.addEventListener("hashchange", route);
  navLinks.forEach((a) => {
    a.addEventListener("click", () => {
      /* hashchange handles show */
    });
  });

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const open = siteNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Resources ---------- */
  const resourceGrid = document.getElementById("resource-grid");
  const resourceSearch = document.getElementById("resource-search");
  const resourceChips = document.getElementById("resource-chips");
  const resourceDetail = document.getElementById("resource-detail");
  let activeCat = "all";

  function renderResources() {
    if (!resourceGrid) return;
    const q = (resourceSearch && resourceSearch.value || "").trim().toLowerCase();
    const list = RESOURCES.filter((r) => {
      const catOk = activeCat === "all" || r.cat === activeCat;
      const text = (r.title + " " + r.summary + " " + r.cat).toLowerCase();
      const qOk = !q || text.includes(q);
      return catOk && qOk;
    });

    resourceGrid.innerHTML = list.map((r) => `
      <article class="card" data-resource-id="${r.id}">
        <div class="card-icon ${r.iconClass || ""}" aria-hidden="true">${r.icon}</div>
        <span class="tag">${escapeHtml(r.cat)}</span>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.summary)}</p>
        <button type="button" class="btn btn-secondary" data-open-resource="${r.id}">Read more</button>
      </article>
    `).join("") || `<div class="empty-state">No resources match that search. Try another word.</div>`;
  }

  function openResource(id) {
    const r = RESOURCES.find((x) => x.id === id);
    if (!r || !resourceDetail) return;
    resourceDetail.hidden = false;
    resourceDetail.innerHTML = `
      <h3>${escapeHtml(r.title)}</h3>
      <p class="meta"><span class="tag">${escapeHtml(r.cat)}</span></p>
      ${r.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      ${r.medical ? `<div class="disclaimer"><strong>Not medical advice.</strong> Talk with your doctor or midwife about your situation. If you are in danger, call 911.</div>` : ""}
      ${r.faith ? `<details class="optional-faith"><summary>Optional encouragement (skip anytime)</summary><p>${escapeHtml(r.faith)}</p></details>` : ""}
      <p style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.5rem">
        <button type="button" class="btn btn-secondary" id="read-resource" aria-label="Read this guide aloud">Read aloud</button>
        <button type="button" class="btn btn-ghost" id="close-resource">Close</button>
      <a class="btn btn-primary" href="#help">Ask centers for help</a></p>
    `;
    resourceDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const closeBtn = document.getElementById("close-resource");
    if (closeBtn) closeBtn.addEventListener("click", () => {
      resourceDetail.hidden = true;
      if (window.HearthVoice) window.HearthVoice.stop();
    });
    const readBtn = document.getElementById("read-resource");
    if (readBtn) readBtn.addEventListener("click", () => {
      if (window.HearthVoice) window.HearthVoice.speakResource(r);
    });
    if (window.HearthVoice && window.HearthVoice.getPref()) {
      window.HearthVoice.speakResource(r);
    }
  }

  if (resourceChips) {
    const cats = ["all", ...new Set(RESOURCES.map((r) => r.cat))];
    resourceChips.innerHTML = cats.map((c) => `
      <button type="button" class="chip ${c === "all" ? "active" : ""}" data-cat="${escapeHtml(c)}">${c === "all" ? "All" : escapeHtml(c)}</button>
    `).join("");
    resourceChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeCat = btn.getAttribute("data-cat");
      resourceChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
      renderResources();
    });
  }

  if (resourceSearch) resourceSearch.addEventListener("input", renderResources);
  if (resourceGrid) {
    resourceGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-resource]");
      if (btn) openResource(btn.getAttribute("data-open-resource"));
    });
  }

  /* ---------- Directory / proximity matching ---------- */
  const centerList = document.getElementById("center-list");
  const locFilter = document.getElementById("loc-filter");
  const typeFilter = document.getElementById("type-filter");
  const dirMatchNote = document.getElementById("dir-match-note");
  const LOCAL_MILES = 100;
  let geoOverride = null; // { lat, lng, label } from "Use my location"

  function getCenters() {
    return window.HEARTH_CENTERS || [];
  }

  function toRad(d) { return (d * Math.PI) / 180; }

  function haversineMiles(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return Infinity;
    const R = 3958.8;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function normalizeQuery(raw) {
    let s = String(raw || "").trim().toLowerCase();
    s = s.replace(/[,\s]+/g, " ").trim();
    s = s.replace(/\bnew york city\b/g, "new york");
    s = s.replace(/\bn\.?y\.?c\.?\b/g, "nyc");
    return s;
  }

  function extractZip(q) {
    const m = String(q).match(/\b(\d{5})(?:-\d{4})?\b/);
    return m ? m[1] : null;
  }

  function aliasCity(token) {
    const aliases = window.HEARTH_CITY_ALIASES || {};
    return aliases[token] || token;
  }

  function resolveLocation(raw, geo) {
    if (geo && geo.lat != null && geo.lng != null) {
      return { lat: geo.lat, lng: geo.lng, zip: geo.zip || null, state: geo.state || null, city: geo.city || null, source: "geo", label: geo.label || "Your location" };
    }
    const q = normalizeQuery(raw);
    if (!q) return null;

    const zipObj = window.HEARTH_ZIPS || null;
    const zipCoords = window.HEARTH_ZIP_COORDS || {};
    const cityIndex = window.HEARTH_CITY_INDEX || {};
    const cityMap = window.HEARTH_CITIES || {};
    const aliases = {
      "nyc": "new york", "new york city": "new york", "n.y.c.": "new york",
      "manhattan": "new york", "la": "los angeles", "l.a.": "los angeles",
      "philly": "philadelphia", "dc": "washington", "washington dc": "washington",
      "washington d.c.": "washington", "st louis": "saint louis", "st. louis": "saint louis"
    };

    const zip = extractZip(q);

    function fromZip(z) {
      // Prefer a listed center at this ZIP (more accurate than some large ZCTA centroids)
      const hit = getCenters().find((c) => c.zip === z && c.lat != null);
      if (zipObj && zipObj[z]) {
        const o = zipObj[z];
        if (hit) return { lat: hit.lat, lng: hit.lng, zip: z, state: hit.state || o.state, city: hit.city || o.city, source: "zip-center", label: `${hit.city}, ${hit.state} ${z}` };
        return { lat: o.lat, lng: o.lng, zip: z, state: o.state, city: o.city, source: "zip", label: `${o.city || "ZIP"}, ${o.state || ""} ${z}`.trim() };
      }
      if (hit) return { lat: hit.lat, lng: hit.lng, zip: z, state: hit.state, city: hit.city, source: "zip-center", label: `${hit.city}, ${hit.state} ${z}` };
      if (zipCoords[z]) {
        const [lat, lng] = zipCoords[z];
        return { lat, lng, zip: z, state: null, city: null, source: "zip", label: `ZIP ${z}` };
      }
      return null;
    }

    if (zip) {
      const exact = fromZip(zip);
      if (exact) return exact;
      const z3 = zip.slice(0, 3);
      const z3Centers = getCenters().filter((c) => String(c.zip).startsWith(z3));
      if (z3Centers.length) {
        const lat = z3Centers.reduce((s, c) => s + c.lat, 0) / z3Centers.length;
        const lng = z3Centers.reduce((s, c) => s + c.lng, 0) / z3Centers.length;
        return { lat, lng, zip, state: z3Centers[0].state, city: null, source: "zip3", label: `Near ZIP ${zip}` };
      }
      const pool = zipObj || zipCoords;
      for (const z of Object.keys(pool)) {
        if (z.startsWith(z3)) {
          const got = fromZip(z);
          if (got) return { ...got, zip, source: "zip3-db", label: `Near ZIP ${zip}` };
        }
      }
    }

    let cityPart = q.replace(/\b\d{5}(?:-\d{4})?\b/g, "").trim();
    const knownStates = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
    let stateHint = null;
    const stateMatch = cityPart.match(/\b([a-z]{2})$/i);
    if (stateMatch) {
      const maybe = stateMatch[1].toUpperCase();
      if (knownStates.includes(maybe)) {
        stateHint = maybe;
        cityPart = cityPart.slice(0, -2).trim();
      }
    }
    cityPart = aliases[cityPart] || cityPart;

    // HEARTH_CITIES: "city|ST" -> zip
    if (cityPart) {
      const preferState = { "new york": "NY", "los angeles": "CA", "chicago": "IL", "houston": "TX", "phoenix": "AZ", "philadelphia": "PA", "san antonio": "TX", "san diego": "CA", "dallas": "TX", "san jose": "CA", "austin": "TX", "jacksonville": "FL", "miami": "FL", "seattle": "WA", "denver": "CO", "boston": "MA", "nashville": "TN", "detroit": "MI", "portland": "OR", "las vegas": "NV", "memphis": "TN", "louisville": "KY", "baltimore": "MD", "milwaukee": "WI", "albuquerque": "NM", "tucson": "AZ", "atlanta": "GA", "minneapolis": "MN", "omaha": "NE", "raleigh": "NC", "oakland": "CA", "tampa": "FL", "tulsa": "OK", "cleveland": "OH", "wichita": "KS", "arlington": "VA", "new orleans": "LA", "bakersfield": "CA", "honolulu": "HI", "anaheim": "CA", "santa ana": "CA", "riverside": "CA", "corpus christi": "TX", "lexington": "KY", "henderson": "NV", "stockton": "CA", "saint paul": "MN", "saint louis": "MO", "cincinnati": "OH", "pittsburgh": "PA", "greensboro": "NC", "lincoln": "NE", "orlando": "FL", "durham": "NC", "boise": "ID", "spokane": "WA", "birmingham": "AL", "des moines": "IA", "tacoma": "WA", "buffalo": "NY", "reno": "NV", "richmond": "VA", "baton rouge": "LA", "salt lake city": "UT", "little rock": "AR", "cheyenne": "WY", "fairbanks": "AK", "anchorage": "AK", "billings": "MT", "casper": "WY", "charleston": "SC", "springfield": "IL", "columbus": "OH", "washington": "DC", "newark": "NJ", "jersey city": "NJ", "hoboken": "NJ" };
      const matches = Object.keys(cityMap).filter((k) => k === cityPart + "|" + (k.split("|")[1] || "") && k.startsWith(cityPart + "|"));
      // exact city|ST keys only
      const exactMatches = Object.keys(cityMap).filter((k) => {
        const [c] = k.split("|");
        return c === cityPart;
      });
      const centerStates = new Set(getCenters().filter((c) => c.city.toLowerCase() === cityPart).map((c) => c.state));
      const ranked = exactMatches.slice().sort((a, b) => {
        const sa = a.split("|")[1], sb = b.split("|")[1];
        const score = (st) => {
          if (stateHint && st === stateHint) return 0;
          if (preferState[cityPart] && st === preferState[cityPart]) return 1;
          if (centerStates.has(st)) return 2;
          return 3;
        };
        return score(sa) - score(sb) || a.localeCompare(b);
      });
      for (const key of ranked) {
        const z = cityMap[key];
        if (z) {
          const got = fromZip(z);
          if (got) return { ...got, city: cityPart, source: "city-zip", label: got.city ? `${got.city}, ${got.state}` : cityPart };
        }
      }
    }

    if (cityIndex[cityPart]) {
      const [lat, lng, st, z] = cityIndex[cityPart];
      return { lat, lng, zip: z, state: stateHint || st, city: cityPart, source: "city-index", label: cityPart };
    }

    const centers = getCenters();
    const cityHits = centers.filter((c) => c.city.toLowerCase() === cityPart);
    if (cityHits.length) {
      const pool = stateHint ? cityHits.filter((c) => c.state === stateHint) : cityHits;
      const use = pool.length ? pool : cityHits;
      const lat = use.reduce((s, c) => s + c.lat, 0) / use.length;
      const lng = use.reduce((s, c) => s + c.lng, 0) / use.length;
      return { lat, lng, zip: use[0].zip, state: use[0].state, city: use[0].city, source: "center-city", label: `${use[0].city}, ${use[0].state}` };
    }

    if (cityPart.length >= 3) {
      const partial = centers.filter((c) =>
        c.city.toLowerCase().includes(cityPart) || cityPart.includes(c.city.toLowerCase())
      );
      if (partial.length) {
        const lat = partial.reduce((s, c) => s + c.lat, 0) / partial.length;
        const lng = partial.reduce((s, c) => s + c.lng, 0) / partial.length;
        return { lat, lng, zip: partial[0].zip, state: partial[0].state, city: partial[0].city, source: "partial-city", label: `${partial[0].city}, ${partial[0].state}` };
      }
    }

    if (zip) return { lat: null, lng: null, zip, state: stateHint, city: cityPart || null, source: "unresolved", label: raw };
    return { lat: null, lng: null, zip: null, state: stateHint, city: cityPart || null, source: "unresolved", label: raw };
  }


  function rankCenters(locRaw, needs, opts) {
    opts = opts || {};
    const limit = opts.limit || 50;
    const geo = opts.geo || geoOverride;
    const resolved = resolveLocation(locRaw, geo);
    const type = opts.type || "";
    let pool = getCenters().filter((c) => !type || c.type === type);

    const scored = pool.map((c) => {
      let tier = 50;
      let dist = Infinity;
      if (resolved && resolved.lat != null && c.lat != null) {
        dist = haversineMiles(resolved, c);
      }
      if (resolved && resolved.zip && c.zip === resolved.zip) tier = 0;
      else if (resolved && resolved.zip && c.zip.slice(0, 3) === resolved.zip.slice(0, 3)) tier = 1;
      else if (resolved && resolved.city && c.city.toLowerCase() === String(resolved.city).toLowerCase()) tier = 2;
      else if (resolved && resolved.state && c.state === resolved.state && dist <= LOCAL_MILES) tier = 3;
      else if (dist <= LOCAL_MILES) tier = 4;
      else if (resolved && resolved.state && c.state === resolved.state) tier = 5;
      else tier = 6;

      // Text boost when unresolved coords but query tokens match
      const q = normalizeQuery(locRaw);
      if (q && (resolved == null || resolved.lat == null)) {
        const hay = `${c.city} ${c.state} ${c.zip} ${c.name}`.toLowerCase();
        if (resolved && resolved.zip && c.zip === resolved.zip) tier = 0;
        else if (q && hay.includes(q)) tier = Math.min(tier, 2);
      }

      const overlap = (needs || []).length
        ? (needs || []).filter((n) => (c.needs || []).includes(n)).length
        : 0;
      return { c, tier, dist, overlap };
    });

    scored.sort((a, b) =>
      a.tier - b.tier ||
      a.dist - b.dist ||
      b.overlap - a.overlap ||
      a.c.name.localeCompare(b.c.name)
    );

    const local = scored.filter((s) => s.dist <= LOCAL_MILES || s.tier <= 4);
    let mode = "all";
    let list;
    if (!locRaw && !geo) {
      list = scored;
      mode = "browse";
    } else if (local.length) {
      list = local;
      mode = local.some((s) => s.tier <= 2) ? "exact" : "local";
    } else {
      const inState = scored.filter((s) => resolved && resolved.state && s.c.state === resolved.state);
      if (inState.length) {
        list = inState;
        mode = "in-state";
      } else {
        list = scored;
        mode = "national";
      }
    }

    return {
      resolved,
      mode,
      items: list.slice(0, limit).map((s) => ({ ...s.c, _dist: s.dist, _tier: s.tier }))
    };
  }

  function formatDist(miles) {
    if (miles == null || !isFinite(miles)) return "";
    if (miles < 10) return ` · ${miles.toFixed(1)} mi`;
    return ` · ${Math.round(miles)} mi`;
  }

  function populateTypeFilter() {
    if (!typeFilter) return;
    const types = [...new Set(getCenters().map((c) => c.type))].sort();
    typeFilter.innerHTML = `<option value="">All types</option>` +
      types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  }

  function renderCenters() {
    if (!centerList) return;
    const q = (locFilter && locFilter.value || "").trim();
    const type = (typeFilter && typeFilter.value) || "";
    const qNorm = q.trim().toLowerCase();
    const useGeo = geoOverride && (!q || qNorm === "near me");
    const result = rankCenters(qNorm === "near me" ? "" : q, [], { type, limit: 40, geo: useGeo ? geoOverride : null });
    const list = result.items;

    if (dirMatchNote) {
      if (!q && !geoOverride) {
        dirMatchNote.hidden = true;
        dirMatchNote.textContent = "";
      } else if (result.mode === "exact" || result.mode === "local") {
        dirMatchNote.hidden = false;
        dirMatchNote.textContent = `Showing nearest centers${result.resolved && result.resolved.label ? " near " + result.resolved.label : ""}.`;
      } else if (result.mode === "in-state") {
        dirMatchNote.hidden = false;
        dirMatchNote.textContent = "No centers within ~100 miles — nearest in-state options:";
      } else if (result.mode === "national") {
        dirMatchNote.hidden = false;
        dirMatchNote.textContent = "No exact local match — nearest options nationwide:";
      } else {
        dirMatchNote.hidden = true;
      }
    }

    if (!list.length) {
      centerList.innerHTML = `<div class="empty-state">No centers matched. Try another city or ZIP, or clear the search to browse.</div>`;
      return;
    }

    centerList.innerHTML = list.map((c) => {
      const actions = [];
      if (c.phone) actions.push(`<a class="btn-call" href="tel:${escapeAttr(c.phone)}" aria-label="Call ${escapeAttr(c.name)}">Call ${escapeHtml(c.phone)}</a>`);
      if (c.website) actions.push(`<a href="${escapeAttr(c.website)}" target="_blank" rel="noopener noreferrer">Website</a>`);
      if (c.email) actions.push(`<a href="mailto:${escapeAttr(c.email)}">Email</a>`);
      actions.push(`<a href="#help" data-pref-zip="${escapeAttr(c.zip)}">Ask via app</a>`);
      return `
      <article class="center-card">
        <header>
          <h3>${escapeHtml(c.name)}</h3>
          <span class="tag green">${escapeHtml(c.type)}</span>
        </header>
        <p class="loc">${escapeHtml(c.city)}, ${escapeHtml(c.state)} ${escapeHtml(c.zip)}${formatDist(c._dist)}</p>
        <p class="blurb">${escapeHtml(c.blurb || "")}</p>
        <div class="services">${(c.services || []).slice(0, 6).map((s) => `<span class="service-pill">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="center-actions">${actions.join("")}</div>
      </article>`;
    }).join("");
  }

  function speakDirectoryResults() {
    if (!window.HearthVoice) return;
    const cards = document.querySelectorAll("#center-list .center-card");
    if (!cards.length) {
      window.HearthVoice.speak("No centers matched. Try another city or ZIP.");
      return;
    }
    const note = document.getElementById("dir-match-note");
    const parts = [];
    if (note && !note.hidden && note.textContent) parts.push(note.textContent);
    parts.push("Here are the first " + Math.min(5, cards.length) + " centers.");
    cards.forEach((card, i) => {
      if (i >= 5) return;
      const name = card.querySelector("h3");
      const loc = card.querySelector(".loc");
      const phone = card.querySelector("a[href^='tel:']");
      parts.push(
        (name ? name.textContent : "") + ". " +
        (loc ? loc.textContent : "") + ". " +
        (phone ? "Phone " + phone.textContent.replace(/^Call\s+/i, "") : "")
      );
    });
    window.HearthVoice.speak(parts.join(". "));
  }

  function useBrowserLocation(target) {
    const helpNote = document.getElementById("help-geo-note");
    const setNote = (el, msg, ok) => {
      if (!el) return;
      el.hidden = false;
      el.textContent = msg;
      el.style.color = ok ? "" : "#8a4b2e";
    };
    if (!navigator.geolocation) {
      setNote(target === "help" ? helpNote : dirMatchNote, "Location is not supported in this browser.", false);
      return;
    }
    setNote(target === "help" ? helpNote : dirMatchNote, "Getting your location…", true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoOverride = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your location"
        };
        // Reverse-approximate: nearest ZIP from loaded zip coords is expensive; leave label as-is
        if (target === "dir" || target === "both") {
          if (locFilter && !locFilter.value) locFilter.value = "Near me";
          renderCenters();
          if (window.HearthVoice && window.HearthVoice.getPref()) {
            setTimeout(speakDirectoryResults, 200);
          }
        }
        if (target === "help" || target === "both") {
          const loc = document.getElementById("location");
          if (loc) loc.value = loc.value && loc.value !== "Near me" ? loc.value : "Near me";
          setNote(helpNote, "Using your current location for matching.", true);
          updatePreview();
        }
        if (target === "dir") setNote(dirMatchNote, "Using your current location — showing nearest centers.", true);
      },
      () => {
        setNote(target === "help" ? helpNote : dirMatchNote, "Location denied or unavailable. You can still type a city or ZIP.", false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  if (locFilter) {
    locFilter.addEventListener("input", () => {
      if (locFilter.value.trim() && locFilter.value.trim().toLowerCase() !== "near me") {
        // keep geo as soft boost only when explicitly Near me
        if (geoOverride && locFilter.value.trim().toLowerCase() !== "near me") {
          /* typed query wins over stale geo for resolveLocation when raw is set — pass geo only for Near me */
        }
      }
      renderCenters();
    });
  }
  if (typeFilter) typeFilter.addEventListener("change", renderCenters);

  const btnDirGeo = document.getElementById("use-my-location-dir");
  const btnHelpGeo = document.getElementById("use-my-location-help");
  if (btnDirGeo) btnDirGeo.addEventListener("click", () => useBrowserLocation("dir"));
  if (btnHelpGeo) btnHelpGeo.addEventListener("click", () => useBrowserLocation("help"));

  /* ---------- Get Help form ---------- */
  const helpForm = document.getElementById("help-form");
  const previewEl = document.getElementById("message-preview");
  const matchEl = document.getElementById("match-preview");
  const formError = document.getElementById("form-error");
  const formSuccess = document.getElementById("form-success");
  const copyMsgBtn = document.getElementById("copy-message");

  function selectedNeeds() {
    if (!helpForm) return [];
    return [...helpForm.querySelectorAll('input[name="needs"]:checked')].map((i) => i.value);
  }

  function matchCenters(loc, needs) {
    const q = (loc || "").trim();
    const geo = (q.toLowerCase() === "near me") ? geoOverride : (q ? null : geoOverride);
    const result = rankCenters(q, needs || [], { limit: 12, geo });
    let pool = result.items;

    if ((needs || []).length) {
      const scored = pool.map((c) => {
        const overlap = needs.filter((n) => (c.needs || []).includes(n)).length;
        return { c, overlap, dist: c._dist };
      });
      scored.sort((a, b) => b.overlap - a.overlap || a.dist - b.dist || a.c.name.localeCompare(b.c.name));
      const withOverlap = scored.filter((s) => s.overlap > 0).map((s) => s.c);
      pool = withOverlap.length ? withOverlap : scored.map((s) => s.c);
    }

    const top = pool.slice(0, 3);
    top._matchMode = result.mode;
    top._resolved = result.resolved;
    return top;
  }

  function buildMessage(data, centers) {
    const needText = data.needs.map((n) => NEED_LABELS[n] || n).join("; ") || "General support";
    const centerNames = centers.map((c) => c.name).join(", ");
    const church = data.church ? `\nChurch preference: ${data.church}` : "";
    const contactParts = [];
    if (data.email) contactParts.push(`Email: ${data.email}`);
    if (data.phone) contactParts.push(`Phone: ${data.phone}`);
    const contact = contactParts.join(" · ") || "(she will follow up)";

    const subject = `Support request from ${data.firstName} via Hearth & Hope`;
    const body =
`Hello,

My name is ${data.firstName}. I’m reaching out through Hearth & Hope, an app that helps mothers connect with local support. I gave permission for this message to be sent on my behalf.

Location: ${data.location}
Situation: ${needText}${church}
Preferred contact: ${contact}

Message:
${data.message || "(No additional note — please reach out with available help.)"}

Thank you for the work you do. Please contact me at your earliest convenience.

— ${data.firstName}
(Draft prepared with Hearth & Hope; centers: ${centerNames})`;

    const sms =
`Hi, I'm ${data.firstName}. Hearth & Hope connected me. Near ${data.location}. Needs: ${needText}. ${data.phone ? "Call/text " + data.phone + "." : ""} ${data.email ? "Email " + data.email + "." : ""} ${data.message || ""}`.replace(/\s+/g, " ").trim();

    return { subject, body, sms };
  }

  function readForm() {
    const fd = new FormData(helpForm);
    return {
      firstName: (fd.get("firstName") || "").toString().trim(),
      email: (fd.get("email") || "").toString().trim(),
      phone: (fd.get("phone") || "").toString().trim(),
      location: (fd.get("location") || "").toString().trim(),
      church: (fd.get("church") || "").toString().trim(),
      message: (fd.get("message") || "").toString().trim(),
      consent: helpForm.querySelector("#consent") && helpForm.querySelector("#consent").checked,
      needs: selectedNeeds()
    };
  }

  function updatePreview() {
    if (!helpForm || !previewEl || !matchEl) return;
    const data = readForm();
    const centers = matchCenters(data.location, data.needs);
    const msg = buildMessage(
      data.firstName ? data : { ...data, firstName: "Friend" },
      centers.length ? centers : [{ name: "(centers will appear when you enter a city/ZIP)" }]
    );

    const mode = centers._matchMode;
    let heading = "Suggested centers (up to 3):";
    if (mode === "in-state") heading = "No centers within ~100 miles — nearest in-state options:";
    else if (mode === "national") heading = "No exact local match — nearest options:";
    else if (mode === "local" || mode === "exact") heading = "Nearest centers for your location:";
    matchEl.innerHTML = centers.length
      ? `<p><strong>${heading}</strong></p><ul class="match-list">${
          centers.map((c) => {
            const d = (c._dist != null && isFinite(c._dist)) ? ` · ${c._dist < 10 ? c._dist.toFixed(1) : Math.round(c._dist)} mi` : "";
            return `<li><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.city)}, ${escapeHtml(c.state)} ${escapeHtml(c.zip)}${d} · ${escapeHtml(c.type)}</li>`;
          }).join("")
        }</ul>`
      : `<p class="hint">Enter a city or ZIP to see matching centers.</p>`;

    previewEl.textContent =
`Subject: ${msg.subject}

${msg.body}

——— SMS version ———
${msg.sms}`;

    helpForm._lastPreview = { data, centers, msg };
  }

  if (helpForm) {
    helpForm.addEventListener("input", updatePreview);
    helpForm.addEventListener("change", updatePreview);

    helpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (formError) formError.hidden = true;
      if (formSuccess) formSuccess.hidden = true;

      const data = readForm();
      const errors = [];
      if (!data.firstName) errors.push("Please enter your first name.");
      if (!data.location) errors.push("Please enter a city or ZIP.");
      if (!data.email && !data.phone) errors.push("Please share an email and/or phone so centers can reach you.");
      if (!data.needs.length) errors.push("Select at least one situation that fits.");
      if (!data.consent) errors.push("Please check the consent box so we know you allow outreach on your behalf.");

      const centers = matchCenters(data.location, data.needs);
      if (!centers.length) errors.push("We couldn’t match a center. Try a ZIP code or another nearby city.");

      if (errors.length) {
        if (formError) {
          formError.hidden = false;
          formError.textContent = errors.join(" ");
        }
        return;
      }

      const msg = buildMessage(data, centers);
      const emails = centers.map((c) => c.email).filter(Boolean);
      const mailto = `mailto:${encodeURIComponent(emails.join(","))}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;

      /* Open mail client */
      const mailLink = document.createElement("a");
      mailLink.href = mailto;
      mailLink.style.display = "none";
      document.body.appendChild(mailLink);
      mailLink.click();
      mailLink.remove();

      /* Optional SMS to first center with phone */
      const preferSms = helpForm.querySelector("#prefer-sms") && helpForm.querySelector("#prefer-sms").checked;
      if (preferSms && centers[0] && centers[0].phone) {
        const digits = centers[0].phone.replace(/[^\d+]/g, "");
        const smsUrl = `sms:${digits}?&body=${encodeURIComponent(msg.sms)}`;
        window.setTimeout(() => {
          window.location.href = smsUrl;
        }, 600);
      }

      if (formSuccess) {
        formSuccess.hidden = false;
        formSuccess.innerHTML = `
          <strong>You’re all set.</strong> Your mail app should open with a message to
          ${escapeHtml(centers.map((c) => c.name).join(", "))}.
          Review it, then send. A copyable version is below if you need to paste manually.
        `;
      }

      helpForm._lastPreview = { data, centers, msg };
      updatePreview();
      formSuccess && formSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  if (copyMsgBtn) {
    copyMsgBtn.addEventListener("click", async () => {
      const last = helpForm && helpForm._lastPreview;
      const text = last && last.msg
        ? `Subject: ${last.msg.subject}\n\n${last.msg.body}`
        : (previewEl && previewEl.textContent) || "";
      try {
        await navigator.clipboard.writeText(text);
        copyMsgBtn.textContent = "Copied!";
        setTimeout(() => { copyMsgBtn.textContent = "Copy message"; }, 2000);
      } catch {
        copyMsgBtn.textContent = "Select text above to copy";
        setTimeout(() => { copyMsgBtn.textContent = "Copy message"; }, 2500);
      }
    });
  }

  /* Prefill ZIP from directory links */
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest("[data-pref-zip]");
    if (!a) return;
    const zip = a.getAttribute("data-pref-zip");
    window.setTimeout(() => {
      const loc = document.getElementById("location");
      if (loc && zip) {
        loc.value = zip;
        updatePreview();
      }
    }, 100);
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  /* ---------- PWA: service worker, install prompt, standalone ---------- */
  const DISMISS_KEY = "hearthHopeInstallDismissed";
  let deferredInstallPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIos() {
    const ua = window.navigator.userAgent || "";
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return iOS;
  }

  function isSafari() {
    const ua = window.navigator.userAgent || "";
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(ua);
  }

  function wasDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
  }

  function showInstallBanner({ showInstallBtn, showIosSteps }) {
    const banner = document.getElementById("install-banner");
    const installBtn = document.getElementById("install-btn");
    const iosSteps = document.getElementById("ios-install-steps");
    const hint = document.getElementById("install-banner-hint");
    if (!banner || wasDismissed() || isStandalone()) return;

    banner.hidden = false;
    if (installBtn) installBtn.hidden = !showInstallBtn;
    if (iosSteps) iosSteps.hidden = !showIosSteps;
    if (hint) {
      if (showIosSteps) {
        hint.textContent = "On iPhone, use Safari’s Share menu — steps below. You can dismiss this tip anytime.";
      } else if (showInstallBtn) {
        hint.textContent = "Install for a full-screen app and offline access to pages you’ve opened.";
      } else {
        hint.textContent = "Keep resources and help one tap away — works offline for pages you’ve already opened.";
      }
    }
  }

  function hideInstallBanner() {
    const banner = document.getElementById("install-banner");
    if (banner) banner.hidden = true;
  }

  function wireInstallUI() {
    if (isStandalone()) {
      document.body.classList.add("standalone-mode");
      hideInstallBanner();
      const aboutBtn = document.getElementById("about-install-btn");
      if (aboutBtn) aboutBtn.hidden = true;
      return;
    }

    const dismissBtn = document.getElementById("install-dismiss");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        setDismissed();
        hideInstallBanner();
      });
    }

    const installBtn = document.getElementById("install-btn");
    const aboutInstallBtn = document.getElementById("about-install-btn");

    async function triggerInstall() {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch { /* ignore */ }
      deferredInstallPrompt = null;
      hideInstallBanner();
      if (installBtn) installBtn.hidden = true;
      if (aboutInstallBtn) aboutInstallBtn.hidden = true;
    }

    if (installBtn) installBtn.addEventListener("click", triggerInstall);
    if (aboutInstallBtn) {
      aboutInstallBtn.addEventListener("click", triggerInstall);
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (aboutInstallBtn) aboutInstallBtn.hidden = false;
      if (!wasDismissed()) {
        showInstallBanner({ showInstallBtn: true, showIosSteps: false });
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      hideInstallBanner();
      setDismissed();
    });

    /* iOS Safari: gentle how-to (no beforeinstallprompt) */
    if (isIos() && !isStandalone() && !wasDismissed()) {
      /* Delay slightly so it doesn’t compete with first paint */
      window.setTimeout(() => {
        showInstallBanner({ showInstallBtn: false, showIosSteps: true });
      }, 1800);
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    /* Only register when served over http(s) — not file:// */
    if (!window.location.protocol.startsWith("http")) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }

  function wireOfflineToast() {
    let toast = document.getElementById("offline-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "offline-toast";
      toast.className = "offline-toast";
      toast.hidden = true;
      toast.setAttribute("role", "status");
      toast.textContent = "You’re offline — showing saved pages only. No new medical content is invented.";
      document.body.appendChild(toast);
    }
    function sync() {
      toast.hidden = navigator.onLine;
    }
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
  }

  /* Boot */
  populateTypeFilter();
  renderResources();
  renderCenters();
  updatePreview();
  route();
  wireInstallUI();
    if (window.HearthVoice) window.HearthVoice.wire();

  /* Get Help step prompts (voice) */
  (function wireHelpVoice() {
    const form = document.getElementById("help-form");
    if (!form || !window.HearthVoice) return;
    const tips = {
      firstName: "Type your first name.",
      location: "Type your city or ZIP code. Or tap Use my location.",
      email: "Email is optional if you share a phone number.",
      phone: "Phone is optional if you share an email.",
      message: "You can add a short message for the centers. This is optional.",
      consent: "Check this box only if you allow the app to open a message to centers for you.",
    };
    form.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("focus", () => {
        if (!window.HearthVoice.getPref()) return;
        const id = el.id || el.name;
        const tip = tips[id] || (el.name === "needs" ? "Check everything that fits your situation." : "");
        if (tip) window.HearthVoice.speak(tip);
      });
    });
  })();

  registerServiceWorker();
  wireOfflineToast();
})();
