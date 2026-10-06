/*
 * Test de bout en bout : charge l'app dans jsdom (comme un navigateur) et joue une leçon complète.
 * Trois modes : fichiers séparés, contenu empaqueté (all.json) et version autonome (bundle).
 *     npm install && npm test
 */
const { JSDOM, ResourceLoader } = require("jsdom");
const assert = require("assert");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const PORT = 18200;
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond, what, timeout = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (cond()) return; } catch (e) { /* pas prêt */ }
    await tick(25);
  }
  throw new Error("Délai dépassé : " + what);
}

function startServer(dir) {
  const p = spawn("python3", ["-m", "http.server", String(PORT), "-d", dir, "--bind", "127.0.0.1"], { stdio: "ignore" });
  return p;
}

/* Ne charge que les fichiers locaux (pas les polices Google). */
class LocalOnly extends ResourceLoader {
  fetch(url, options) {
    return url.startsWith("http://127.0.0.1") ? super.fetch(url, options) : Promise.resolve(Buffer.from(""));
  }
}

async function boot(opts) {
  const options = {
    runScripts: "dangerously", resources: new LocalOnly(), pretendToBeVisual: true,
    beforeParse(window) {
      window.fetch = (u, o) => fetch(new URL(u, window.location.href), o);
      window.scrollTo = () => {};
      window.confirm = () => true;
      Object.entries(opts.storage || {}).forEach(([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)));
    },
  };
  const dom = opts.file
    ? await JSDOM.fromFile(opts.file, Object.assign(options, { url: "http://127.0.0.1:" + PORT + "/" }))
    : await JSDOM.fromURL(opts.url, options);
  const w = dom.window;
  await waitFor(() => w.document.querySelector(".hero"), "affichage de l'accueil");
  return w;
}

/* Répond à la question affichée. ok=false : donne volontairement une mauvaise réponse. */
async function answer(w, themeId, ok) {
  const d = w.document, LB = w.LB;
  const prompt = d.querySelector(".prompt").textContent;
  const items = themeId ? LB.content.themes.get(themeId).items : LB.content.allItems();
  const item = items.find((it) => it.fr === prompt || it.lb === prompt);
  assert(item, "mot introuvable pour la question « " + prompt + " »");
  const typed = d.querySelector("#inp");
  if (typed) {
    typed.value = ok ? item.lb : "zzzz";
    typed.dispatchEvent(new w.Event("input"));
    d.querySelector("#check").click();
  } else {
    const wanted = prompt === item.fr ? item.lb : item.fr;
    const buttons = [...d.querySelectorAll(".choice")];
    assert.strictEqual(buttons.length, 4, "4 propositions attendues");
    const target = ok ? buttons.find((b) => b.textContent === wanted)
                      : buttons.find((b) => b.textContent !== wanted);
    assert(target, "bonne réponse absente des propositions");
    target.click();
  }
  const sheet = d.querySelector("#sheet");
  assert(sheet.classList.contains(ok ? "good" : "bad"), "feuille de correction " + (ok ? "verte" : "rouge"));
  assert(d.querySelector("#hear").textContent.includes(item.lb), "bouton d'écoute");
  if (item.parts) assert(d.querySelector("#parts").textContent.includes("Décomposition"), "décomposition affichée");
  return item;
}

