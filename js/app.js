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
      <p style="margin-top:1rem"><button type="button" class="btn btn-ghost" id="close-resource">Close</button>
      <a class="btn btn-primary" href="#help">Ask centers for help</a></p>
    `;
    resourceDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const closeBtn = document.getElementById("close-resource");
    if (closeBtn) closeBtn.addEventListener("click", () => { resourceDetail.hidden = true; });
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

  /* ---------- Directory ---------- */
  const centerList = document.getElementById("center-list");
  const locFilter = document.getElementById("loc-filter");
  const typeFilter = document.getElementById("type-filter");

  function getCenters() {
    return window.HEARTH_CENTERS || [];
  }

  function populateTypeFilter() {
    if (!typeFilter) return;
    const types = [...new Set(getCenters().map((c) => c.type))].sort();
    typeFilter.innerHTML = `<option value="">All types</option>` +
      types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  }

  function renderCenters() {
    if (!centerList) return;
    const q = (locFilter && locFilter.value || "").trim().toLowerCase();
    const type = (typeFilter && typeFilter.value) || "";
    const list = getCenters().filter((c) => {
      const typeOk = !type || c.type === type;
      const hay = `${c.city} ${c.state} ${c.zip} ${c.name}`.toLowerCase();
      const locOk = !q || hay.includes(q);
      return typeOk && locOk;
    });

    if (!list.length) {
      centerList.innerHTML = `<div class="empty-state">No centers match that city or ZIP. Try “Austin”, “78701”, or clear the filter.</div>`;
      return;
    }

    centerList.innerHTML = list.map((c) => `
      <article class="center-card">
        <header>
          <h3>${escapeHtml(c.name)}</h3>
          <span class="tag green">${escapeHtml(c.type)}</span>
        </header>
        <p class="loc">${escapeHtml(c.city)}, ${escapeHtml(c.state)} ${escapeHtml(c.zip)} · ${escapeHtml(c.faith)}</p>
        <p class="blurb">${escapeHtml(c.blurb)}</p>
        <div class="services">${c.services.map((s) => `<span class="service-pill">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="center-actions">
          <a href="tel:${escapeAttr(c.phone)}">Call ${escapeHtml(c.phone)}</a>
          <a href="mailto:${escapeAttr(c.email)}">Email</a>
          <a href="#help" data-pref-zip="${escapeAttr(c.zip)}">Contact via app</a>
        </div>
      </article>
    `).join("");
  }

  if (locFilter) locFilter.addEventListener("input", renderCenters);
  if (typeFilter) typeFilter.addEventListener("change", renderCenters);

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
    const q = (loc || "").trim().toLowerCase();
    let pool = getCenters();
    if (q) {
      const locMatched = pool.filter((c) =>
        `${c.city} ${c.zip} ${c.state}`.toLowerCase().includes(q)
      );
      if (locMatched.length) pool = locMatched;
    }
    if (needs.length) {
      const scored = pool.map((c) => {
        const overlap = needs.filter((n) => (c.needs || []).includes(n)).length;
        return { c, overlap };
      });
      scored.sort((a, b) => b.overlap - a.overlap || a.c.name.localeCompare(b.c.name));
      const withOverlap = scored.filter((s) => s.overlap > 0).map((s) => s.c);
      pool = withOverlap.length ? withOverlap : scored.map((s) => s.c);
    }
    return pool.slice(0, 3);
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

    matchEl.innerHTML = centers.length
      ? `<p><strong>Suggested centers (up to 3):</strong></p><ul class="match-list">${
          centers.map((c) => `<li><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.city)} ${escapeHtml(c.zip)} · ${escapeHtml(c.type)}</li>`).join("")
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
      if (!centers.length) errors.push("We couldn’t match a center. Try another nearby city or ZIP.");

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
  registerServiceWorker();
  wireOfflineToast();
})();
