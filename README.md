# Lëtzebuergesch : apprendre le luxembourgeois

Petite web app d'apprentissage façon Duolingo : QCM et saisie, répétition espacée, série quotidienne, audio,
thèmes du quotidien, banque et informatique, fiche sur les articles (de, den, d').

## Déployer avec Docker

Sur le serveur (Docker et le plugin Compose sont nécessaires) :

```bash
git clone https://github.com/Himmreich/learn-luxembourgish.git
cd learn-luxembourgish
docker compose up -d --build
```

L'app est alors disponible sur `http://ADRESSE_DU_SERVEUR:8081`.

- **Changer de port** : copiez `.env.example` en `.env` et modifiez `LB_PORT`. Le port par défaut est 8081 pour ne pas
  entrer en conflit avec Tomcat (8080).
- **Mettre à jour** : `git pull && docker compose up -d --build`
- **Arrêter** : `docker compose down`
- **Installer Docker** s'il manque : `curl -fsSL https://get.docker.com | sh`, puis `sudo usermod -aG docker $USER`
  et reconnectez-vous.

La progression est enregistrée dans le navigateur, **par adresse** : gardez la même adresse et le même port.

## Les enregistrements du LOD sont ajoutés automatiquement

À la construction de l'image, Docker télécharge le dictionnaire du
[Lëtzebuerger Online Dictionnaire](https://lod.lu) (données ouvertes, licence CC0), retrouve chaque mot de l'app et
télécharge son enregistrement. Il n'y a rien d'autre à faire : `docker compose up -d --build` suffit.

- Le premier build est plus long (quelques minutes) et nécessite un accès à Internet.
- Les mots sans enregistrement (la plupart des phrases) restent en voix de synthèse.
- Si le LOD est injoignable pendant le build, l'image est quand même construite, sans enregistrements.
- **Voir le résumé des correspondances** (mots introuvables, genre différent...) :
  `docker compose build --no-cache --progress=plain 2>&1 | grep -A40 "Résumé"`
- **Mettre à jour les enregistrements** (nouvelle version du dictionnaire, nouveaux mots) :
  `docker compose build --no-cache && docker compose up -d`. Sans `--no-cache`, Docker réutilise l'étape déjà construite
  tant que `tools/` et `site/index.html` n'ont pas changé.
- Les mots sont lus directement dans `site/index.html` : aucune liste à maintenir à part.

### Sans Docker (facultatif)

```bash
python3 tools/fetch_lod.py --out data/new_lod-art.xml
python3 tools/build_audio.py --xml data/new_lod-art.xml --html site/index.html --out build            # vérification
python3 tools/build_audio.py --xml data/new_lod-art.xml --html site/index.html --out build --download  # téléchargement
cp -r build/audio build/audio-map.json site/
```

## Option : image prête à l'emploi sur ghcr.io

Le workflow `.github/workflows/docker.yml` construit l'image à chaque push sur `main` et la publie sur
`ghcr.io/himmreich/learn-luxembourgish`. Il faut rendre le paquet public (GitHub, onglet Packages, réglages du paquet).
Le serveur n'a alors plus besoin du code : `docker compose pull && docker compose up -d`.
L'image est construite pour des machines de type PC (amd64).

## Structure

```
site/            la page (index.html), et audio/ + audio-map.json si générés
tools/           scripts de téléchargement du dictionnaire et des enregistrements
Dockerfile       nginx qui sert le dossier site/
docker-compose.yml
nginx.conf
```

## Sources et licences

Les enregistrements et les données du LOD sont sous licence CC0 (Zenter fir d'Lëtzebuerger Sprooch).
Le vocabulaire et les explications de l'app doivent être relus par un locuteur natif : en cas de doute, la référence
est [lod.lu](https://lod.lu).
