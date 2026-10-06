/* Progression : boîtes de répétition espacée par mot, série quotidienne (localStorage). */
(function (LB) {
  "use strict";

  var KEY = "letzebuergesch-v2", OLD_KEY = "letzebuergesch-v1";
  var S = LB.store = { state: { streak: 0, last: "", boxes: {} } };

  function read(key) {
    try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  function dayStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* À appeler après le chargement du contenu (la migration a besoin des anciens identifiants). */
  S.load = function () {
    var v2 = read(KEY);
    if (v2) { S.state = Object.assign({ streak: 0, last: "", boxes: {} }, v2); return; }
    var v1 = read(OLD_KEY);
    if (v1) {
      var legacy = LB.content.legacy || {}, boxes = {};
      Object.keys(v1.boxes || {}).forEach(function (k) { if (legacy[k]) boxes[legacy[k]] = v1.boxes[k]; });
      S.state = { streak: v1.streak || 0, last: v1.last || "", boxes: boxes };
      S.save();
    }
  };

  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) {}
  };

  S.box = function (id) { return S.state.boxes[id] || 0; };
  S.setBox = function (id, n) { S.state.boxes[id] = n; };

  S.streakNow = function () {
    if (!S.state.last) return 0;
    var y = new Date(); y.setDate(y.getDate() - 1);
    return (S.state.last === dayStr(new Date()) || S.state.last === dayStr(y)) ? S.state.streak : 0;
  };

  S.markDay = function () {
    var today = dayStr(new Date());
    if (S.state.last === today) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    S.state.streak = (S.state.last === dayStr(y)) ? S.state.streak + 1 : 1;
    S.state.last = today;
  };

  S.reset = function () { S.state = { streak: 0, last: "", boxes: {} }; S.save(); };
})(window.LB);
