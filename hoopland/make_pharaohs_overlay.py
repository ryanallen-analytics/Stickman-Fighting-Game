"""Generate the Memphis Pharaohs court overlay for Hoop Land (1024x512 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (16, 42, 100)
INK = (10, 18, 45)
LAPIS = (40, 86, 196)
GOLD = (226, 178, 62)
DARKGOLD = (170, 122, 36)
SAND = (238, 206, 150)
HERE = os.path.dirname(os.path.abspath(__file__))
CX, CY = 256, 128
LEFT, RIGHT, TOP, BOTTOM = 62, 450, 35, 221   # court edges

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- winged sun spreading from behind the center logo ----------
ROWS = ((116, 40, GOLD), (120, 36, LAPIS), (124, 30, GOLD), (128, 22, LAPIS), (132, 14, GOLD))
for side in (-1, 1):
    root = CX + side * 38
    for y, length, col in ROWS:
        tip = root + side * length
        x0, x1 = sorted((root, tip))
        d.rectangle([x0, y, x1, y + 3], fill=col + (225,))
        # feather notches along the lower edge
        for fx in range(min(root, tip) + 2, max(root, tip), 4):
            d.point((fx, y + 3), fill=INK + (150,))
    # upswept wingtip and outline
    tipx = root + side * 40
    d.polygon([(tipx, 116), (tipx + side * 4, 110), (tipx + side * 6, 112), (tipx + side * 2, 119)], fill=GOLD + (225,))
    d.line([(root, 115), (tipx, 115), (tipx + side * 4, 109)], fill=INK + (200,))

# ---------- hieroglyph frieze along the far sideline ----------
FY0, FY1 = TOP - 19, TOP - 3
for x0, x1 in ((70, 226), (262, 442)):          # gap for the scorer's table
    d.line([(x0, FY0), (x1, FY0)], fill=GOLD + (235,))
    d.line([(x0, FY1), (x1, FY1)], fill=GOLD + (235,))
    d.line([(x0, FY0), (x0, FY1)], fill=GOLD + (235,))
    d.line([(x1, FY0), (x1, FY1)], fill=GOLD + (235,))

G = GOLD + (240,)
def ankh(x, y):
    d.ellipse([x, y, x + 5, y + 5], outline=G)
    d.line([(x - 1, y + 6), (x + 6, y + 6)], fill=G)
    d.line([(x + 2, y + 6), (x + 2, y + 12)], fill=G, width=2)
def eye(x, y):
    d.arc([x, y + 1, x + 10, y + 9], 180, 360, fill=G)
    d.line([(x, y + 5), (x + 10, y + 5)], fill=G)
    d.rectangle([x + 4, y + 3, x + 6, y + 5], fill=G)
    d.line([(x + 4, y + 6), (x + 3, y + 10), (x + 1, y + 11)], fill=G)
    d.line([(x + 7, y + 6), (x + 9, y + 10)], fill=G)
    d.line([(x - 1, y + 2), (x + 11, y + 1)], fill=G)
def bird(x, y):
    d.ellipse([x + 1, y, x + 4, y + 3], fill=G)
    d.line([(x, y + 1), (x + 1, y + 1)], fill=G)
    d.polygon([(x + 2, y + 3), (x + 9, y + 7), (x + 8, y + 10), (x + 2, y + 8)], fill=G)
    d.line([(x + 4, y + 10), (x + 3, y + 12)], fill=G)
    d.line([(x + 6, y + 10), (x + 6, y + 12)], fill=G)
def water(x, y):
    for row in (3, 8):
        pts = [(x + k, y + row + (1 if k % 4 < 2 else 0)) for k in range(0, 11)]
        d.line(pts, fill=G)
def reed(x, y):
    d.line([(x + 2, y + 2), (x + 2, y + 12)], fill=G)
    d.polygon([(x + 2, y), (x + 5, y + 4), (x + 2, y + 6)], fill=G)
def scarab(x, y):
    d.ellipse([x + 2, y + 3, x + 8, y + 11], fill=G)
    d.ellipse([x + 3, y, x + 7, y + 3], fill=G)
    d.line([(x + 5, y + 4), (x + 5, y + 10)], fill=NAVY + (255,))
    for ly in (5, 8):
        d.line([(x, ly + y - 1), (x + 2, ly + y)], fill=G)
        d.line([(x + 8, ly + y), (x + 10, ly + y - 1)], fill=G)
def pyramid_glyph(x, y):
    d.polygon([(x, y + 11), (x + 5, y + 2), (x + 10, y + 11)], outline=G)
    d.line([(x + 5, y + 2), (x + 7, y + 11)], fill=G)

GLYPHS = (ankh, eye, bird, water, scarab, reed, pyramid_glyph, ankh, eye, bird, water, scarab, reed)
x = 76
for i in range(26):
    if 222 <= x <= 266:
        x = 268
    if x > 432:
        break
    GLYPHS[i % len(GLYPHS)](x, FY0 + 2)
    x += 14

# ---------- Memphis skyline along the near sideline ----------
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
BASE = BOTTOM
# Hernando de Soto Bridge: the "M" arches
DECK = BASE - 6
m.rectangle([136, DECK, 222, DECK + 1], fill=255)
for ax in (146, 184):
    m.arc([ax, DECK - 22, ax + 36, DECK + 20], 180, 360, fill=255, width=2)
    for k in range(5):
        hx = ax + 6 + k * 6
        m.line([(hx, DECK - 15 + abs(k - 2) * 2 + (2 if k in (0, 4) else 0)), (hx, DECK)], fill=255)
for px in (146, 182, 220):
    m.rectangle([px, DECK, px + 2, BASE], fill=255)
# downtown towers
TOWERS = ((226, 236, 16), (238, 248, 26), (250, 262, 38), (264, 272, 22), (274, 286, 30), (288, 296, 14))
for x0, x1, h in TOWERS:
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
m.polygon([(250, BASE - 38), (256, BASE - 44), (262, BASE - 38)], fill=255)   # crowned tallest tower
m.rectangle([279, BASE - 34, 281, BASE - 30], fill=255)
skyline = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
skyline.paste(SAND + (190,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
skyline.paste(NAVY + (230,), (0, 0), edge)
img = Image.alpha_composite(img, skyline)
d = ImageDraw.Draw(img)
for x0, x1, h in TOWERS:                           # windows
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=NAVY + (150,))

# Bass Pro Pyramid: gold, shaded east face, glass tip
PX0, PX1, PH = 300, 372, 40
apex = ((PX0 + PX1) // 2, BASE - PH)
d.polygon([(PX0, BASE), apex, (apex[0], BASE)], fill=GOLD + (230,))
d.polygon([(apex[0], BASE), apex, (PX1, BASE)], fill=DARKGOLD + (230,))
for k in range(1, 8):                               # stone courses
    y = BASE - k * 5
    half = (PX1 - PX0) / 2 * (1 - k * 5 / PH)
    d.line([(apex[0] - half, y), (apex[0] + half, y)], fill=NAVY + (90,))
d.polygon([(apex[0] - 4, BASE - PH + 6), apex, (apex[0] + 4, BASE - PH + 6)], fill=(200, 230, 255, 240))
d.line([(PX0, BASE), apex, (PX1, BASE)], fill=NAVY + (240,), width=1)
d.line([(132, BASE), (380, BASE)], fill=NAVY + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "memphis-pharaohs-overlay.png"))
print("saved")
