from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "public" / "brand"
BRAND.mkdir(parents=True, exist_ok=True)

BG = (3, 7, 17, 255)
PANEL = (7, 17, 31, 255)
CYAN = (56, 189, 248, 255)
WHITE = (224, 247, 255, 255)


def make_icon(size: int) -> Image.Image:
    scale = size / 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(112 * scale)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    pad = int(24 * scale)
    draw.rounded_rectangle([pad, pad, size - pad - 1, size - pad - 1], radius=int(96 * scale), fill=PANEL, outline=(56, 189, 248, 42), width=max(1, int(8 * scale)))

    # Minimal geometric Z, thick enough at 16px.
    w = max(2, int(54 * scale))
    pts = [(154 * scale, 152 * scale), (358 * scale, 152 * scale), (178 * scale, 360 * scale), (382 * scale, 360 * scale)]
    draw.line(pts, fill=CYAN, width=w, joint="curve")

    play = [(256 * scale, 218 * scale), (316 * scale, 256 * scale), (256 * scale, 294 * scale)]
    draw.polygon(play, fill=WHITE)
    return img


for n in (16, 32, 48, 180, 192, 512):
    make_icon(n).save(BRAND / f"zxlix-minimal-icon-{n}.png")

make_icon(32).save(ROOT / "public" / "favicon.png")
make_icon(180).save(ROOT / "public" / "apple-icon.png")
make_icon(192).save(ROOT / "public" / "icon-192.png")
make_icon(512).save(ROOT / "public" / "icon-512.png")
make_icon(32).save(ROOT / "src" / "app" / "favicon.ico")
print("generated minimal zxlix icons")
