from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "brand"
OUT.mkdir(parents=True, exist_ok=True)

BG = (2, 6, 23, 255)
NAVY = (6, 21, 36, 255)
CYAN = (56, 189, 248, 255)
SKY = (224, 247, 255, 255)
BLUE = (37, 99, 235, 255)
VIOLET = (139, 92, 246, 180)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def rounded_gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            dx = (x - size * 0.28) / size
            dy = (y - size * 0.18) / size
            d = min(1, (dx * dx + dy * dy) ** 0.5 * 1.75)
            r = lerp(14, 2, d)
            g = lerp(165, 6, d)
            b = lerp(233, 23, d)
            px[x, y] = (r, g, b, 255)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
    img.putalpha(mask)
    return img


def stroke(draw: ImageDraw.ImageDraw, points, fill, width, joint="curve"):
    draw.line(points, fill=fill, width=width, joint=joint)


def make_icon(size: int) -> Image.Image:
    scale = size / 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    base = rounded_gradient(size)
    img.alpha_composite(base)

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    eye = [int(v * scale) for v in (82, 174, 430, 338)]
    gd.ellipse(eye, fill=(14, 165, 233, 55))
    gd.ellipse([int(120*scale), int(152*scale), int(392*scale), int(360*scale)], outline=(56,189,248,160), width=max(2, int(7*scale)))
    glow = glow.filter(ImageFilter.GaussianBlur(max(2, int(size * 0.035))))
    img.alpha_composite(glow)

    d = ImageDraw.Draw(img)
    w_eye = max(5, int(20 * scale))
    # Eye contour as smooth polygon-like lens.
    d.line([(82*scale,256*scale),(135*scale,174*scale),(377*scale,174*scale),(430*scale,256*scale),(377*scale,338*scale),(135*scale,338*scale),(82*scale,256*scale)], fill=CYAN, width=w_eye, joint="curve")
    d.ellipse([152*scale, 152*scale, 360*scale, 360*scale], fill=NAVY, outline=CYAN, width=max(5, int(16*scale)))

    z_width = max(8, int(36 * scale))
    stroke(d, [(182*scale,201*scale),(324*scale,201*scale),(188*scale,311*scale),(334*scale,311*scale)], SKY, z_width)
    stroke(d, [(187*scale,207*scale),(319*scale,207*scale),(193*scale,306*scale),(329*scale,306*scale)], CYAN, max(5, int(22*scale)))
    d.ellipse([236*scale,236*scale,276*scale,276*scale], fill=SKY)
    d.line([(345*scale,169*scale),(392*scale,122*scale)], fill=SKY, width=max(4, int(14*scale)))
    d.line([(127*scale,342*scale),(167*scale,302*scale)], fill=VIOLET, width=max(3, int(10*scale)))
    return img

for s in (16, 32, 48, 180, 192, 512):
    make_icon(s).save(OUT / f"zxlix-eye-icon-{s}.png")

make_icon(180).save(ROOT / "public" / "apple-icon.png")
make_icon(192).save(ROOT / "public" / "icon-192.png")
make_icon(512).save(ROOT / "public" / "icon-512.png")
make_icon(32).save(ROOT / "public" / "favicon.png")
make_icon(256).save(ROOT / "src" / "app" / "favicon.ico", sizes=[(16,16),(32,32),(48,48),(256,256)])
print("generated", OUT)
