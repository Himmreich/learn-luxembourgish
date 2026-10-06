/* Audio : enregistrements du LOD (audio-map.json + dossier audio/) si présents, sinon voix de synthèse. */
(function (LB) {
  "use strict";

  var A = LB.audio = { map: {}, log: [] };
  var synth = ("speechSynthesis" in window) ? window.speechSynthesis : null;
  var voices = [];
  var player = null;
  var toastTimer;

  A.ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';

  function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  loadVoices();
  if (synth) synth.onvoiceschanged = loadVoices;

  function pickVoice() {
    var lb = voices.find(function (v) { return /^lb\b/i.test(v.lang.replace("_", "-")); });
    if (lb) return { v: lb, exact: true };
    var de = voices.find(function (v) { return /^de[-_]?(DE|AT|CH|LU)?/i.test(v.lang); });
    return { v: de || null, exact: false };
  }

  var LOD_LINK = '<a href="https://lod.lu" target="_blank" rel="noopener">lod.lu</a>';

  A.toast = function (html) {
    var t = LB.$("#toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 6000);
  };

  function speakTTS(text, retried) {
    if (!synth) { A.toast("L'audio n'est pas disponible sur ce navigateur."); return false; }
    var clean = text.replace(/…/g, "").replace(/\s+/g, " ").trim();
    if (!voices.length) loadVoices();
    if (!voices.length) A.toast("Aucune voix de synthèse détectée dans ce navigateur. Essayez la page dans Safari ou Chrome.");
    var pick = pickVoice();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = pick.exact ? pick.v.lang : "de-DE";
    if (pick.v && !retried) u.voice = pick.v;
    u.rate = 0.85;
    var started = false;
    A.log.push(retried ? "nouvel essai" : "lecture demandée");
    u.onstart = function () { started = true; A.log.push("démarré"); };
    u.onend = function () { A.log.push("terminé"); };
    u.onerror = function (e) {
      A.log.push("erreur : " + (e && e.error));
      if (e && (e.error === "canceled" || e.error === "interrupted")) return;
      if (!retried) { speakTTS(text, true); return; }
      A.toast("Le son n'a pas pu démarrer. Vérifiez le volume et le mode silencieux, ou essayez un autre navigateur.");
    };
    function run() {
      try { synth.resume(); } catch (e) {}
      synth.speak(u);
      setTimeout(function () {
        if (!started && !synth.speaking && !retried) speakTTS(text, true);
      }, 1500);
    }
    if (synth.speaking || synth.pending) { synth.cancel(); setTimeout(run, 120); } else { run(); }
    return pick.exact;
  }

  /* Joue l'enregistrement du LOD s'il existe, sinon la voix de synthèse. */
  A.speak = function (text) {
    var file = A.map[text];
    if (file) {
      A.log.push("enregistrement du LOD");
      try {
        if (player) player.pause();
        if (synth) synth.cancel();
        player = new Audio(file);
        player.onerror = function () { A.log.push("fichier introuvable, synthèse"); speakTTS(text); };
        var pr = player.play();
        if (pr && pr.catch) pr.catch(function () { speakTTS(text); });
        return true;
      } catch (e) { return speakTTS(text); }
    }
    return speakTTS(text);
  };

  A.hasRecording = function (text) { return !!A.map[text]; };

  /* Note affichée sous le bouton d'écoute quand la voix n'est qu'une approximation. */
  A.note = function (text) {
    if (A.map[text]) return "";
    if (!synth) return "L'audio n'est pas disponible sur ce navigateur. Écoutez le mot sur " + LOD_LINK + ".";
    return pickVoice().exact ? "" :
      "Voix de synthèse approximative (aucune voix luxembourgeoise sur cet appareil). Pour la bonne prononciation, cherchez le mot sur " + LOD_LINK + ".";
  };

  A.diag = function () {
    if (!synth) return "Synthèse vocale : non prise en charge par ce navigateur.";
    loadVoices();
    var p = pickVoice();
    return "Synthèse vocale : oui · voix détectées : " + voices.length + " · voix choisie : " +
      (p.v ? LB.esc(p.v.name) + " (" + LB.esc(p.v.lang) + ")" : "aucune") +
      (p.exact ? "" : " · pas de voix luxembourgeoise");
  };

  A.credit = function () {
    return Object.keys(A.map).length ? " Enregistrements : LOD (lod.lu), licence CC0." : "";
  };

  /* Charge audio-map.json s'il existe (absent : on utilise la synthèse, sans erreur). */
  A.init = function (onLoaded) {
    try {
      fetch("audio-map.json")
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (m) { A.map = m || {}; if (onLoaded) onLoaded(); })
        .catch(function () {});
    } catch (e) {}
  };
})(window.LB);