async function testLesson(w, label) {
  const d = w.document, LB = w.LB;
  assert.strictEqual(d.querySelectorAll(".theme").length, LB.content.themes.size, label + " : un bouton par thème");
  assert.strictEqual(d.querySelectorAll(".theme").length, 24, label + " : 24 thèmes");
  assert.strictEqual(d.querySelectorAll(".gram").length, 1, label + " : une page de grammaire");
  assert(d.querySelector(".stats").textContent.includes("0/" + LB.content.items.size), label + " : mots maîtrisés");
  assert.strictEqual(d.querySelectorAll("h2").length, 5, label + " : 5 sections");

  d.querySelector('[data-theme="salut"]').click();
  await waitFor(() => d.querySelector(".prompt"), "première question");

  let asked = 0, swapped = false, wrongDone = false;
  while (!d.querySelector(".done")) {
    asked++;
    assert(asked <= 20, "trop de questions");
    if (!swapped && d.querySelector("#swap")) {            // bascule QCM <-> saisie
      const before = d.querySelector("#inp") ? "typed" : "choice";
      d.querySelector("#swap").click();
      assert.strictEqual(!!d.querySelector("#inp"), before === "choice", "la bascule change le type d'exercice");
      d.querySelector("#swap").click();
      assert.strictEqual(!!d.querySelector("#inp"), before === "typed", "la bascule revient en arrière");
      swapped = true;
    }
    const ok = wrongDone || asked > 1;
    await answer(w, "salut", ok);
    if (!ok) wrongDone = true;
    d.querySelector("#next").click();
  }
  assert.strictEqual(asked, 9, label + " : 8 questions + 1 reprise de l'erreur");
  assert.strictEqual(d.querySelector(".score").textContent, "7/8", label + " : score du premier coup");
  assert(swapped, label + " : une bascule a été testée");
  const saved = JSON.parse(w.localStorage.getItem("letzebuergesch-v2"));
  assert.strictEqual(saved.streak, 1, "série enregistrée");
  assert.strictEqual(Object.keys(saved.boxes).length, 8, "8 mots suivis");

  d.querySelector("#back").click();
  await waitFor(() => d.querySelector(".hero"), "retour à l'accueil");
  assert(d.querySelector(".stats").textContent.includes("1"), "série affichée");
}

async function testPages(w, label) {
  const d = w.document;
  d.querySelector(".gram").click();
  await waitFor(() => d.querySelector(".gtext"), "page de grammaire");
  assert(d.querySelector("h1").textContent.includes("de, den"), label + " : titre de grammaire");
  assert.strictEqual(d.querySelectorAll(".art tr").length, 5, "tableau des articles");
  assert(d.querySelectorAll(".art td.acc").length === 4, "colonne mise en avant");
  assert(d.querySelector(".gtext a[href='https://lod.lu']"), "lien lod.lu");
  d.querySelector("#gback").click();
  await waitFor(() => d.querySelector(".hero"), "retour de la grammaire");

  d.querySelector("#rev").click();                         // révision mixte
  await waitFor(() => d.querySelector(".prompt"), "révision mixte");
  await answer(w, null, true);
  d.querySelector("#quit").click();                        // quitter (confirm simulé)
  await waitFor(() => d.querySelector(".hero"), "quitter la leçon");
}

