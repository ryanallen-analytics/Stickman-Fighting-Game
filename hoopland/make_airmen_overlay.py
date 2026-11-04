"""Generate the New Orleans Airmen court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (15, 34, 64)
RED = (200, 16, 46)
CREAM = (244, 236, 220)
WHITE = (250, 250, 250)
GOLD = (212, 175, 90)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- French Quarter balcony railing on the far apron ----------
IRON = CREAM + (225,)
RAIL_TOP, RAIL_BOT = TOP - 20, TOP - 3
for x0, x1 in ((LEFT + 6, SCORER[0]), (SCORER[1], RIGHT - 6)):
    d.rectangle([x0, RAIL_TOP, x1, RAIL_TOP + 1], fill=IRON)
    d.rectangle([x0, RAIL_BOT, x1, RAIL_BOT + 1], fill=IRON)
    d.line([(x0, RAIL_TOP + 5), (x1, RAIL_TOP + 5)], fill=IRON)
    for x in range(x0 + 3, x1 - 1, 4):                       # balusters
        d.line([(x, RAIL_TOP + 2), (x, RAIL_BOT - 1)], fill=IRON)
    for x in range(x0 + 5, x1 - 3, 8):                       # cast-iron scrolls
        d.ellipse([x - 2, RAIL_TOP + 7, x + 2, RAIL_TOP + 11], outline=IRON)
        d.point((x, RAIL_TOP + 9), fill=IRON)
    for x in range(x0, x1 + 1, 32 if x1 - x0 > 64 else max(1, x1 - x0)):  # posts with finials
        d.rectangle([x - 1, RAIL_TOP - 1, x + 1, RAIL_BOT + 1], fill=IRON)
        d.ellipse([x - 2, RAIL_TOP - 5, x + 2, RAIL_TOP - 1], fill=IRON)
    for x in (x0, x1):
        d.rectangle([x - 1, RAIL_TOP - 1, x + 1, RAIL_BOT + 1], fill=IRON)
        d.ellipse([x - 2, RAIL_TOP - 5, x + 2, RAIL_TOP - 1], fill=IRON)
# gas lanterns flanking the scorer's table
for x in SCORER:
    d.rectangle([x - 2, RAIL_TOP - 11, x + 2, RAIL_TOP - 5], fill=NAVY + (255,), outline=IRON)
    d.rectangle([x - 1, RAIL_TOP - 10, x + 1, RAIL_TOP - 6], fill=GOLD + (255,))
    d.point((x, RAIL_TOP - 12), fill=IRON)

# ---------- jets peeling off above the logo ----------
JET = (
    "....#....",
    "...###...",
    "...###...",
    "..#####..",
    ".#######.",
    "#########",
    "...###...",
    "..#####..",
    "..#.#.#..",
)
def jet_sprite():
    s = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    for r, row in enumerate(JET):
        for c, ch in enumerate(row):
            if ch == "#":
                s.putpixel((c, r), NAVY + (255,))
    s.putpixel((4, 2), WHITE + (255,))                    # canopy
    s.putpixel((0, 5), RED + (255,))
    s.putpixel((8, 5), RED + (255,))
    big = Image.new("RGBA", (15, 15), (0, 0, 0, 0))
    big.paste(s, (3, 3))
    return big

def bezier(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]) for t in (i / n for i in range(n + 1))]

for side in (-1, 1):
    start = (CX + side * 10, TOP + 46)
    ctrl = (CX + side * 22, TOP + 18)
    end = (CX + side * 54, TOP + 14)
    smoke = bezier(start, ctrl, end)
    d.line([(x, y + 2) for x, y in smoke], fill=RED + (200,), width=2)
    d.line(smoke, fill=WHITE + (210,), width=2)
    angle = 60 if side < 0 else -60                       # nose pointing out along the trail
    sprite = jet_sprite().rotate(angle, resample=Image.NEAREST, expand=True)
    img.alpha_composite(sprite, (round(end[0] - sprite.width / 2 + side * 3), round(end[1] - sprite.height / 2 - 1)))

# ---------- New Orleans skyline along the near sideline ----------
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
lines = ImageDraw.Draw(img)
BASE = BOTTOM
# downtown towers
TOWERS = ((222, 229, 14), (231, 239, 28), (241, 247, 19), (249, 256, 24))
for x0, x1, h in TOWERS:
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
m.polygon([(249, BASE - 24), (252, BASE - 28), (256, BASE - 24)], fill=255)     # peaked crown
# Superdome
m.rectangle([260, BASE - 6, 292, BASE], fill=255)
m.pieslice([259, BASE - 17, 293, BASE + 3], 180, 360, fill=255)
# St. Louis Cathedral: three steeples over the facade
m.rectangle([296, BASE - 10, 320, BASE], fill=255)
for x0, x1, h in ((297, 301, 16), (306, 310, 24), (315, 319, 16)):
    m.rectangle([x0, BASE - h, x1, BASE - 10], fill=255)
    m.polygon([(x0, BASE - h), ((x0 + x1) / 2, BASE - h - 6), (x1, BASE - h)], fill=255)
    m.line([((x0 + x1) // 2, BASE - h - 9), ((x0 + x1) // 2, BASE - h - 6)], fill=255)

sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(CREAM + (205,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(NAVY + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
for x0, x1, h in TOWERS:                                  # windows
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=NAVY + (150,))
for y, half in ((BASE - 13, 15), (BASE - 9, 16)):         # Superdome roof rings
    d.line([(276 - half, y), (276 + half, y)], fill=NAVY + (110,))
d.rectangle([260, BASE - 5, 292, BASE - 4], fill=RED + (200,))
for x in (299, 308, 317):                                 # cathedral doors
    d.rectangle([x - 1, BASE - 5, x + 1, BASE - 1], fill=NAVY + (200,))
d.point((308, BASE - 19), fill=GOLD + (255,))             # clock

# Crescent City Connection: twin cantilever truss
DECK = BASE - 6
d.rectangle([184, DECK, 220, DECK + 1], fill=NAVY + (235,))
for tx in (193, 211):
    d.line([(tx, DECK), (tx, BASE - 20)], fill=NAVY + (235,), width=2)
    for a, b in (((tx, BASE - 20), (tx - 9, DECK)), ((tx, BASE - 20), (tx + 9, DECK)),
                 ((tx, BASE - 14), (tx - 5, DECK)), ((tx, BASE - 14), (tx + 5, DECK))):
        d.line([a, b], fill=NAVY + (235,))
d.line([(193, BASE - 20), (211, BASE - 20)], fill=NAVY + (200,))
for px in (187, 202, 217):
    d.rectangle([px, DECK + 2, px + 1, BASE], fill=NAVY + (220,))
d.line([(182, BASE), (324, BASE)], fill=NAVY + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "new-orleans-airmen-overlay.png"))
print("saved")
