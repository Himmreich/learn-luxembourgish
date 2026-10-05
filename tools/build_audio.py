#!/usr/bin/env python3
"""
Associe les mots de l'app Lëtzebuergesch aux entrées du LOD (données CC0)
et télécharge leurs enregistrements audio.

Étape 1 (sans rien télécharger, pour vérifier les correspondances) :
    python3 build_audio.py --xml data/new_lod-art.xml --words words.json --out out

Étape 2 (télécharge les audios) :
    python3 build_audio.py --xml data/new_lod-art.xml --words words.json --out out --download

Résultat dans le dossier out/ :
    report.csv        un mot par ligne : statut, entrée du LOD trouvée, genre, traductions
    audio-map.json    mot luxembourgeois -> fichier audio (à côté de letzebuergesch.html)
    audio/*.m4a       les enregistrements
Seule la bibliothèque standard de Python 3 est utilisée.
"""
import argparse
import csv
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

AUDIO_URL = "https://lod.lu/uploads/AAC/{id}.m4a"
EXAMPLE_URL = "https://lod.lu/uploads/examples/AAC/{p}/{id}.m4a"
REGISTERS = {"EGS", "FAM", "GEHUEW", "KANNERSPROOCH", "NEOL", "PEJ", "VEREELZT", "VULG"}
NOUN_RE = re.compile(r"(Den|De|D')\s?([^\s,?!…]+)")


def key(text):
    """Forme de comparaison : minuscules, lettres et chiffres seulement."""
    text = unicodedata.normalize("NFC", text or "").lower()
    return re.sub(r"[\W_]+", "", text)


def registers_of(entry):
    """Repère les marques de registre (familier, vulgaire, vieilli...) hors exemples."""
    found = set()

    def walk(el):
        if el.tag == "examples":
            return
        if el.tag.upper() in REGISTERS:
            found.add(el.tag.upper())
        for name in el.attrib:
            if name.upper() in REGISTERS:
                found.add(name.upper())
        for child in el:
            walk(child)

    walk(entry)
    return sorted(found)


def parse_lod(xml_path):
    lemmas = {}    # clé du lemme -> liste d'entrées
    examples = {}  # clé du texte de la phrase -> id de l'exemple
    count = 0
    for _, el in ET.iterparse(xml_path, events=("end",)):
        if el.tag != "entry":
            continue
        count += 1
        pos = el.find(".//partOfSpeech")
        fr = []
        for tl in el.iter("targetLanguage"):
            if tl.get("lang") == "fr":
                t = (tl.findtext("translation") or "").strip()
                if t:
                    fr.append(t)
        info = {
            "id": el.get("id") or "",
            "lemma": (el.findtext("lemma") or "").strip(),
            "gen": (pos.get("gen") if pos is not None else "") or "",
            "pos": (pos.text.strip() if pos is not None and pos.text else ""),
            "fr": fr,
            "registers": registers_of(el),
        }
        if info["id"] and info["lemma"]:
            lemmas.setdefault(key(info["lemma"]), []).append(info)
        for ex in el.iter("example"):
            ex_id = ex.get("id")
            text_el = ex.find("text")
            if ex_id and text_el is not None:
                examples.setdefault(key("".join(text_el.itertext())), ex_id)
        el.clear()
    return lemmas, examples, count


def pick_candidate(cands, fr_text, expected_gen):
    """Choisit la meilleure entrée parmi des homographes."""
    fr_key = key(fr_text)
    scored = []
    for c in cands:
        score = 0
        if any(key(t) and key(t) in fr_key for t in c["fr"]):
            score += 2
        if expected_gen and c["gen"] in expected_gen:
            score += 1
        scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    best_score = scored[0][0]
    ties = [c for s, c in scored if s == best_score]
    return scored[0][1], len(ties) > 1


