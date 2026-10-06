/* Noyau : espace de noms LB et petits outils partagés. */
window.LB = window.LB || {};
(function (LB) {
  "use strict";

  LB.VERSION = "17";

  LB.$ = function (selector) { return document.querySelector(selector); };

  LB.esc = function (text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  };

  LB.shuffle = function (array) {
    var a = array.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  var DIACRITICS = /[\u0300-\u036f]/g;

  /* Forme de comparaison : minuscules, sans accents ni ponctuation. */
  LB.normFull = function (s) {
    return s.toLowerCase().normalize("NFD").replace(DIACRITICS, "")
      .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  };

  /* Idem, sans l'article de tête (de, den, d'). */
  LB.norm = function (s) {
    return LB.normFull(s.toLowerCase().trim().replace(/^(d['’]|de |den )/, ""));
  };

  /* Idem, en ignorant les « n » finaux (règle du n : sinn / si, wunnen / wunne). */
  LB.nlen = function (s) {
    return LB.norm(s).split(" ").map(function (w) { return w.replace(/n+$/, ""); }).join(" ");
  };

  /* La réponse tapée correspond-elle à la réponse attendue ? */
  LB.sameAnswer = function (input, expected) {
    return LB.normFull(input) === LB.normFull(expected) ||
      LB.norm(input) === LB.norm(expected) ||
      LB.nlen(input) === LB.nlen(expected);
  };

  /* « Den Zuch » -> {art:"Den", base:"Zuch"} ; renvoie null si ce n'est pas un nom seul. */
  LB.splitArticle = function (lb) {
    var m = /^(?:(Den|De)\s+|(D')\s*)([^\s,?!…]+)$/.exec(lb);
    return m ? { art: m[1] || m[2], base: m[3] } : null;
  };

  /* Le « n » de « den » est gardé devant une voyelle ou n, d, t, z, h. */
  LB.nRuleKeeps = function (word) {
    var c = (word || "").charAt(0).toLowerCase().normalize("NFD").replace(DIACRITICS, "");
    return /[aeiouyhdntz]/.test(c);
  };

  /* Mini-balisage pour les textes du contenu : **gras**, *italique*, [[exemple]], [texte](lien). */
  LB.inline = function (text) {
    var h = LB.esc(text);
    h = h.replace(/\[([^\]\[]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    h = h.replace(/\[\[([^\]]+)\]\]/g, '<span class="ex">$1</span>');
    h = h.replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
    return h;
  };
})(window.LB);
