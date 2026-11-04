"""Generate the San Antonio Sheriffs court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
BLACK = (18, 18, 24)
SILVER = (192, 198, 208)
STEEL = (110, 118, 132)
STONE = (226, 214, 188)
ROPE = (196, 154, 92)
ROPE_DARK = (120, 86, 44)
RIVER = (40, 170, 170)
FIESTA = ((233, 58, 140), (32, 190, 200), (250, 204, 40), (245, 128, 40), (140, 80, 200), (90, 190, 80))
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- papel picado strung along the far apron ----------
def flag(x, y, col, k):
    d.rectangle([x, y, x + 9, y + 9], fill=col + (240,))
    for sx in range(x, x + 10, 2):                       # scalloped hem
        d.point((sx, y + 9), fill=(0, 0, 0, 0))
    holes = ((2, 2), (6, 2), (4, 5), (2, 7), (6, 7)) if k % 2 else ((4, 2), (2, 4), (6, 4), (4, 6))
    for hx, hy in holes:                                  # cut-paper pattern
        d.point((x + hx, y + hy), fill=(0, 0, 0, 0))
        d.point((x + hx + 1, y + hy), fill=(0, 0, 0, 0))

LINE_Y = TOP - 26
k = 0
for x0, x1 in ((LEFT + 4, SCORER[0] - 4), (SCORER[1] + 4, RIGHT - 4)):
    span = x1 - x0
    pts = [(x, LINE_Y + 4 * math.sin(math.pi * (x - x0) / span)) for x in range(x0, x1 + 1)]
    d.line(pts, fill=SILVER + (220,))
    for x in range(x0 + 2, x1 - 10, 13):
        sag = LINE_Y + 4 * math.sin(math.pi * (x + 5 - x0) / span)
        flag(x, round(sag) + 1, FIESTA[k % len(FIESTA)], k)
        k += 1
    for x in (x0, x1):
        d.rectangle([x - 1, LINE_Y - 3, x + 1, TOP - 4], fill=STEEL + (230,))

# ---------- lasso circling the logo ----------
R = 37
for t in range(0, 360, 2):
    if 64 <= t <= 82:                                     # gap where the honda knot sits
        continue
    a = math.radians(t)
    x, y = CX + R * math.cos(a), CY + R * math.sin(a)
    d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=ROPE + (240,))
for t in range(0, 360, 6):                                # twist marks
    if 60 <= t <= 86:
        continue
    a = math.radians(t)
    x, y = CX + R * math.cos(a), CY + R * math.sin(a)
    d.point((round(x), round(y)), fill=ROPE_DARK + (255,))
kx, ky = CX + R * math.cos(math.radians(73)), CY + R * math.sin(math.radians(73))
d.ellipse([kx - 3, ky - 3, kx + 3, ky + 3], fill=ROPE + (255,), outline=ROPE_DARK + (255,))
tail = [(kx + 2, ky + 2), (kx + 10, ky + 6), (kx + 16, ky + 4), (kx + 22, ky + 8)]   # loose end
d.line(tail, fill=ROPE + (240,), width=3)
for x, y in tail[1:]:
    d.point((round(x), round(y)), fill=ROPE_DARK + (255,))

# ---------- San Antonio skyline along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
# Tower Life Building: brick shaft with stepped octagonal crown
m.rectangle([218, BASE - 28, 230, BASE], fill=255)
m.rectangle([220, BASE - 32, 228, BASE - 28], fill=255)
m.polygon([(220, BASE - 32), (224, BASE - 38), (228, BASE - 32)], fill=255)
# Tower of the Americas: needle with the observation pod
m.rectangle([239, BASE - 30, 242, BASE], fill=255)
m.rectangle([235, BASE - 35, 246, BASE - 31], fill=255)
m.rectangle([237, BASE - 37, 244, BASE - 35], fill=255)
m.line([(240, BASE - 40), (240, BASE - 37)], fill=255)
for x0, x1, h in ((250, 258, 16), (260, 270, 24), (272, 280, 14), (282, 290, 20)):   # downtown
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# The Alamo: chapel facade with its curved parapet
m.rectangle([296, BASE - 12, 328, BASE], fill=255)
m.polygon([(304, BASE - 12), (306, BASE - 16), (309, BASE - 18), (312, BASE - 21),
           (315, BASE - 18), (318, BASE - 16), (320, BASE - 12)], fill=255)

sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(STONE + (215,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(BLACK + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
d.rectangle([219, BASE - 27, 229, BASE - 1], fill=(170, 92, 64, 200))          # Tower Life brick
for x0, x1, h in ((218, 230, 28), (250, 258, 16), (260, 270, 24), (272, 280, 14), (282, 290, 20)):
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=BLACK + (150,))
d.rectangle([236, BASE - 34, 245, BASE - 33], fill=STEEL + (230,))               # pod windows
# Alamo doorway, windows and columns
d.pieslice([309, BASE - 9, 315, BASE - 3], 180, 360, fill=BLACK + (220,))
d.rectangle([309, BASE - 6, 315, BASE - 1], fill=BLACK + (220,))
for x in (302, 322):
    d.rectangle([x - 1, BASE - 8, x + 1, BASE - 5], fill=BLACK + (180,))
for x in (306, 318):
    d.line([(x, BASE - 10), (x, BASE - 1)], fill=STEEL + (200,))

# River Walk: arched stone footbridge over the water
d.rectangle([182, BASE - 4, 214, BASE - 1], fill=RIVER + (220,))
for x in range(183, 214, 4):
    d.point((x, BASE - 3), fill=(200, 240, 240, 230))
d.arc([186, BASE - 14, 210, BASE + 6], 180, 360, fill=BLACK + (235,), width=3)
d.arc([187, BASE - 13, 209, BASE + 5], 180, 360, fill=STONE + (235,), width=1)
d.line([(182, BASE - 4), (214, BASE - 4)], fill=STONE + (230,))
d.line([(182, BASE), (330, BASE)], fill=BLACK + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "san-antonio-sheriffs-overlay.png"))
print("saved")
