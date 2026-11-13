"""Generate the Boston Charms court overlay for Hoop Land (1024x512 transparent PNG).

A minimal, clean floor: a big faint four-leaf clover stained into the
parquet behind the logo, a minimal fictional arena sponsor ("Keston
Garden") at two spots, and a hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (96, 52, 34)
GREEN = (0, 132, 61)
GOLD = (222, 184, 92)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- big faint four-leaf clover behind the logo ----------
clover = Image.new("L", (LW, LH), 0)
c = ImageDraw.Draw(clover)
for deg in (45, 135, 225, 315):                          # each leaf: two lobes and a point toward the center
    a = math.radians(deg)
    ux, uy = math.cos(a), math.sin(a)
    px, py = -uy, ux
    for side in (-1, 1):
        lx, ly = CX + ux * 40 + px * side * 12, CY + uy * 40 + py * side * 12
        c.ellipse([lx - 17, ly - 17, lx + 17, ly + 17], fill=255)
    c.polygon([(CX + ux * 6, CY + uy * 6),
               (CX + ux * 40 + px * 28, CY + uy * 40 + py * 28),
               (CX + ux * 40 - px * 28, CY + uy * 40 - py * 28)], fill=255)
stem = [(CX + 4 + t * 0.8, CY + 4 + t + 3 * math.sin(t / 9)) for t in range(0, 64)]   # curling stem
c.line(stem, fill=255, width=5)
veins = Image.new("L", (LW, LH), 0)                       # a lighter vein down the middle of each leaf
v = ImageDraw.Draw(veins)
for deg in (45, 135, 225, 315):
    a = math.radians(deg)
    v.line([(CX + math.cos(a) * 34, CY + math.sin(a) * 34), (CX + math.cos(a) * 66, CY + math.sin(a) * 66)], fill=255, width=1)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (70,), (0, 0), clover)
layer.paste(STAIN + (30,), (0, 0), Image.composite(veins, Image.new("L", (LW, LH), 0), clover))
img = layer.resize((W, H), Image.NEAREST)

# ---------- Keston Garden: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("KESTON", word_font, 3)
    total = 20 + word_w
    x = cx - total / 2
    mx, my = x + 7, cy - 2
    for ox, oy in ((-3, -3), (3, -3), (-3, 3), (3, 3)):   # a tiny four-leaf clover
        d.ellipse([mx + ox - 3, my + oy - 3, mx + ox + 3, my + oy + 3], fill=GREEN + (255,))
    d.line([(mx + 2, my + 2), (mx + 6, my + 8)], fill=GREEN + (255,), width=2)
    spaced(x + 20, cy - 10, "KESTON", word_font, WHITE + (255,), 3)
    sub_w = width("GARDEN", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "GARDEN", sub_font, GOLD + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.17 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.83 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 30), "#FEELINGLUCKY", font=tag_font, fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "boston-charms-overlay.png"))
print("saved")
