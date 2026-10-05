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

## Ajouter les vrais enregistrements du LOD (facultatif)

Sans enregistrements, l'app utilise la voix de synthèse de l'appareil (approximative pour le luxembourgeois).
Les enregistrements du [Lëtzebuerger Online Dictionnaire](https://lod.lu) sont publiés en open data (licence CC0).

1. Téléchargez le fichier du dictionnaire (voir « linguistesch Daten » sur
   [data.public.lu](https://data.public.lu/fr/datasets/letzebuerger-online-dictionnaire-lod-linguistesch-daten/))
   et décompressez-le pour obtenir `data/new_lod-art.xml` (ce dossier n'est pas versionné, il pèse 100 Mo).
2. Vérifiez les correspondances (rien n'est téléchargé) :
   ```bash
   python3 tools/build_audio.py --xml data/new_lod-art.xml --words tools/words.json --out build
   ```
   Lisez le résumé, et `build/report.csv` pour le détail (mots introuvables, genre différent...).
3. Téléchargez les audios :
   ```bash
   python3 tools/build_audio.py --xml data/new_lod-art.xml --words tools/words.json --out build --download
   ```
4. Copiez le résultat dans le site, puis versionnez-le et redéployez :
   ```bash
   cp -r build/audio build/audio-map.json site/
   git add site && git commit -m "Ajout des enregistrements du LOD" && git push
   docker compose up -d --build
   ```

Quand l'app gagne de nouveaux mots, `tools/words.json` doit être mis à jour (la liste des mots et phrases de l'app).

## Option : image prête à l'emploi sur ghcr.io

Le workflow `.github/workflows/docker.yml` construit l'image à chaque push sur `main` et la publie sur
`ghcr.io/himmreich/learn-luxembourgish`. Il faut rendre le paquet public (GitHub, onglet Packages, réglages du paquet).
Le serveur n'a alors plus besoin du code : `docker compose pull && docker compose up -d`.
L'image est construite pour des machines de type PC (amd64).

## Structure

```
site/            la page (index.html), et audio/ + audio-map.json si générés
tools/           script de téléchargement des enregistrements et liste des mots
Dockerfile       nginx qui sert le dossier site/
docker-compose.yml
nginx.conf
```

## Sources et licences

Les enregistrements et les données du LOD sont sous licence CC0 (Zenter fir d'Lëtzebuerger Sprooch).
Le vocabulaire et les explications de l'app doivent être relus par un locuteur natif : en cas de doute, la référence
est [lod.lu](https://lod.lu).
