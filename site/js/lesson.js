/* Leçon : file de questions, feuille de correction, écran final. */
(function (LB) {
  "use strict";

  var SIZE = 8;
  var L = LB.lesson = {};
  var $ = LB.$, store = LB.store;
  var Q = [], idx = 0, firstTry = 0, total = 0, pool = [], answered = false;

  function makeQ(item, retry) {
    return { item: item, type: LB.exercises.pick(item), retry: retry };
  }

  /* Démarre une leçon : les mots les moins connus d'abord. */
  L.start = function (items) {
    if (!items || !items.length) return;
    pool = items;
    var sorted = LB.shuffle(items).sort(function (a, b) { return store.box(a.id) - store.box(b.id); });
    var chosen = sorted.slice(0, Math.min(SIZE, items.length));
    Q = LB.shuffle(chosen).map(function (it) { return makeQ(it, false); });
    idx = 0; firstTry = 0; total = Q.length;
    shell();
    showQ();
  };

  function shell() {
    $("#app").innerHTML =
      '<div class="top"><button class="close" id="quit" aria-label="Quitter la leçon">×</button>' +
      '<div class="bar" role="progressbar" aria-label="Progression"><i id="prog"></i></div></div>' +
      '<div id="q"></div>' +
      '<div class="sheet hidden" id="sheet"><div class="in">' +
      '<p class="msg" id="msg"></p>' +
      '<button class="listen" id="hear" type="button"></button>' +
      '<div class="scroll" id="scroll"><div id="parts"></div><p class="why" id="why"></p><p class="approx" id="approx"></p></div>' +
      '<button class="go" id="next">Continuer</button></div></div>';
    $("#quit").onclick = function () {
      if (confirm("Quitter cette leçon ? Votre progression de la leçon sera perdue.")) LB.go.home();
    };
  }

  function showQ() {
    answered = false;
    var q = Q[idx];
    $("#sheet").className = "sheet hidden";
    $("#prog").style.width = (idx / Q.length * 100) + "%";
    LB.exercises.types[q.type].render({
      item: q.item,
      el: $("#q"),
      answered: function () { return answered; },
      answer: onAnswer,
      swap: function (type) { q.type = type; showQ(); }
    });
  }

  function onAnswer(ok, correctText) {
    answered = true;
    var q = Q[idx], it = q.item;
    var swap = $("#swap"); if (swap) swap.classList.add("hidden");

    store.setBox(it.id, ok ? Math.min(store.box(it.id) + 1, 5) : 0);
    if (ok && !q.retry) firstTry++;
    if (!ok && !q.retry) Q.push(makeQ(it, true));

    $("#sheet").className = "sheet " + (ok ? "good" : "bad");
    $("#msg").innerHTML = ok ? "Correct !" : "Pas tout à fait<span>Réponse : " + LB.esc(correctText) + "</span>";
    $("#hear").innerHTML = LB.audio.ICON + "Écouter : " + LB.esc(it.lb);
    $("#hear").onclick = function () { LB.audio.speak(it.lb); };
    $("#parts").innerHTML = LB.grammar.partsHtml(it);
    $("#scroll").scrollTop = 0;
    $("#why").innerHTML = LB.grammar.hint(it);
    $("#why").classList.toggle("hidden", !$("#why").innerHTML);
    $("#approx").innerHTML = LB.audio.note(it.lb);
    $("#approx").classList.toggle("hidden", !$("#approx").innerHTML);

    var last = idx === Q.length - 1;
    $("#next").textContent = last ? "Terminer" : "Continuer";
    $("#next").onclick = function () { if (last) finish(); else { idx++; showQ(); } };
    $("#next").focus();
    store.save();
  }

  function finish() {
    store.markDay();
    store.save();
    var streak = store.state.streak;
    $("#app").innerHTML =
      '<div class="done"><p class="score">' + firstTry + "/" + total + "</p>" +
      "<h2>" + (firstTry === total ? "Parfait !" : "Leçon terminée") + "</h2>" +
      "<p>" + firstTry + " bonnes réponses du premier coup.<br>Série : " + streak + " jour" + (streak > 1 ? "s" : "") + ".</p>" +
      '<button class="go" id="again" style="margin-top:22px">Refaire une leçon</button>' +
      '<button class="go" id="back" style="margin-top:10px;background:var(--surface);color:var(--ink);border:1px solid var(--line)">Retour aux thèmes</button></div>';
    $("#again").onclick = function () { L.start(pool); };
    $("#back").onclick = function () { LB.go.home(); };
  }
})(window.LB);
