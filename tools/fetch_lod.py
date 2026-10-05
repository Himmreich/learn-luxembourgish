#!/usr/bin/env python3
"""
Télécharge le dictionnaire le plus récent du LOD (data.public.lu, licence CC0)
et en extrait le fichier XML.

    python3 tools/fetch_lod.py --out data/new_lod-art.xml
"""
import argparse
import io
import json
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

API = "https://data.public.lu/api/1/datasets/letzebuerger-online-dictionnaire-lod-linguistesch-daten/"


def get(url, timeout):
    req = urllib.request.Request(url, headers={"User-Agent": "letzebuergesch-perso/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="chemin du fichier XML à créer")
    ap.add_argument("--api", default=API, help="adresse de l'API du jeu de données")
    args = ap.parse_args()

    data = json.loads(get(args.api, 60))
    zips = [r for r in data.get("resources", [])
            if r.get("title", "").lower().endswith(".zip") and "lod-art" in r["title"].lower()]
    if not zips:
        sys.exit("Aucune archive du dictionnaire trouvée dans le jeu de données.")
    # Les noms commencent par la date (AAMMJJ) : le plus grand est le plus récent.
    latest = max(zips, key=lambda r: r["title"])
    print(f"Archive retenue : {latest['title']} ({latest.get('filesize', '?')} octets)", flush=True)

    blob = get(latest["url"], 600)
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        xmls = [n for n in z.namelist() if n.lower().endswith(".xml")]
        if not xmls:
            sys.exit("Pas de fichier XML dans l'archive.")
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        with z.open(xmls[0]) as src, open(out, "wb") as dst:
            shutil.copyfileobj(src, dst)
    print(f"Dictionnaire extrait : {args.out}", flush=True)


if __name__ == "__main__":
    main()
