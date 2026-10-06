/* Démarrage : navigation entre les écrans, puis chargement du contenu. */
(function (LB) {
  "use strict";

  LB.go = {
    home: function () { LB.home.show(); },
    grammar: function (id) { LB.grammar.show(id); },
    lesson: function (items) { LB.lesson.start(items); }
  };

  LB.content.load()
    .then(function () {
      LB.store.load();
      LB.audio.init(function () { LB.home.updateCredit(); });
      LB.go.home();
    })
    .catch(function (e) {
      LB.$("#app").innerHTML =
        "<h2>Impossible de charger le contenu</h2>" +
        '<p class="sub">' + LB.esc(String(e && e.message || e)) + "</p>" +
        '<p class="sub">Si vous ouvrez le fichier directement, servez le dossier avec un serveur web : <code>python3 -m http.server -d site</code></p>';
    });
})(window.LB);
