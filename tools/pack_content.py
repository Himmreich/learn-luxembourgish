#!/usr/bin/env python3
"""
Regroupe tout le contenu en un seul fichier (un seul téléchargement au lieu de ~20) :

    python3 tools/pack_content.py site/content --out site/content/all.json

L'app utilise all.json s'il existe, sinon elle charge les fichiers un par un.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from content_lib import load_content  # noqa: E402


def pack(content_dir):
    return load_content(content_dir)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("content_dir")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    data = pack(args.content_dir)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Contenu empaqueté : {args.out}")


if __name__ == "__main__":
    main()
