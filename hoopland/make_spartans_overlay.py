"""Generate the Milwaukee Spartans court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
GREEN = (12, 74, 32)
DARK = (6, 46, 20)
LEAF = (64, 146, 64)
LEAF_LIGHT = (120, 190, 100)
CREAM = (238, 228, 196)
BLUE = (26, 127, 200)
WATER = (60, 140, 210)
BRONZE = (196, 150, 70)
GOLD = (232, 194, 96)
WHITE = (252, 252, 250)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- Greek key band and Spartan shields on the far apron ----------
KEY = (
    "#######.",
    "#.....#.",
    "#.###.#.",
    "#.#.#.#.",
    "#.#...#.",
    "#.#####.",
    "#.......",
    "########",
)
BAND_TOP = TOP - 15
for x0, x1 in ((LEFT + 4, SCORER[0] - 16), (SCORER[1] + 16, RIGHT - 4)):
    units = (x1 - x0) // 8
    x1 = x0 + units * 8
    d.rectangle([x0 - 2, BAND_TOP, x1 + 1, BAND_TOP + 13], fill=DARK + (245,))
    d.line([(x0 - 2, BAND_TOP + 1), (x1 + 1, BAND_TOP + 1)], fill=CREAM + (255,))
    d.line([(x0 - 2, BAND_TOP + 12), (x1 + 1, BAND_TOP + 12)], fill=CREAM + (255,))
    for u in range(units):
        for r, row in enumerate(KEY):
            for c, ch in enumerate(row):
                if ch == "#":
                    d.point((x0 + u * 8 + c, BAND_TOP + 3 + r), fill=CREAM + (255,))

def shield(x, y):
    d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=DARK + (255,))
    d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=BRONZE + (255,))
    d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=GREEN + (255,), outline=GOLD + (255,))
    d.line([(x - 3, y + 3), (x, y - 4), (x + 3, y + 3)], fill=GOLD + (255,), width=2)   # lambda for Lacedaemon
    d.point((x - 4, y - 5), fill=(255, 236, 170, 255))
for x in (SCORER[0] - 9, SCORER[1] + 9):
    shield(x, BAND_TOP + 6)

# ---------- laurel wreath around the logo ----------
R = 40
def leaf(x, y, ang):
    a = math.radians(ang)
    tip = (x + 7 * math.cos(a), y + 7 * math.sin(a))
    side = (math.cos(a + math.pi / 2) * 2.5, math.sin(a + math.pi / 2) * 2.5)
    mid = (x + 3.5 * math.cos(a), y + 3.5 * math.sin(a))
    d.polygon([(x, y), (mid[0] + side[0], mid[1] + side[1]), tip, (mid[0] - side[0], mid[1] - side[1])],
              fill=LEAF + (250,), outline=DARK + (255,))
    d.line([(x, y), ((x + tip[0]) / 2, (y + tip[1]) / 2)], fill=LEAF_LIGHT + (230,))

for sgn in (-1, 1):                                       # left and right branches, bottom to top
    degs = [t if sgn < 0 else 180 - t for t in range(98, 254, 3)]
    d.line([(CX + R * math.cos(math.radians(g)), CY + R * math.sin(math.radians(g))) for g in degs],
           fill=DARK + (255,), width=2)
    for t in range(104, 252, 9):
        deg = t if sgn < 0 else 180 - t
        a = math.radians(deg)
        x, y = CX + R * math.cos(a), CY + R * math.sin(a)
        grow = deg + 90 if sgn < 0 else deg - 90          # tangent pointing up the branch
        leaf(x, y, grow - 38)
        leaf(x, y, grow + 38)
# blue ribbon tying the branches
by = CY + R
d.rectangle([CX - 5, by - 3, CX + 5, by + 2], fill=BLUE + (255,), outline=DARK + (255,))
d.polygon([(CX - 3, by + 2), (CX - 7, by + 6), (CX - 4, by + 7), (CX - 1, by + 3)], fill=BLUE + (255,), outline=DARK + (255,))
d.polygon([(CX + 3, by + 2), (CX + 7, by + 6), (CX + 4, by + 7), (CX + 1, by + 3)], fill=BLUE + (255,), outline=DARK + (255,))

# ---------- Milwaukee lakefront along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
# City Hall: tall tower with a pointed spire
m.rectangle([216, BASE - 22, 224, BASE], fill=255)
m.polygon([(216, BASE - 22), (220, BASE - 31), (224, BASE - 22)], fill=255)
m.rectangle([212, BASE - 10, 228, BASE], fill=255)
for x0, x1, h in ((232, 244, 30), (262, 270, 22), (272, 278, 14)):   # U.S. Bank Center and neighbors
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# Northwestern Mutual Tower: glass slab with a rounded crown
m.rectangle([248, BASE - 26, 258, BASE], fill=255)
m.pieslice([248, BASE - 30, 258, BASE - 22], 180, 360, fill=255)
# Milwaukee Art Museum pavilion
m.rectangle([282, BASE - 6, 328, BASE - 3], fill=255)
sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(CREAM + (225,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(DARK + (240,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
for x0, x1, h in ((232, 244, 30), (248, 258, 24), (262, 270, 22), (216, 224, 20)):   # windows
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=GREEN + (160,))
d.ellipse([218, BASE - 19, 222, BASE - 15], fill=WHITE + (255,), outline=DARK + (255,))   # City Hall clock
# the museum's brise soleil: two white fans of fins spreading from a central spine
MX = 305
for sgn in (-1, 1):
    fan = [(MX, BASE - 7)]
    for k in range(10):
        a = math.radians(-90 + sgn * (26 + k * 6.5))
        fan.append((MX + 22 * math.cos(a), BASE - 7 + 16 * math.sin(a)))
    d.polygon(fan, fill=WHITE + (245,), outline=DARK + (240,))
    for k in range(1, 10):
        a = math.radians(-90 + sgn * (26 + k * 6.5))
        d.line([(MX + 3 * math.cos(a), BASE - 7 + 3 * math.sin(a)),
                (MX + 21 * math.cos(a), BASE - 7 + 15 * math.sin(a))], fill=(170, 186, 196, 255))
d.line([(MX, BASE - 3), (MX + 10, BASE - 30)], fill=DARK + (255,), width=2)              # leaning mast
for k in range(4):                                                                     # stays
    d.line([(MX + 10, BASE - 30), (MX - 8 + k * 6, BASE - 6)], fill=DARK + (150,))
# Lake Michigan in front of the museum
d.rectangle([280, BASE - 2, 330, BASE - 1], fill=WATER + (230,))
for x in range(281, 330, 5):
    d.point((x, BASE - 2), fill=WHITE + (230,))
# Hoan Bridge: tied-arch span
DECK = BASE - 6
d.rectangle([184, DECK, 210, DECK + 1], fill=DARK + (240,))
d.arc([188, DECK - 14, 206, DECK + 14], 180, 360, fill=BLUE + (255,), width=2)
for hx in range(191, 205, 3):
    top = DECK - math.sqrt(max(0, 81 - (hx - 197) ** 2)) * 14 / 9
    d.line([(hx, top + 1), (hx, DECK)], fill=DARK + (200,))
for px in (188, 205):
    d.rectangle([px, DECK + 2, px + 1, BASE], fill=DARK + (230,))
d.line([(182, BASE), (330, BASE)], fill=DARK + (235,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "milwaukee-spartans-overlay.png"))
print("saved")
