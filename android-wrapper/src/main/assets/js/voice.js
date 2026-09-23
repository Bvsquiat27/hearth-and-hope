/**
 * Hearth & Hope — read-aloud via Web Speech API (speechSynthesis).
 * Cancels prior speech before starting. Play / Pause / Stop + Voice help preference.
 */
(function (global) {
  "use strict";

  var PREF_KEY = "hearth_voice_help_on";
  var synth = global.speechSynthesis || null;
  var currentUtterance = null;

  function supported() {
    return !!(synth && global.SpeechSynthesisUtterance);
  }

  function getPref() {
    try { return localStorage.getItem(PREF_KEY) === "1"; } catch (e) { return false; }
  }

  function setPref(on) {
    try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
    document.documentElement.classList.toggle("voice-help-on", !!on);
    updateChrome();
  }

  function stop() {
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* ignore */ }
    currentUtterance = null;
    updateChrome();
  }

  function pause() {
    if (synth && synth.speaking && !synth.paused) {
      try { synth.pause(); } catch (e) { /* ignore */ }
    }
    updateChrome();
  }

  function resume() {
    if (synth && synth.paused) {
      try { synth.resume(); } catch (e) { /* ignore */ }
    }
    updateChrome();
  }

  function isSpeaking() { return !!(synth && (synth.speaking || synth.paused)); }
  function isPaused() { return !!(synth && synth.paused); }

  function scrub(text) {
    return String(text || "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
      .replace(/[♥♡⌂]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!supported()) {
      if (opts.onUnsupported) opts.onUnsupported();
      return false;
    }
    var cleaned = scrub(text);
    if (!cleaned) return false;
    stop();
    var u = new SpeechSynthesisUtterance(cleaned);
    u.lang = "en-US";
    u.rate = opts.rate || 0.95;
    u.pitch = 1;
    u.onend = function () {
      currentUtterance = null;
      updateChrome();
      if (opts.onEnd) opts.onEnd();
    };
    u.onerror = function () {
      currentUtterance = null;
      updateChrome();
    };
    currentUtterance = u;
    try { synth.speak(u); } catch (e) {
      currentUtterance = null;
      return false;
    }
    updateChrome();
    return true;
  }

  function textFromElement(el) {
    if (!el) return "";
    var clone = el.cloneNode(true);
    clone.querySelectorAll("script, style, .voice-controls, .voice-btn, .bn-icon, [aria-hidden='true']").forEach(function (n) {
      n.remove();
    });
    return scrub(clone.innerText || clone.textContent || "");
  }

  function currentViewId() {
    var active = document.querySelector(".view.active");
    if (!active || !active.id) return "home";
    return active.id.replace(/^view-/, "");
  }

  function speakSection(sectionId) {
    var view = document.getElementById("view-" + sectionId);
    if (!view) return false;
    var chunks = [];
    var head = view.querySelector(".section-head, .hero");
    if (head) chunks.push(textFromElement(head));

    if (sectionId === "home") {
      chunks.push("Choices on this screen:");
      view.querySelectorAll(".cta-row a").forEach(function (n) {
        chunks.push(n.textContent.trim());
      });
      view.querySelectorAll(".card-grid .card h3").forEach(function (n) {
        chunks.push(n.textContent.trim());
      });
      chunks.push("Tap a big button to continue. Or use the menu at the bottom.");
    } else if (sectionId === "resources") {
      chunks.push("Search or pick a topic. Tap a card to read more. I will also list the titles.");
      view.querySelectorAll("#resource-grid .card h3").forEach(function (n, i) {
        if (i < 10) chunks.push(n.textContent.trim());
      });
    } else if (sectionId === "directory") {
      chunks.push("Type your city or ZIP code. Then look at nearby help centers.");
      var note = document.getElementById("dir-match-note");
      if (note && !note.hidden) chunks.push(note.textContent);
      view.querySelectorAll("#center-list .center-card").forEach(function (card, i) {
        if (i >= 5) return;
        var name = card.querySelector("h3");
        var loc = card.querySelector(".loc");
        var phone = card.querySelector("a[href^='tel:']");
        chunks.push(
          (name ? name.textContent : "") + ". " +
          (loc ? loc.textContent : "") + ". " +
          (phone ? "Phone " + phone.textContent.replace(/^Call\s+/i, "") : "")
        );
      });
      if (view.querySelectorAll("#center-list .center-card").length > 5) {
        chunks.push("More centers are listed on the screen.");
      }
    } else if (sectionId === "help") {
      chunks.push(
        "Fill in your first name and city or ZIP. Check what you need. " +
        "Then check the box that allows contact. Nothing is sent until your own email or text app opens."
      );
      var prev = document.getElementById("match-preview");
      if (prev) chunks.push(textFromElement(prev));
    } else if (sectionId === "about") {
      view.querySelectorAll(".promise-card").forEach(function (c) {
        chunks.push(textFromElement(c));
      });
      var disc = view.querySelector(".disclaimer-block");
      if (disc) chunks.push(textFromElement(disc));
    }

    return speak(chunks.filter(Boolean).join(". "));
  }

  function speakResource(r) {
    if (!r) return false;
    var parts = [r.title, r.summary].concat(r.body || []);
    if (r.medical) parts.push("This is general information, not a substitute for your doctor.");
    return speak(parts.join(". "));
  }

  function updateChrome() {
    var speaking = isSpeaking();
    var paused = isPaused();
    document.querySelectorAll("[data-voice-state]").forEach(function (el) {
      el.setAttribute("data-voice-state", paused ? "paused" : speaking ? "speaking" : "idle");
    });
    document.querySelectorAll("[data-voice-label-play]").forEach(function (el) {
      if (paused) el.textContent = "Resume";
      else if (speaking) el.textContent = "Pause";
      else el.textContent = "Read aloud";
    });
    var toggle = document.getElementById("voice-help-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", getPref() ? "true" : "false");
      toggle.classList.toggle("is-on", getPref());
    }
  }

  function wire() {
    if (!supported()) {
      document.documentElement.classList.add("voice-unsupported");
      return;
    }
    document.documentElement.classList.toggle("voice-help-on", getPref());
    document.body.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-voice-action]");
      if (!btn) return;
      e.preventDefault();
      var action = btn.getAttribute("data-voice-action");
      if (action === "toggle-pref") {
        var next = !getPref();
        setPref(next);
        if (next) speakSection(currentViewId());
        else stop();
        return;
      }
      if (action === "stop") { stop(); return; }
      if (action === "play-pause") {
        if (isPaused()) resume();
        else if (isSpeaking()) pause();
        else speakSection(btn.getAttribute("data-voice-section") || currentViewId());
        return;
      }
      if (action === "read-section") {
        speakSection(btn.getAttribute("data-voice-section") || currentViewId());
      }
    });
    updateChrome();
  }

  global.HearthVoice = {
    supported: supported,
    speak: speak,
    stop: stop,
    pause: pause,
    resume: resume,
    speakSection: speakSection,
    speakResource: speakResource,
    getPref: getPref,
    setPref: setPref,
    textFromElement: textFromElement,
    wire: wire,
    updateChrome: updateChrome,
    currentViewId: currentViewId,
  };
})(window);
