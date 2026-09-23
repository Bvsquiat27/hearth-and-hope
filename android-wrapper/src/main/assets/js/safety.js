/**
 * Neighborhood safety — opens official NSOPW (U.S. DOJ) in a new tab.
 * No scraping, no caching of offender records, no paid APIs.
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

  function showSteps(zip) {
    if (stepsEl) stepsEl.hidden = false;
    if (zipReminder) zipReminder.textContent = zip || "your ZIP";
    if (openNote) {
      openNote.hidden = false;
      openNote.textContent = zip
        ? "On the next page, type " + zip + " in the ZIP field and Search."
        : "On the next page, type your ZIP and Search.";
    }
  }

  function openOfficialSearch() {
    const zip = resolveZip();
    if (zipInput && zip && !extractZip(zipInput.value)) zipInput.value = zip;
    if (zip) rememberZip(zip);

    showSteps(zip);

    /* No reliable official query-param deep link; open the government search page. */
    const win = window.open(NSOPW_SEARCH, "_blank", "noopener,noreferrer");
    if (!win && openNote) {
      openNote.hidden = false;
      openNote.textContent =
        "Pop-up blocked. Use the button again, or open NSOPW home and choose Search.";
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
