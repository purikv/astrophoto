#!/usr/bin/env python3
import os, pathlib
from PIL import Image

SRC_DIRS = ["images"]
OUT_DIR = pathlib.Path("thumbnails")
SIZES = [2000, 800]

def is_image(p: pathlib.Path):
    return p.suffix.lower() in [".tif", ".tiff", ".png", ".jpg", ".jpeg"]

def process(src: pathlib.Path):
    try:
        img = Image.open(src)
        img.load()
    except Exception as e:
        print(f"Skip {src}: {e}")
        return
    for w in SIZES:
        ratio = w / img.width
        h = int(img.height * ratio)
        im2 = img.copy().resize((w, h), Image.LANCZOS)
        out = OUT_DIR / f"{src.stem}_{w}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        im2.save(out, "JPEG", quality=90, optimize=True)
        print(f"Saved {out}")

if __name__ == "__main__":
    for base in SRC_DIRS:
        for root, _, files in os.walk(base):
            for f in files:
                p = pathlib.Path(root) / f
                if is_image(p):
                    process(p)
