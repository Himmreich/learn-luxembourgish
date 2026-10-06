/* Écran d'accueil : salutation, statistiques, grammaire et thèmes par section. */
(function (LB) {
  "use strict";

  var H = LB.home = {};
  var $ = LB.$, esc = LB.esc, store = LB.store;

  H.updateCredit = function () {
    var c = $("#lodcredit");
    if (c) c.textContent = LB.audio.credit();
  };

  function themePercent(theme) {
    var sum = theme.items.reduce(function (a, it) { return a + Math.min(store.box(it.id), 4); }, 0);
    return Math.round(sum / (theme.items.length * 4) * 100);
  }

  H.show = function () {
    var items = LB.content.allItems();
    var mastered = items.filter(function (it) { return store.box(it.id) >= 3; }).length;
    var evening = new Date().getHours() >= 18;
    var hello = evening ? "Gudden Owend" : "Moien", fr = evening ? "Bonsoir" : "Bonjour";

    var grammar = LB.content.grammarOrder.map(function (id) {
      var g = LB.content.grammar.get(id);
      return '<button class="gram" data-grammar="' + id + '"><span>' + esc(g.title) +
        (g.subtitle ? "<small>" + esc(g.subtitle) + "</small>" : "") + '</span><span aria-hidden="true">›</span></button>';
    }).join("");

    var sections = LB.content.sections.map(function (s) {
      var buttons = s.themes.map(function (t) {
        var pct = themePercent(t);
        return '<button class="theme" data-theme="' + t.id + '"><span class="fill" style="width:' + pct + '%"></span>' +
          '<span class="row"><span class="name">' + esc(t.title) + '</span><span class="meta">' +
          t.items.length + " mots · " + pct + " %</span></span></button>";
      }).join("");
      return "<h2>" + esc(s.title) + "</h2>" +
        (s.subtitle ? '<p class="sub">' + esc(s.subtitle) + "</p>" : "") +
        '<div class="themes">' + buttons + "</div>";
    }).join("");

    $("#app").innerHTML =
      '<section class="hero"><h1 class="hello">' + hello + '</h1><p class="fr">' + fr + "</p></section>" +
      '<div class="stats">' +
      '<div class="stat"><b>' + store.streakNow() + "</b><span>jours d'affilée</span></div>" +
      '<div class="stat"><b>' + mastered + "/" + items.length + "</b><span>mots maîtrisés</span></div></div>" +
      '<button class="review" id="rev"><span>Révision mixte<br><small>Les mots les moins connus</small></span><span aria-hidden="true">›</span></button>' +
      grammar + sections +
      '<p class="foot">Version ' + LB.VERSION + " · Audio : voix de synthèse du téléphone, parfois approximative. Référence : " +
      '<a href="https://lod.lu" target="_blank" rel="noopener">lod.lu</a>.<span id="lodcredit"></span><br>' +
      '<button id="audiotest">Tester l\'audio</button> · Les progrès restent sur cet appareil. <button id="reset">Tout effacer</button></p>' +
      '<p class="foot diag hidden" id="diag" role="status"></p>';

    $("#rev").onclick = function () { LB.go.lesson(LB.content.allItems()); };
    document.querySelectorAll("[data-grammar]").forEach(function (b) {
      b.onclick = function () { LB.go.grammar(b.getAttribute("data-grammar")); };
    });
    document.querySelectorAll("[data-theme]").forEach(function (b) {
      b.onclick = function () { LB.go.lesson(LB.content.themes.get(b.getAttribute("data-theme")).items); };
    });
    $("#audiotest").onclick = function () {
      var err = "";
      LB.audio.log = [];
      try { LB.audio.speak("Moien"); } catch (e) { err = " · erreur : " + esc(String(e && e.message || e)); }
      function show() {
        $("#diag").innerHTML = LB.audio.diag() + err + "<br>Événements : " +
          (LB.audio.log.length ? esc(LB.audio.log.join(" → ")) : "aucun");
      }
      show();
      $("#diag").classList.remove("hidden");
      setTimeout(show, 2500);
    };
    $("#reset").onclick = function () {
      if (confirm("Effacer toute votre progression ?")) { store.reset(); H.show(); }
    };
    H.updateCredit();
  };
})(window.LB);
