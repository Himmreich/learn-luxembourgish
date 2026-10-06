#!/usr/bin/env python3
"""
Contrôle du contenu de l'app (site/content). À lancer avant chaque publication :

    python3 tools/check_content.py site/content

Erreurs (code de sortie 1) : fichier manquant, identifiant en double, champ manquant, article qui ne respecte pas
la règle du n, genre incohérent avec l'article. Avertissements : phrase sans décomposition, doublons de traduction.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from content_lib import all_items, load_content  # noqa: E402

NOUN_RE = re.compile(r"(?:(Den|De)\s+|(D')\s*)([^\s,?!…]+)")
ID_RE = re.compile(r"^[a-z0-9-]+$")
ITEM_ID_RE = re.compile(r"^[a-z0-9-]+\.[a-z0-9-]+$")
GENDERS = {"m", "f", "n", "pl"}
KEEP_N = set("aeiouyhdntz")


def first_letter(word):
    import unicodedata
    c = unicodedata.normalize("NFD", word[:1].lower())
    return c[:1]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    errors, warnings = [], []
    try:
        content = load_content(sys.argv[1])
    except (OSError, KeyError, json.JSONDecodeError) as e:
        sys.exit(f"ERREUR : contenu illisible ({type(e).__name__} : {e})")

    manifest = content["manifest"]
    listed = set()
    for s in manifest["sections"]:
        if not s.get("title"):
            errors.append(f"section {s.get('id')} sans titre")
        for tid in s["themes"]:
            if tid in listed:
                errors.append(f"thème {tid} listé deux fois dans le manifeste")
            listed.add(tid)
    theme_dir = Path(sys.argv[1]) / "themes"
    for f in theme_dir.glob("*.json"):
        if f.stem not in listed:
            warnings.append(f"{f.name} n'est pas dans le manifeste (il ne sera pas affiché)")

    seen_ids = {}
    for tid, theme in content["themes"].items():
        if theme.get("id") != tid:
            errors.append(f"{tid}.json : « id » doit valoir « {tid} »")
        if not ID_RE.match(tid):
            errors.append(f"thème {tid} : identifiant invalide (a-z, 0-9, -)")
        if not theme.get("title"):
            errors.append(f"thème {tid} : titre manquant")
        lbs, frs = {}, {}
        for it in theme.get("items", []):
            where = f"{tid} / {it.get('id', '?')}"
            for field in ("id", "fr", "lb"):
                if not isinstance(it.get(field), str) or not it[field].strip():
                    errors.append(f"{where} : champ « {field} » manquant")
            iid = it.get("id", "")
            if iid and not ITEM_ID_RE.match(iid):
                errors.append(f"{where} : identifiant invalide (attendu « {tid}.mot »)")
            if iid in seen_ids:
                errors.append(f"identifiant en double : {iid}")
            seen_ids[iid] = tid
            if iid and not iid.startswith(tid + "."):
                errors.append(f"{where} : l'identifiant doit commencer par « {tid}. »")
            lb, fr = it.get("lb", ""), it.get("fr", "")
            if lb in lbs:
                errors.append(f"{where} : « {lb} » déjà présent dans ce thème ({lbs[lb]})")
            lbs[lb] = iid
            if fr in frs:
                warnings.append(f"{where} : traduction « {fr} » en double dans ce thème")
            frs[fr] = iid

            gender = it.get("gender")
            m = NOUN_RE.fullmatch(lb)
            if gender is not None and gender not in GENDERS:
                errors.append(f"{where} : genre « {gender} » invalide (m, f, n, pl)")
            if gender and not m:
                errors.append(f"{where} : un genre est indiqué, mais « {lb} » n'est pas un nom avec article")
            if m:
                art, base = (m.group(1) or m.group(2)), m.group(3)
                keep = first_letter(base) in KEEP_N
                if art == "De" and keep:
                    errors.append(f"{where} : « {lb} » devrait s'écrire « Den {base} » (règle du n)")
                if art == "Den" and not keep:
                    errors.append(f"{where} : « {lb} » devrait s'écrire « De {base} » (règle du n)")
                if gender == "m" and art == "D'":
                    errors.append(f"{where} : genre masculin mais article « D' »")
                if gender in ("f", "n", "pl") and art != "D'":
                    errors.append(f"{where} : genre « {gender} » mais article « {art} »")
                if not gender and art in ("De", "Den"):
                    pass  # masculin déduit de l'article
            elif len(lb.split()) >= 3 and not it.get("parts"):
                warnings.append(f"{where} : phrase sans décomposition (« parts »)")
            for p in it.get("parts", []) or []:
                if not (isinstance(p, list) and len(p) == 2 and all(isinstance(x, str) and x for x in p)):
                    errors.append(f"{where} : « parts » doit être une liste de paires [luxembourgeois, français]")
                    break

    for gid, page in content["grammar"].items():
        if page.get("id") != gid:
            errors.append(f"grammar/{gid}.json : « id » doit valoir « {gid} »")
        if not page.get("title"):
            errors.append(f"grammar/{gid}.json : titre manquant")
        for i, b in enumerate(page.get("blocks", [])):
            if not any(k in b for k in ("h", "p", "small", "examples", "table")):
                errors.append(f"grammar/{gid}.json : bloc {i + 1} inconnu ({', '.join(b)})")

    legacy_targets = set(content["legacy"].values())
    missing = sorted(legacy_targets - set(seen_ids))
    if missing:
        warnings.append(f"legacy-ids.json : {len(missing)} identifiants n'existent plus (ex. {missing[0]})")

    items = all_items(content)
    print(f"{len(content['themes'])} thèmes, {len(items)} entrées, "
          f"{sum(1 for i in items if i.get('parts'))} avec décomposition, "
          f"{sum(1 for i in items if i.get('gender'))} avec genre, {len(content['grammar'])} page(s) de grammaire.")
    for w in warnings:
        print("  avertissement :", w)
    for e in errors:
        print("  ERREUR :", e)
    if errors:
        print(f"\n{len(errors)} erreur(s).")
        return 1
    print("Contenu valide.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
