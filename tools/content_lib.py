"""Lecture du contenu (site/content) partagée par les outils : contrôle, empaquetage, audio."""
import json
from pathlib import Path


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_content(content_dir):
    """Renvoie {manifest, themes:{id:thème}, grammar:{id:page}, legacy:{}}."""
    d = Path(content_dir)
    manifest = read_json(d / "manifest.json")
    theme_ids = [t for s in manifest["sections"] for t in s["themes"]]
    themes = {t: read_json(d / "themes" / f"{t}.json") for t in theme_ids}
    grammar = {g: read_json(d / "grammar" / f"{g}.json") for g in manifest.get("grammar", [])}
    legacy_path = d / "legacy-ids.json"
    legacy = read_json(legacy_path) if legacy_path.exists() else {}
    return {"manifest": manifest, "themes": themes, "grammar": grammar, "legacy": legacy}


def all_items(content):
    """Tous les mots et phrases, dans l'ordre de l'app : [{theme, id, fr, lb, gender?, parts?...}]."""
    out = []
    for section in content["manifest"]["sections"]:
        for tid in section["themes"]:
            for it in content["themes"][tid]["items"]:
                out.append(dict(it, theme=tid))
    return out
