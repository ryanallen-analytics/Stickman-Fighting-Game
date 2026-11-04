"""Generate the Boston Charms court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
GREEN = (0, 132, 61)
DARK = (0, 70, 34)
GOLD = (222, 184, 92)
TAN = (214, 186, 132)
CREAM = (246, 238, 214)
BRICK = (158, 52, 40)
BRICK2 = (132, 40, 32)
MORTAR = (206, 176, 140)
BRONZE = (176, 126, 58)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- Freedom Trail bricks along the far apron ----------
TRAIL_TOP, ROWS, BH = TOP - 14, 3, 3
for x0, x1 in ((LEFT + 4, SCORER[0] - 2), (SCORER[1] + 2, RIGHT - 4)):
    d.rectangle([x0, TRAIL_TOP, x1, TRAIL_TOP + ROWS * (BH + 1)], fill=MORTAR + (235,))
    for r in range(ROWS):
        y = TRAIL_TOP + 1 + r * (BH + 1)
        offset = 3 if r % 2 else 0
        for i, x in enumerate(range(x0 + 1 - offset, x1, 7)):
            a, b = max(x, x0 + 1), min(x + 5, x1 - 1)
            if a < b:
                d.rectangle([a, y, b, y + BH - 1], fill=(BRICK if (i + r) % 3 else BRICK2) + (240,))
    for mx in range(x0 + 20, x1 - 10, 44):              # bronze trail medallions
        d.ellipse([mx - 4, TRAIL_TOP + 1, mx + 4, TRAIL_TOP + 9], fill=BRONZE + (255,), outline=DARK + (255,))
        d.ellipse([mx - 2, TRAIL_TOP + 3, mx + 2, TRAIL_TOP + 7], outline=GOLD + (255,))

# ---------- lucky horseshoe arch of charms over the logo ----------
def sprite(rows, palette):
    s = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch in palette:
                s.putpixel((c, r), palette[ch] + (255,))
    a = s.getchannel("A")
    ring = Image.new("RGBA", (s.width + 2, s.height + 2), DARK + (255,))
    ring.putalpha(Image.new("L", ring.size, 0))
    big = Image.new("L", ring.size, 0)
    big.paste(a, (1, 1))
    ring.putalpha(big.filter(ImageFilter.MaxFilter(3)))
    ring.alpha_composite(s, (1, 1))
    return ring

CLOVER = sprite((".gg...gg.",
                 "gGGg.gGGg",
                 "gGGGgGGGg",
                 ".gGGGGGg.",
                 "...gGg...",
                 ".gGGGGGg.",
                 "gGGGgGGGg",
                 "gGGg#gGGg",
                 ".gg.#.gg.",
                 "....#....",
                 "...#....."),
                {"g": GREEN, "G": (60, 180, 90), "#": DARK})
SHOE = sprite(("yy...yy", "yo...oy", "yy...yy", "yo...oy", "yy...yy", ".yy.yy.", "..yyy.."),
              {"y": GOLD, "o": (120, 90, 40)})
STAR = sprite(("...y...", "...y...", "yyyyyyy", ".yyyyy.", "..yyy..", ".yy.yy.", "y.....y"),
              {"y": GOLD})
COIN = sprite((".yyy.", "yYYYy", "yYyYy", "yYYYy", ".yyy."), {"y": GOLD, "Y": (246, 214, 120)})

R = 43
for t in range(0, 181, 4):                               # dotted gold arch
    a = math.radians(180 + t)
    d.point((round(CX + R * math.cos(a)), round(CY + 2 + R * math.sin(a))), fill=GOLD + (200,))
CHARMS = (SHOE, CLOVER, STAR, COIN, CLOVER, COIN, STAR, CLOVER, SHOE)
for k, charm in enumerate(CHARMS):
    a = math.radians(180 + k * 180 / (len(CHARMS) - 1))
    x, y = CX + R * math.cos(a), CY + 2 + R * math.sin(a)
    if k in (0, len(CHARMS) - 1):
        y += 4                                            # horseshoe ends sit a touch lower
    img.alpha_composite(charm, (round(x - charm.width / 2), round(y - charm.height / 2)))
d = ImageDraw.Draw(img)

# ---------- Boston skyline along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
# Custom House Tower: clock tower with a pyramid cap
m.rectangle([226, BASE - 30, 234, BASE], fill=255)
m.polygon([(225, BASE - 30), (230, BASE - 37), (235, BASE - 30)], fill=255)
m.line([(230, BASE - 41), (230, BASE - 37)], fill=255)
# Hancock Tower: slim slab with a slanted top
m.polygon([(238, BASE), (238, BASE - 38), (248, BASE - 42), (248, BASE)], fill=255)
# Prudential: tall block with crown and mast
m.rectangle([252, BASE - 36, 263, BASE], fill=255)
m.rectangle([254, BASE - 39, 261, BASE - 36], fill=255)
m.line([(257, BASE - 45), (257, BASE - 39)], fill=255)
m.rectangle([266, BASE - 20, 274, BASE], fill=255)
m.rectangle([276, BASE - 27, 286, BASE], fill=255)
# Old State House: little brick hall with a stepped steeple
m.rectangle([290, BASE - 10, 304, BASE], fill=255)
m.polygon([(290, BASE - 10), (297, BASE - 14), (304, BASE - 10)], fill=255)
m.rectangle([295, BASE - 19, 299, BASE - 14], fill=255)
m.rectangle([296, BASE - 22, 298, BASE - 19], fill=255)
# Old North Church: tall steeple
m.rectangle([308, BASE - 12, 322, BASE], fill=255)
m.rectangle([312, BASE - 22, 318, BASE - 12], fill=255)
m.rectangle([313, BASE - 27, 317, BASE - 22], fill=255)
m.polygon([(313, BASE - 27), (315, BASE - 36), (317, BASE - 27)], fill=255)

sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(CREAM + (210,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(DARK + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
for x0, x1, top in ((252, 263, BASE - 33), (266, 274, BASE - 17), (276, 286, BASE - 24)):   # windows
    for wy in range(top, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=DARK + (140,))
for y in range(BASE - 36, BASE - 2, 3):                   # Hancock's glass bands
    d.line([(239, y), (247, y)], fill=(120, 170, 200, 170))
d.point((230, BASE - 25), fill=GOLD + (255,))             # Custom House clock
d.rectangle([291, BASE - 8, 303, BASE - 1], fill=BRICK + (220,))
d.rectangle([309, BASE - 10, 321, BASE - 1], fill=BRICK + (220,))
for x in (297, 315):
    d.rectangle([x - 1, BASE - 5, x + 1, BASE - 1], fill=DARK + (220,))

# Leonard P. Zakim Bridge: two inverted-Y towers with fanned cables
DECK = BASE - 6
d.rectangle([182, DECK, 222, DECK + 1], fill=DARK + (235,))
for tx in (194, 212):
    top = BASE - 24
    d.line([(tx - 3, DECK), (tx, top + 6)], fill=DARK + (240,), width=1)
    d.line([(tx + 3, DECK), (tx, top + 6)], fill=DARK + (240,), width=1)
    d.line([(tx, top + 6), (tx, top)], fill=DARK + (240,), width=2)
    for k in range(1, 5):
        d.line([(tx, top + 2 + k), (tx - 3 - k * 2, DECK)], fill=CREAM + (220,))
        d.line([(tx, top + 2 + k), (tx + 3 + k * 2, DECK)], fill=CREAM + (220,))
d.line([(180, BASE), (326, BASE)], fill=DARK + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "boston-charms-overlay.png"))
print("saved")