def match_word(word, lemmas, examples):
    lb, fr = word["lb"], word["fr"]
    m = NOUN_RE.fullmatch(lb)
    if m:
        art, base = m.groups()
        expected = {"M"} if art in ("De", "Den") else {"F", "N"}
    else:
        art, base, expected = None, lb, set()

    cands = lemmas.get(key(base), [])
    if cands:
        best, ambiguous = pick_candidate(cands, fr, expected)
        status = "ok"
        note = ""
        if best["gen"] in ("M", "F", "N") and expected and best["gen"] not in expected:
            status = "genre different"
            note = f"article de l'app : {art} ; genre du LOD : {best['gen']}"
        elif ambiguous:
            status = "ambigu"
            note = f"{len(cands)} entrées possibles, la première est retenue"
        return {"status": status, "note": note, "entry": best,
                "audio_url": AUDIO_URL.format(id=best["id"].lower()), "audio_id": best["id"].lower()}

    ex_id = examples.get(key(lb))
    if ex_id:
        return {"status": "exemple", "note": "phrase identique à un exemple du LOD", "entry": None,
                "audio_url": EXAMPLE_URL.format(p=ex_id[:2].lower(), id=ex_id.lower()),
                "audio_id": "ex-" + ex_id.lower()}
    return {"status": "introuvable", "note": "", "entry": None, "audio_url": None, "audio_id": None}


def download(url, dest, pause=0.25):
    if dest.exists() and dest.stat().st_size > 0:
        return "deja la"
    req = urllib.request.Request(url, headers={"User-Agent": "letzebuergesch-perso/1.0"})
    for attempt in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if not data:
                return "vide"
            dest.write_bytes(data)
            time.sleep(pause)
            return "telecharge"
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return "pas d'audio (404)"
            err = f"erreur HTTP {e.code}"
        except Exception as e:  # réseau, délai dépassé...
            err = f"erreur réseau ({type(e).__name__})"
        time.sleep(1)
    return err


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--xml", required=True, help="fichier new_lod-art.xml du LOD")
    ap.add_argument("--words", required=True, help="words.json exporté depuis l'app")
    ap.add_argument("--out", default="out", help="dossier de sortie")
    ap.add_argument("--download", action="store_true", help="télécharge réellement les audios")
    args = ap.parse_args()

    out = Path(args.out)
    (out / "audio").mkdir(parents=True, exist_ok=True)
    words = json.loads(Path(args.words).read_text(encoding="utf-8"))

    print("Lecture du dictionnaire (une minute environ)...", flush=True)
    lemmas, examples, n = parse_lod(args.xml)
    print(f"{n} entrées lues, {len(examples)} phrases d'exemple.", flush=True)

    rows, audio_map = [], {}
    for w in words:
        r = match_word(w, lemmas, examples)
        audio_status = ""
        if args.download and r["audio_url"]:
            dest = out / "audio" / f"{r['audio_id']}.m4a"
            audio_status = download(r["audio_url"], dest)
            if audio_status in ("telecharge", "deja la"):
                audio_map[w["lb"]] = f"audio/{r['audio_id']}.m4a"
        e = r["entry"]
        rows.append({
            "theme": w["theme"], "lb": w["lb"], "fr": w["fr"], "statut": r["status"], "remarque": r["note"],
            "id_lod": (e["id"] if e else r["audio_id"] or ""), "lemme": e["lemma"] if e else "",
            "genre_lod": e["gen"] if e else "", "type": e["pos"] if e else "",
            "traductions_fr": " | ".join(e["fr"][:4]) if e else "",
            "registre": " ".join(e["registers"]) if e else "", "audio": audio_status,
        })

    with open(out / "report.csv", "w", newline="", encoding="utf-8-sig") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)
    if args.download:
        (out / "audio-map.json").write_text(json.dumps(audio_map, ensure_ascii=False, indent=1), encoding="utf-8")

    from collections import Counter
    print("\nRésumé des correspondances :", dict(Counter(r["statut"] for r in rows)))
    if args.download:
        print("Résumé des audios :", dict(Counter(r["audio"] or "-" for r in rows)))
        print(f"{len(audio_map)} mots ont un audio dans {out}/audio-map.json")
    for title, st in (("A VERIFIER : genre different", "genre different"), ("A VERIFIER : ambigus", "ambigu"),
                      ("INTROUVABLES (la voix de synthese servira)", "introuvable")):
        sel = [r for r in rows if r["statut"] == st]
        if sel:
            print(f"\n{title} ({len(sel)}) :")
            for r in sel:
                print(f"  - {r['lb']}  ({r['fr']})  {r['remarque']}")
    flagged = [r for r in rows if r["registre"]]
    if flagged:
        print("\nMOTS MARQUES (familier, vulgaire, vieilli...) :")
        for r in flagged:
            print(f"  - {r['lb']} : {r['registre']}")
    print(f"\nRapport complet : {out / 'report.csv'}")


if __name__ == "__main__":
    sys.exit(main())
