#!/usr/bin/env python3
"""Create a static asset manifest for the Arsha Flora Ground Cover Kit website.

Run from anywhere: python build_gallery_manifest.py
The script scans folders alongside this file. No network or extra packages required.
"""

from pathlib import Path
from urllib.parse import quote
import json
import re

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
CATEGORIES = ASSETS / "categories"
OUTPUT = ASSETS / "gallery-manifest.json"
EXTENSIONS = {".webp", ".png", ".jpg", ".jpeg", ".avif"}


def folder_images(folder):
    files = sorted(
        (p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in EXTENSIONS),
        key=lambda p: [int(s) if s.isdigit() else s.casefold()
                       for s in re.split(r"(\d+)", p.name)],
    )
    return [
        {"name": f.name,
         "type": "file",
         "download_url": quote(f.relative_to(ROOT).as_posix(), safe="/")}
        for f in files
    ]


def main():
    if not CATEGORIES.is_dir():
        raise SystemExit(f"Cannot find {CATEGORIES}. Place this script in the repository root.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    folders = {}
    category_dirs = sorted((d for d in CATEGORIES.iterdir() if d.is_dir()),
                           key=lambda d: d.name.casefold())
    folders["assets/categories"] = [
        {"name": d.name, "type": "dir"} for d in category_dirs
    ]
    for d in category_dirs:
        folders["assets/categories/" + d.name] = folder_images(d)

    render_dirs = sorted((d for d in ASSETS.iterdir()
                          if d.is_dir() and re.fullmatch(r"render\d+", d.name, re.I)),
                         key=lambda d: int(re.search(r"\d+", d.name).group()))
    for d in render_dirs:
        folders["assets/" + d.name] = folder_images(d)

    manifest = {"version": 1, "folders": folders}
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(len(items) for key, items in folders.items() if key != "assets/categories")
    print(f"Created: {OUTPUT}")
    print(f"Categories: {len(category_dirs)}, render folders: {len(render_dirs)}, images: {total}")
    print("Next: Commit & Push index.html, build_gallery_manifest.py and assets/gallery-manifest.json")


if __name__ == "__main__":
    main()
