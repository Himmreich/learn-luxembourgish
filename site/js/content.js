/* Contenu : charge le manifeste, les thèmes et la grammaire (fichiers JSON du dossier content/). */
(function (LB) {
  "use strict";

  var C = LB.content = {
    sections: [],          // [{id, title, subtitle, themes:[thème]}]
    themes: new Map(),     // id -> thème {id, title, items}
    items: new Map(),      // id -> mot ou phrase {id, fr, lb, gender?, parts?, note?, themeId}
    grammar: new Map(),    // id -> page de grammaire
    grammarOrder: [],
    legacy: {}             // anciens identifiants -> nouveaux (migration de la progression)
  };

  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " : " + r.status);
      return r.json();
    });
  }

  /* Mode développement : un fichier par thème. */
  function loadParts() {
    return getJSON("content/manifest.json").then(function (manifest) {
      var themeIds = [].concat.apply([], manifest.sections.map(function (s) { return s.themes; }));
      return Promise.all([
        Promise.all(themeIds.map(function (id) { return getJSON("content/themes/" + id + ".json"); })),
        Promise.all((manifest.grammar || []).map(function (id) { return getJSON("content/grammar/" + id + ".json"); })),
        getJSON("content/legacy-ids.json").catch(function () { return {}; })
      ]).then(function (r) {
        var themes = {}, grammar = {};
        r[0].forEach(function (t) { themes[t.id] = t; });
        r[1].forEach(function (g) { grammar[g.id] = g; });
        return { manifest: manifest, themes: themes, grammar: grammar, legacy: r[2] };
      });
    });
  }

  function index(data) {
    C.sections = data.manifest.sections.map(function (s) {
      return {
        id: s.id, title: s.title, subtitle: s.subtitle || "",
        themes: s.themes.map(function (id) { return data.themes[id]; }).filter(Boolean)
      };
    });
    C.sections.forEach(function (s) {
      s.themes.forEach(function (t) {
        C.themes.set(t.id, t);
        t.items.forEach(function (it) { it.themeId = t.id; C.items.set(it.id, it); });
      });
    });
    C.grammarOrder = (data.manifest.grammar || []).filter(function (id) { return data.grammar[id]; });
    C.grammarOrder.forEach(function (id) { C.grammar.set(id, data.grammar[id]); });
    C.legacy = data.legacy || {};
  }

  /* Contenu empaqueté (version autonome ou all.json produit par le build), sinon fichiers séparés. */
  C.load = function () {
    var source = window.LB_PACKED
      ? Promise.resolve(window.LB_PACKED)
      : getJSON("content/all.json").catch(function () { return loadParts(); });
    return source.then(index);
  };

  C.allItems = function () { return Array.from(C.items.values()); };

  /* Mauvaises réponses plausibles : du même thème d'abord, sinon de tout le contenu. */
  C.distractors = function (item, field, count) {
    var theme = C.themes.get(item.themeId);
    var same = theme ? theme.items.filter(function (x) { return x.id !== item.id; }) : [];
    var pool = same.length >= count ? same : C.allItems().filter(function (x) { return x.id !== item.id; });
    var seen = {}; seen[item[field]] = true;
    var out = [];
    LB.shuffle(pool).forEach(function (x) {
      if (out.length < count && !seen[x[field]]) { seen[x[field]] = true; out.push(x[field]); }
    });
    return out;
  };
})(window.LB);
