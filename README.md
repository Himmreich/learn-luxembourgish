# Lëtzebuergesch : apprendre le luxembourgeois

Application web d'apprentissage façon Duolingo : QCM et saisie, répétition espacée, série quotidienne, audio,
décomposition mot à mot des phrases, fiches de grammaire. Le contenu est séparé du code pour pouvoir grandir
jusqu'à couvrir toute la langue.

## Organisation

```
site/
  index.html          page (aucun contenu)
  css/style.css       styles
  js/                 le code, un fichier par rôle
    core.js           outils partagés (normalisation, règle du n, balisage des textes)
    content.js        chargement du contenu
    store.js          progression et série (localStorage)
    audio.js          enregistrements du LOD, sinon voix de synthèse
    grammar.js        indices sur les articles, pages de grammaire
    exercises.js      types d'exercices (QCM, saisie...) : on peut en ajouter
    lesson.js         déroulement d'une leçon
    home.js           écran d'accueil
    main.js           démarrage
  content/            TOUT le contenu, en JSON
    manifest.json     sections de l'accueil et pages de grammaire, dans l'ordre d'affichage
    themes/*.json     un fichier par thème (mots et phrases)
    grammar/*.json    une page de grammaire par fichier
    legacy-ids.json   anciens identifiants (migration de la progression, ne pas modifier)
tools/                contrôle du contenu, empaquetage, audio du LOD
tests/smoke.js        test de bout en bout (joue une leçon dans jsdom)
```

## Ajouter du contenu

### Un nouveau thème

1. Créez `site/content/themes/meteo.json` :
   ```json
   {
     "id": "meteo",
     "title": "La météo",
     "items": [
       {"id":"meteo.d-sonn","fr":"Le soleil","lb":"D'Sonn","gender":"f"},
       {"id":"meteo.et-reent","fr":"Il pleut","lb":"Et reent",
        "parts":[["Et","il"],["reent","pleut"]],"note":"Remarque de grammaire facultative."}
     ]
   }
   ```
2. Ajoutez `"meteo"` à la liste `themes` d'une section de `site/content/manifest.json`.
3. Contrôlez : `python3 tools/check_content.py site/content`

### Règles du contenu

- **id** : `<thème>.<mot>` en minuscules sans accents (lettres, chiffres, tirets), unique. Ne le changez plus ensuite :
  la progression des utilisateurs y est attachée.
- **lb** : écrivez le nom **avec son article** (`D'Bank`, `De Kaffi`, `Den Auto`). Le contrôle vérifie la règle du n.
- **gender** : `m`, `f`, `n` ou `pl`, uniquement pour un nom avec article, et seulement si vous en êtes sûr (sinon omettez-le :
  l'app affiche alors une explication générale). Le script d'audio le compare au genre du LOD.
- **parts** : décomposition mot à mot d'une phrase, sous forme de paires `[luxembourgeois, français]`. **note** : remarque de grammaire.
- **Pages de grammaire** (`content/grammar/*.json`) : liste de blocs `h`, `p`, `small`, `examples`, `table`. Dans les textes :
  `**gras**`, `*italique*`, `[[exemple]]`, `[texte](https://lien)`.

### Un nouveau type d'exercice

Enregistrez-le dans `site/js/exercises.js` avec `LB.exercises.register({id, kind, applies, render})`
(voir le commentaire en tête de fichier). Il entre alors dans le tirage des leçons.

## Contrôles et tests

```bash
python3 tools/check_content.py site/content     # valide le contenu (identifiants, règle du n, genres, décompositions)
npm install && npm test                         # contrôle + test de bout en bout (trois modes de chargement)
python3 -m http.server -d site 8080             # tester en local : http://localhost:8080
python3 tools/bundle.py                         # fabrique dist/letzebuergesch-standalone.html (un seul fichier)
```

## Déployer avec Docker

```bash
git clone https://github.com/Himmreich/learn-luxembourgish.git
cd learn-luxembourgish
docker compose up -d --build
```

L'app est alors sur `http://ADRESSE_DU_SERVEUR:8081`.

- **Changer de port** : copiez `.env.example` en `.env` et modifiez `LB_PORT` (8081 par défaut pour ne pas gêner Tomcat sur 8080).
- **Mettre à jour** : `git pull && docker compose up -d --build`
- **Arrêter** : `docker compose down`
- **Installer Docker** s'il manque : `curl -fsSL https://get.docker.com | sh`, puis `sudo usermod -aG docker $USER`.
- La progression est enregistrée dans le navigateur, **par adresse** : gardez la même adresse et le même port.

Le build contrôle d'abord le contenu (il échoue s'il est invalide), l'empaquette dans un seul fichier, puis télécharge les
enregistrements du LOD.

## Les enregistrements du LOD

À la construction de l'image, Docker télécharge le dictionnaire du [Lëtzebuerger Online Dictionnaire](https://lod.lu)
(données ouvertes, licence CC0), retrouve chaque mot et télécharge son enregistrement.

- Le premier build est plus long (quelques minutes) et demande un accès à Internet.
- Les mots sans enregistrement (la plupart des phrases) restent en voix de synthèse. Si le LOD est injoignable, l'image est
  quand même construite, sans enregistrements.
- **Voir le résumé des correspondances** (mots introuvables, genre différent du contenu) :
  `docker compose build --no-cache --progress=plain 2>&1 | grep -A40 "Résumé"`
- **Mettre à jour les enregistrements** : `docker compose build --no-cache && docker compose up -d`.

Sans Docker :
```bash
python3 tools/fetch_lod.py --out data/new_lod-art.xml
python3 tools/build_audio.py --xml data/new_lod-art.xml --content site/content --out build            # vérification
python3 tools/build_audio.py --xml data/new_lod-art.xml --content site/content --out build --download  # téléchargement
cp -r build/audio build/audio-map.json site/
```

## Pour grandir

Le chargement actuel prend tout le contenu en une fois (un seul fichier `all.json` en production). Quand le contenu
atteindra plusieurs milliers d'entrées, l'étape suivante sera de charger les thèmes à la demande et de produire un index
léger au build. Les niveaux (A1 à B2), les parcours et un serveur de progression sont aussi prévus par cette organisation :
le contenu ne dépend pas du code.

## Sources et licences

Les enregistrements et les données du LOD sont sous licence CC0 (Zenter fir d'Lëtzebuerger Sprooch).
Le vocabulaire et les explications de l'app doivent être relus par un locuteur natif : en cas de doute, la référence
est [lod.lu](https://lod.lu).
