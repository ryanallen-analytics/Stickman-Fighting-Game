"""Generate the St. Louis Archers court overlay for Hoop Land (1024x512 transparent PNG).

A sleek floor: a faint stainless-steel Gateway Arch rising behind the logo
with the Mississippi at its feet, a minimal fictional arena sponsor
("Varden Center") at two spots, and a hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STEEL = (236, 240, 246)
NAVY = (14, 32, 90)
GOLD = (244, 172, 52)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (LEFT + RIGHT) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint Gateway Arch: a catenary band, wider at the legs than at the top ----------
BASE, K = BOTTOM - 5, 2.2
OUTER = (64, 136)          # half-span at the base, height
INNER = (53, 130)

def half_width(y, half_span, height):
    """Half-width of a catenary of the given base half-span and height at row y (None above its top)."""
    rise = BASE - y
    if rise < 0 or rise > height:
        return None
    c = math.cosh(K) - rise * (math.cosh(K) - 1) / height
    return half_span / K * math.acosh(max(1.0, c))

arch = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
ad = ImageDraw.Draw(arch)
for y in range(BASE - OUTER[1], BASE + 1):
    xo = half_width(y, *OUTER)
    xi = half_width(y, *INNER)
    if xo is None:
        continue
    if xi is None:                                        # across the top, the band is solid
        ad.line([(CX - xo, y), (CX + xo, y)], fill=STEEL + (70,))
        continue
    for sgn in (-1, 1):
        a, b = sorted((CX + sgn * xi, CX + sgn * xo))
        ad.line([(a, y), (b, y)], fill=STEEL + (70,))
        sheen = CX + sgn * (xi + (xo - xi) * 0.3)         # a brighter streak along each leg's inner face
        ad.line([(sheen, y), (sheen + sgn * 1, y)], fill=STEEL + (110,))
# the Mississippi at its feet
for k, y in enumerate((BASE + 1, BASE + 3)):
    pts = [(x, y + round(0.8 * math.sin((x + k * 5) * 0.45))) for x in range(CX - 92, CX + 93)]
    ad.line(pts, fill=STEEL + (55 - k * 15,))
img = arch.resize((W, H), Image.NEAREST)

# ---------- Varden Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("VARDEN", word_font, 3)
    total = 20 + word_w
    x = cx - total / 2
    d.arc([x, cy - 8, x + 14, cy + 14], 180, 360, fill=GOLD + (255,), width=3)   # a small arch
    d.rectangle([x - 1, cy + 4, x + 15, cy + 5], fill=NAVY + (255,))            # on the riverbank
    spaced(x + 20, cy - 10, "VARDEN", word_font, WHITE + (255,), 3)
    sub_w = width("CENTER", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "CENTER", sub_font, GOLD + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.17 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.83 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 30), "#GATEWAYTOGLORY", font=tag_font, fill=GOLD + (255,), anchor="mm")

img.save(os.path.join(HERE, "st-louis-archers-overlay.png"))
print("saved")
