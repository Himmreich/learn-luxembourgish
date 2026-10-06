#!/usr/bin/env python3
"""
Fabrique une version autonome de l'app : un seul fichier HTML (CSS, JavaScript et contenu intégrés).
Pratique pour la tester ou la publier sans serveur.

    python3 tools/bundle.py --site site --out dist/letzebuergesch-standalone.html
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pack_content import pack  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", default="site")
    ap.add_argument("--out", default="dist/letzebuergesch-standalone.html")
    args = ap.parse_args()
    site = Path(args.site)
    html = (site / "index.html").read_text(encoding="utf-8")

    def css(m):
        return "<style>\n" + (site / m.group(1)).read_text(encoding="utf-8") + "</style>"

    html, n_css = re.subn(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)

    packed = json.dumps(pack(site / "content"), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    first = {"done": False}

    def script(m):
        code = (site / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        prefix = ""
        if not first["done"]:
            prefix = "<script>window.LB_PACKED=" + packed + ";</script>\n"
            first["done"] = True
        return prefix + "<script>\n" + code + "</script>"

    html, n_js = re.subn(r'<script src="(js/[^"]+)"></script>', script, html)
    if not n_css or not n_js:
        sys.exit("index.html : feuille de style ou scripts introuvables")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"{out} : {len(html) // 1024} Ko ({n_js} scripts, {n_css} feuille de style)")


if __name__ == "__main__":
    main()
