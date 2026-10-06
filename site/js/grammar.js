/* Grammaire : indice sur l'article après une réponse, et pages de grammaire (content/grammar/*.json). */
(function (LB) {
  "use strict";

  var G = LB.grammar = {};

  /* Explication courte sur l'article d'un nom (de, den, d'). */
  G.hint = function (item) {
    var parts = LB.splitArticle(item.lb);
    if (!parts) return "";
    if (parts.art === "D'") {
      var label = { f: "féminin", n: "neutre", pl: "pluriel" }[item.gender];
      if (label) {
        return "<b>d'</b> : " + label + ". Le féminin, le neutre et le pluriel prennent tous « d' » : seul le genre du mot permet de les distinguer.";
      }
      return "<b>d'</b> : article du féminin, du neutre et du pluriel. La forme ne dit pas lequel : apprenez le genre avec le mot.";
    }
    var first = parts.base.charAt(0).toLowerCase();
    if (parts.art === "Den") {
      return "<b>den</b> : masculin. Le « n » est gardé car le mot commence par " +
        (/[aeiouyäéëöüàèêîôû]/.test(first) ? "une voyelle" : "« " + LB.esc(first) + " »") + ".";
    }
    return "<b>de</b> : masculin. Pas de « n » devant « " + LB.esc(first) +
      " » : on ne le garde que devant une voyelle ou n, d, t, z, h.";
  };

  /* Décomposition mot à mot d'une phrase. */
  G.partsHtml = function (item) {
    var h = "";
    if (item.parts) {
      h += '<p class="pttl">Décomposition</p>' + item.parts.map(function (p) {
        return '<div class="pt"><b>' + LB.esc(p[0]) + "</b><span>" + LB.esc(p[1]) + "</span></div>";
      }).join("");
    }
    if (item.note) h += '<p class="pnote">' + LB.esc(item.note) + "</p>";
    return h;
  };

  function blockHtml(b) {
    if (b.h) return "<h2>" + LB.inline(b.h) + "</h2>";
    if (b.p) return "<p>" + LB.inline(b.p) + "</p>";
    if (b.small) return '<p class="gsmall">' + LB.inline(b.small) + "</p>";
    if (b.examples) {
      return b.examples.map(function (e) {
        return '<div class="gex"><span class="ex">' + LB.esc(e[0]) + "</span> " + LB.esc(e[1] || "") + "</div>";
      }).join("");
    }
    if (b.table) {
      var t = b.table, acc = t.accent;
      var head = "<tr>" + t.head.map(function (c) { return "<th>" + LB.esc(c) + "</th>"; }).join("") + "</tr>";
      var rows = t.rows.map(function (r) {
        return "<tr>" + r.map(function (c, i) {
          return "<td" + (i === acc ? ' class="acc"' : "") + ">" + LB.inline(c) + "</td>";
        }).join("") + "</tr>";
      }).join("");
      return '<table class="art">' + head + rows + "</table>";
    }
    return "";
  }

  G.show = function (id) {
    var page = LB.content.grammar.get(id);
    if (!page) { LB.go.home(); return; }
    LB.$("#app").innerHTML =
      '<div class="top"><button class="close" id="gback" aria-label="Retour">‹</button>' +
      '<h1 style="font:800 24px var(--display);margin:0">' + LB.esc(page.title) + "</h1></div>" +
      '<div class="gtext">' + page.blocks.map(blockHtml).join("") + "</div>";
    LB.$("#gback").onclick = function () { LB.go.home(); };
    window.scrollTo(0, 0);
  };
})(window.LB);
