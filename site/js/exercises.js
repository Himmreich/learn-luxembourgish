/*
 * Types d'exercices. Chaque exercice est enregistré avec LB.exercises.register({...}) :
 *   id      identifiant unique
 *   kind    "choice" (QCM) ou "typed" (saisie) : sert au tirage
 *   applies(item)   true si l'exercice convient à ce mot ou cette phrase
 *   render(ctx)     dessine l'exercice dans ctx.el et appelle ctx.answer(ok, bonneRéponse)
 *                   ctx : { item, el, answered(), answer(ok, correctText), swap(typeId) }
 * Pour ajouter un type d'exercice (remise en ordre, écoute...), il suffit d'en enregistrer un nouveau.
 */
(function (LB) {
  "use strict";

  var E = LB.exercises = { types: {}, order: [] };

  E.register = function (def) {
    E.types[def.id] = def;
    if (E.order.indexOf(def.id) < 0) E.order.push(def.id);
  };

  function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* Choisit le type d'exercice : saisie une fois sur deux pour les mots déjà un peu connus. */
  E.pick = function (item) {
    function ids(kind) {
      return E.order.filter(function (id) { return E.types[id].kind === kind && E.types[id].applies(item); });
    }
    var typed = ids("typed"), choice = ids("choice");
    if (typed.length && LB.store.box(item.id) >= 2 && Math.random() < 0.5) return pickRandom(typed);
    return pickRandom(choice.length ? choice : typed);
  };

  /* --- Briques communes --- */

  function markChoices(el, correct, chosen, ok) {
    el.querySelectorAll(".choice").forEach(function (c) {
      c.disabled = true;
      if (c.textContent === correct) c.classList.add("good");
    });
    if (!ok) chosen.classList.add("bad");
  }

  function renderChoice(ctx, o) {
    var it = ctx.item, correct = it[o.answerField];
    var options = LB.shuffle([correct].concat(LB.content.distractors(it, o.answerField, 3)));
    ctx.el.innerHTML =
      '<p class="instr">' + o.instr + "</p>" + o.promptHtml +
      '<div class="choices" id="ch"></div>' +
      (o.swapTo ? '<button class="swap" id="swap" type="button">' + o.swapLabel + "</button>" : "");
    options.forEach(function (text) {
      var b = document.createElement("button");
      b.className = "choice";
      b.textContent = text;
      b.onclick = function () {
        if (ctx.answered()) return;
        var ok = text === correct;
        markChoices(ctx.el, correct, b, ok);
        ctx.answer(ok, correct);
      };
      LB.$("#ch").appendChild(b);
    });
    if (o.swapTo) LB.$("#swap").onclick = function () { if (!ctx.answered()) ctx.swap(o.swapTo); };
  }

  /* --- Les exercices --- */

  E.register({
    id: "choice_fr_lb", kind: "choice",
    applies: function () { return true; },
    render: function (ctx) {
      renderChoice(ctx, {
        instr: "Comment dit-on en luxembourgeois ?",
        promptHtml: '<p class="prompt">' + LB.esc(ctx.item.fr) + "</p>",
        answerField: "lb",
        swapTo: "typed_fr_lb", swapLabel: "Écrire la réponse"
      });
    }
  });

  E.register({
    id: "choice_lb_fr", kind: "choice",
    applies: function () { return true; },
    render: function (ctx) {
      renderChoice(ctx, {
        instr: "Que veut dire ce mot ?",
        promptHtml: '<div class="promptrow"><p class="prompt">' + LB.esc(ctx.item.lb) + "</p>" +
          '<button class="speak" id="say" type="button" aria-label="Écouter le mot">' + LB.audio.ICON + "</button></div>",
        answerField: "fr"
      });
      LB.$("#say").onclick = function () { LB.audio.speak(ctx.item.lb); };
    }
  });

  E.register({
    id: "typed_fr_lb", kind: "typed",
    applies: function () { return true; },
    render: function (ctx) {
      var it = ctx.item;
      ctx.el.innerHTML =
        '<p class="instr">Écrivez en luxembourgeois</p><p class="prompt">' + LB.esc(it.fr) + "</p>" +
        '<input class="typed" id="inp" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" aria-label="Votre réponse" placeholder="Votre réponse">' +
        '<p class="hint">Les accents ne sont pas obligatoires.</p>' +
        '<button class="go" id="check" style="margin-top:22px" disabled>Vérifier</button>' +
        '<button class="swap" id="swap" type="button">Choisir parmi des propositions</button>';
      var inp = LB.$("#inp"), chk = LB.$("#check");
      function check() {
        var ok = LB.sameAnswer(inp.value, it.lb);
        inp.readOnly = true;
        inp.classList.add(ok ? "good" : "bad");
        chk.classList.add("hidden");
        ctx.answer(ok, it.lb);
      }
      inp.focus();
      inp.oninput = function () { chk.disabled = !inp.value.trim(); };
      inp.onkeydown = function (e) { if (e.key === "Enter" && inp.value.trim() && !ctx.answered()) check(); };
      chk.onclick = function () { if (!ctx.answered()) check(); };
      LB.$("#swap").onclick = function () { if (!ctx.answered()) ctx.swap("choice_fr_lb"); };
    }
  });
})(window.LB);
