# Lëtzebuergesch : instructions pour Claude Code

Application web d'apprentissage du luxembourgeois (façon Duolingo), en français. Statique : HTML + CSS + JavaScript sans
framework, servie par nginx dans Docker. Le contenu (mots, phrases, grammaire) est séparé du code. Lisez `README.md` pour
les commandes et la structure.

## Commandes

```bash
python3 tools/check_content.py site/content   # contrôle du contenu (à lancer après toute modification du contenu)
npm install && npm test                       # contrôle + test de bout en bout dans jsdom (3 modes de chargement)
python3 -m http.server -d site 8080           # essai local : http://localhost:8080
python3 tools/bundle.py                       # version autonome : dist/letzebuergesch-standalone.html
docker compose up -d --build                  # image de production (port 8081)
```

Avant de proposer un commit : `npm test` doit passer.

## Règles pour le contenu (important)

- **Ne jamais inventer de luxembourgeois.** La langue est peu documentée et les erreurs coûtent cher à un apprenant. Vérifiez
  chaque mot et chaque phrase dans une source fiable (lod.lu, data.public.lu, Wiktionary, omniglot, textes officiels du
  chd.lu...). Si vous n'êtes pas sûr, **ne l'ajoutez pas** (ou ajoutez-le et signalez-le clairement à l'utilisateur).
- Un nom s'écrit **avec son article** dans `lb` : `D'Bank`, `De Kaffi`, `Den Auto`. Règle du n : `Den` devant une voyelle ou
  n, d, t, z, h, sinon `De`. Le contrôle vérifie cela.
- `gender` (`m`, `f`, `n`, `pl`) : seulement si le genre est certain. Sinon, l'omettre (l'app affiche alors une explication
  générale). Le script d'audio compare ce genre à celui du LOD.
- **Les `id` sont définitifs** (`<thème>.<mot>` en minuscules sans accents). La progression des utilisateurs (localStorage)
  s'appuie dessus. Ne jamais en renommer. `legacy-ids.json` sert à migrer l'ancien format : ne pas le modifier.
- Les phrases ont une décomposition `parts` (paires `[luxembourgeois, français]`) et si besoin une `note` de grammaire.
- Règle du n aussi pour les verbes : `ech sinn` devant voyelle ou n, d, t, z, h, sinon `ech si` ; `ech hunn` / `ech hu`.
  La saisie de l'utilisateur tolère déjà ces variantes (`LB.sameAnswer`).
- Après avoir ajouté du contenu, résumez à l'utilisateur ce qui est vérifié et ce qui est incertain.

### Éléments à faire relire par un locuteur natif

Construits par analogie, non confirmés dans une source : `Wéi al sidd Dir?`, `Hutt Dir Kanner?`, `Wou schafft Dir?`,
`Huelt Dir e Kaffi?`, `Wat wëllt Dir drénken?`, `Wéini ass déi nächst Reunioun?`, `Wat denkt Dir doriwwer?`,
`Kënnt Dir dat erklären?`, `Maache mir eng Paus?`, `Véierel` (écrit aussi `Véirel`), `Moies`, `Nomëttes`, `Haut`, `Muer`.
Les genres `gender` des noms hors liste vérifiée sont volontairement omis (Client, Solde, Montant, Fichier, Netzwierk...).

## Architecture

- `site/js/` : un fichier par rôle, espace de noms global `LB` (pas de modules ES, pour pouvoir tout regrouper en un fichier).
  L'ordre de chargement est celui de `site/index.html`.
- `site/js/exercises.js` : registre des types d'exercices (`LB.exercises.register`). Pour un nouveau type d'exercice
  (remise en ordre, écoute, choix de l'article...), enregistrez-en un nouveau : il entre dans le tirage des leçons.
- `site/content/` : `manifest.json` (sections de l'accueil et pages de grammaire), `themes/*.json`, `grammar/*.json`.
  Dans les textes : `**gras**`, `*italique*`, `[[exemple]]`, `[texte](https://lien)`.
- Chargement du contenu : `content/all.json` (produit au build Docker) sinon fichiers séparés ; la version autonome embarque tout.
- `tools/build_audio.py` : relie les mots au LOD (CC0) et télécharge les enregistrements au build Docker. Le build continue
  sans enregistrements si le LOD est injoignable.
- Version affichée : `LB.VERSION` dans `site/js/core.js` (à incrémenter à chaque livraison).

## Style de code

- JavaScript simple (ES2015+), sans dépendance, un fichier = une responsabilité, commentaires en français.
- Mobile d'abord (l'app est surtout utilisée sur téléphone), thème clair/sombre via variables CSS, zones de sécurité iOS.
- Textes de l'interface en français, ton direct et chaleureux.

## Pistes d'évolution

Chargement des thèmes à la demande avec un index léger (quand le contenu dépassera quelques milliers d'entrées),
niveaux A1 à B2 et parcours, pages de grammaire (verbes `sinn` et `hunn`, prépositions et datif), exercice « de, den ou d' ? »,
exercice de remise en ordre des mots d'une phrase, progression partagée entre appareils (petit serveur + SQLite).
