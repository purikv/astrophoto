#!/usr/bin/env python3
import os, pathlib
from PIL import Image

SRC_DIRS = ["images"]
OUT_DIR = pathlib.Path("thumbnails")
SIZES = [4000, 2000, 800]  # Added 4000px for lightbox

def is_image(p: pathlib.Path):
    return p.suffix.lower() in [".tif", ".tiff", ".png", ".jpg", ".jpeg"]

def process(src: pathlib.Path):
    try:
        img = Image.open(src)
        img.load()

        # Convert to 8-bit RGB if needed (from 16-bit or other modes)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        elif img.mode == 'I' or img.mode == 'I;16':
            # 16-bit grayscale to 8-bit
            img = img.point(lambda i: i * (1 / 256)).convert('L')
        elif img.mode == 'RGB' and hasattr(img, 'bits') and img.bits == 16:
            # 16-bit RGB to 8-bit RGB
            img = img.point(lambda i: i * (1 / 256))

    except Exception as e:
        print(f"Skip {src}: {e}")
        return

    for w in SIZES:
        # For very large originals, limit max width
        if w > img.width:
            w = img.width

        ratio = w / img.width
        h = int(img.height * ratio)
        im2 = img.copy().resize((w, h), Image.LANCZOS)

        # Ensure 8-bit output
        if im2.mode not in ('RGB', 'L'):
            im2 = im2.convert('RGB')

        out = OUT_DIR / f"{src.stem}_{w}.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)

        # Higher quality for 4000px version (lightbox)
        quality = 95 if w >= 4000 else 90
        im2.save(out, "JPEG", quality=quality, optimize=True)
        print(f"Saved {out} ({im2.mode}, {quality}% quality)")

if __name__ == "__main__":
    for base in SRC_DIRS:
        for root, _, files in os.walk(base):
            for f in files:
                p = pathlib.Path(root) / f
                if is_image(p):
                    process(p)
