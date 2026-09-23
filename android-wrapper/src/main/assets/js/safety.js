/**
 * Neighborhood safety — opens official NSOPW (U.S. DOJ) live in the same
 * WebView / browser tab. No scraping, no caching of offender records,
 * no paid or undocumented APIs — government browser UI only.
 */
(function () {
  "use strict";

  const NSOPW_SEARCH =
    "https://www.nsopw.gov/search-public-sex-offender-registries";
  const ZIP_KEY = "hearthHopeLastZip";

  const zipInput = document.getElementById("safety-zip");
  const cityInput = document.getElementById("safety-city");
  const searchBtn = document.getElementById("safety-search-btn");
  const stepsEl = document.getElementById("safety-steps");
  const zipReminder = document.getElementById("safety-zip-reminder");
  const openNote = document.getElementById("safety-open-note");

  function extractZip(raw) {
    const m = String(raw || "").match(/\b(\d{5})(?:-\d{4})?\b/);
    return m ? m[1] : "";
  }

  function readStoredZip() {
    try {
      const v = localStorage.getItem(ZIP_KEY);
      return extractZip(v);
    } catch {
      return "";
    }
  }

  function rememberZip(raw) {
    const z = extractZip(raw);
    if (!z) return;
    try {
      localStorage.setItem(ZIP_KEY, z);
    } catch { /* ignore */ }
  }

  /** Prefer Safety field, then Find help / Get Help fields, then stored ZIP. */
  function resolveZip() {
    if (zipInput && extractZip(zipInput.value)) return extractZip(zipInput.value);
    const locFilter = document.getElementById("loc-filter");
    if (locFilter && extractZip(locFilter.value)) return extractZip(locFilter.value);
    const location = document.getElementById("location");
    if (location && extractZip(location.value)) return extractZip(location.value);
    return readStoredZip();
  }

  function prefillZip() {
    if (!zipInput) return;
    if (extractZip(zipInput.value)) return;
    const z = resolveZip();
    if (z) zipInput.value = z;
  }

  /** Android WebView / file assets / installed PWA — navigate in the same view. */
  function isInAppWebView() {
    try {
      if (location.protocol === "file:") return true;
      const ua = navigator.userAgent || "";
      /* Android WebView typically includes "; wv)" */
      if (/;\s*wv\)/i.test(ua)) return true;
      if (/\bWebView\b/i.test(ua)) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        return true;
      }
      if (navigator.standalone === true) return true;
    } catch { /* ignore */ }
    return false;
  }

  function showSteps(zip) {
    if (stepsEl) stepsEl.hidden = false;
    if (zipReminder) zipReminder.textContent = zip || "your ZIP";
    if (openNote) {
      openNote.hidden = false;
      openNote.textContent = zip
        ? "On the next page, type " + zip + " in the ZIP field and Search. Use Back to return here."
        : "On the next page, type your ZIP and Search. Use Back to return here.";
    }
  }

  function openOfficialSearch() {
    const zip = resolveZip();
    if (zipInput && zip && !extractZip(zipInput.value)) zipInput.value = zip;
    if (zip) rememberZip(zip);

    showSteps(zip);

    /* Live official NSOPW page only — never scrape or call internal APIs. */
    if (isInAppWebView() || location.protocol === "file:") {
      window.location.href = NSOPW_SEARCH;
      return;
    }

    /* Mobile browser / GitHub Pages: full-screen navigate so Back returns to Hearth. */
    try {
      window.location.assign(NSOPW_SEARCH);
    } catch {
      const win = window.open(NSOPW_SEARCH, "_blank", "noopener,noreferrer");
      if (!win && openNote) {
        openNote.hidden = false;
        openNote.textContent =
          "Could not open NSOPW. Tap again, or open NSOPW home and choose Search.";
      }
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", openOfficialSearch);
  }

  if (zipInput) {
    zipInput.addEventListener("change", () => rememberZip(zipInput.value));
    zipInput.addEventListener("blur", () => rememberZip(zipInput.value));
  }

  /* Prefill when Safety view becomes active */
  function onRoute() {
    const id = (location.hash || "#home").replace(/^#/, "") || "home";
    if (id === "safety") prefillZip();
  }
  window.addEventListener("hashchange", onRoute);
  onRoute();

  /* Remember ZIP when Find help / Get Help fields change (trivial shared storage). */
  const locFilter = document.getElementById("loc-filter");
  if (locFilter) {
    locFilter.addEventListener("change", () => rememberZip(locFilter.value));
    locFilter.addEventListener("blur", () => rememberZip(locFilter.value));
  }
  const locationField = document.getElementById("location");
  if (locationField) {
    locationField.addEventListener("change", () => rememberZip(locationField.value));
    locationField.addEventListener("blur", () => rememberZip(locationField.value));
  }

  /* Expose for optional reuse */
  window.HearthSafety = { openOfficialSearch, prefillZip, rememberZip, extractZip };
})();