function testUnits(w) {
  const LB = w.LB;
  assert(LB.sameAnswer("Ech sinn krank", "Ech si krank"), "sinn accepté pour si");
  assert(LB.sameAnswer("ech wunne zu letzebuerg", "Ech wunnen zu Lëtzebuerg"), "n final et accents tolérés");
  assert(LB.sameAnswer("Wain", "De Wäin"), "article facultatif");
  assert(!LB.sameAnswer("Ech si gesond", "Ech si krank"), "mauvaise réponse refusée");
  assert.strictEqual(JSON.stringify(LB.splitArticle("Den Zuch")), '{"art":"Den","base":"Zuch"}');
  assert.strictEqual(LB.splitArticle("Ech si midd"), null);
  assert(LB.nRuleKeeps("Auto") && LB.nRuleKeeps("Zuch") && !LB.nRuleKeeps("Wäin"), "règle du n");
  const get = (id) => LB.content.items.get(id);
  assert(LB.grammar.hint(get("manger.d-brout")).includes("neutre"), "genre neutre affiché");
  assert(LB.grammar.hint(get("manger.de-wain")).includes("masculin"), "masculin affiché");
  assert(LB.grammar.hint(get("transport.den-auto")).includes("voyelle"), "den devant voyelle");
  assert.strictEqual(LB.grammar.hint(get("salut.moien")), "", "pas d'indice pour un mot sans article");
  assert(LB.inline("**a** [[b]] [c](https://x.y)").includes("<b>a</b>"), "balisage du contenu");
  assert.strictEqual(LB.splitArticle("Dezember"), null, "« Dezember » n'est pas « De » + « zember »");
  assert.strictEqual(LB.splitArticle("Denken"), null, "« Denken » n'est pas « Den » + « ken »");
  assert.strictEqual(JSON.stringify(LB.splitArticle("D'Bank")), '{"art":"D\'","base":"Bank"}');
  assert(LB.grammar.partsHtml(get("nombres2.siwwenzeg")).includes("pnote"), "note affichée sans décomposition");
  assert(!LB.grammar.partsHtml(get("nombres2.siwwenzeg")).includes("Décomposition"), "pas de titre de décomposition sans parts");
  assert(LB.grammar.partsHtml(get("heure.et-ass-halwer-drai")).includes("halwer"), "décomposition de l'heure");
  assert(LB.grammar.hint(get("jours.den-donneschdeg")).includes("den"), "den devant d");
  assert(LB.grammar.hint(get("jours.de-meindeg")).includes("de"), "de devant m");
  assert(LB.grammar.hint(get("temps.d-joer")).includes("neutre"), "genre de d'Joer");
  assert.strictEqual(get("reunion.d-reunioun").gender, "f", "vocabulaire des réunions");
  assert(get("reunion-phrases.ech-hunn-eng-fro").parts.length === 4, "phrases de réunion décomposées");
  assert.strictEqual(get("cafe.hels-du-e-kaffi").fr, "Est-ce que tu prends un café ?", "phrase « tu prends un café »");
  assert.strictEqual(get("cafe.ech-well-e-kaffi-huelen").parts.length, 5, "« je veux prendre un café » décomposé");
  assert(LB.sameAnswer("Hels du e kaffi", "Hëls du e Kaffi?"), "accents et ponctuation tolérés à la saisie");
  LB.audio.map = { Moien: "audio/moien.m4a" };
  assert.strictEqual(LB.audio.note("Moien"), "", "pas de note si enregistrement");
  assert(LB.audio.credit().includes("LOD"), "mention du LOD");
  LB.audio.map = {};
}

async function testMigration(opts) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  const day = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
  const w = await boot(Object.assign({}, opts, {
    storage: { "letzebuergesch-v1": { streak: 2, last: day, boxes: { "salut:0": 3, "manger:1": 2 } } },
  }));
  assert.strictEqual(w.LB.store.box("salut.moien"), 3, "progression migrée (Moien)");
  assert.strictEqual(w.LB.store.box("manger.d-waasser"), 2, "progression migrée (Waasser)");
  assert.strictEqual(w.LB.store.state.streak, 2, "série migrée");
  assert(w.localStorage.getItem("letzebuergesch-v2"), "nouvelle sauvegarde écrite");
  w.close();
}

async function run(label, opts) {
  const w = await boot(opts);
  testUnits(w);
  await testLesson(w, label);
  await testPages(w, label);
  w.close();
  await testMigration(opts);
  console.log("ok  " + label);
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lb-"));
  let server;
  try {
    // 1. Fichiers séparés (mode développement)
    server = startServer(path.join(root, "site"));
    await tick(700);
    await run("fichiers séparés", { url: "http://127.0.0.1:" + PORT + "/" });
    server.kill();

    // 2. Contenu empaqueté (all.json), comme dans l'image Docker
    const site2 = path.join(tmp, "site");
    fs.cpSync(path.join(root, "site"), site2, { recursive: true });
    execFileSync("python3", [path.join(root, "tools/pack_content.py"), path.join(site2, "content"), "--out", path.join(site2, "content/all.json")], { stdio: "ignore" });
    server = startServer(site2);
    await tick(700);
    await run("contenu empaqueté", { url: "http://127.0.0.1:" + PORT + "/" });
    server.kill();

    // 3. Version autonome (un seul fichier)
    const standalone = path.join(tmp, "standalone.html");
    execFileSync("python3", [path.join(root, "tools/bundle.py"), "--site", path.join(root, "site"), "--out", standalone], { stdio: "ignore" });
    await run("version autonome", { file: standalone });
    console.log("\nTous les tests passent.");
  } catch (e) {
    console.error("\nÉCHEC :", e.message);
    process.exitCode = 1;
  } finally {
    if (server) server.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
