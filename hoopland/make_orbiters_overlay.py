"""Generate the Orlando Orbiters court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os, random

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
BLUE = (24, 140, 224)
SKY = (120, 200, 250)
DEEP = (10, 60, 130)
BLACK = (14, 14, 22)
SILVER = (200, 206, 214)
STEEL = (130, 138, 150)
WHITE = (255, 255, 255)
FLAME = (250, 150, 40)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron
random.seed(407)

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def planet(x, y, r, body, shade):
    d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=BLACK + (255,))
    d.ellipse([x - r, y - r, x + r, y + r], fill=body + (255,))
    d.pieslice([x - r, y - r, x + r, y + r], 0, 120, fill=shade + (255,))
    d.point((round(x - r / 2), round(y - r / 2)), fill=WHITE + (255,))

# ---------- starfield on the far apron ----------
for _ in range(70):
    x, y = random.randint(LEFT + 2, RIGHT - 2), random.randint(TOP - 30, TOP - 3)
    if SCORER[0] - 2 <= x <= SCORER[1] + 2:
        continue
    d.point((x, y), fill=random.choice((WHITE, SILVER, SKY)) + (random.choice((140, 200, 255)),))
for x, y in ((120, TOP - 22), (214, TOP - 12), (300, TOP - 24), (392, TOP - 10)):   # twinkles
    d.line([(x - 2, y), (x + 2, y)], fill=WHITE + (230,))
    d.line([(x, y - 2), (x, y + 2)], fill=WHITE + (230,))
# ringed planet
px, py = 160, TOP - 17
d.ellipse([px - 14, py - 4, px + 14, py + 4], outline=SILVER + (255,))
planet(px, py, 8, BLUE, DEEP)
d.arc([px - 14, py - 4, px + 14, py + 4], 0, 180, fill=SILVER + (255,))
# satellite with solar panels
sx, sy = 352, TOP - 18
d.rectangle([sx - 3, sy - 3, sx + 3, sy + 3], fill=SILVER + (255,), outline=BLACK + (255,))
for side in (-1, 1):
    x0 = sx + side * 5
    d.line([(sx + side * 3, sy), (x0, sy)], fill=SILVER + (255,))
    d.rectangle(sorted([x0, x0 + side * 12])[0:1] + [sy - 3] + sorted([x0, x0 + side * 12])[1:] + [sy + 3],
                fill=DEEP + (255,), outline=SKY + (255,))
    for gx in range(1, 12, 3):
        d.line([(x0 + side * gx, sy - 3), (x0 + side * gx, sy + 3)], fill=SKY + (160,))
d.line([(sx, sy - 3), (sx, sy - 7)], fill=SILVER + (255,))
d.point((sx, sy - 8), fill=FLAME + (255,))

# ---------- orbits around the logo ----------
def orbit_point(rx, ry, tilt, t):
    x, y = rx * math.cos(t), ry * math.sin(t)
    c, s = math.cos(tilt), math.sin(tilt)
    return CX + x * c - y * s, CY + x * s + y * c

ORBITS = ((54, 16, math.radians(-18), BLUE), (50, 13, math.radians(16), SILVER))
for rx, ry, tilt, col in ORBITS:
    pts = [orbit_point(rx, ry, tilt, math.radians(a)) for a in range(0, 361, 3)]
    for i, (x, y) in enumerate(pts):
        if i % 2 == 0:                                    # dashed path
            d.point((round(x), round(y)), fill=col + (230,))
            d.point((round(x) + 1, round(y)), fill=col + (230,))
planet(*orbit_point(54, 16, math.radians(-18), math.radians(200)), 4, BLUE, DEEP)
planet(*orbit_point(54, 16, math.radians(-18), math.radians(20)), 3, SILVER, STEEL)
planet(*orbit_point(50, 13, math.radians(16), math.radians(150)), 3, SKY, BLUE)
planet(*orbit_point(50, 13, math.radians(16), math.radians(-30)), 2, WHITE, SILVER)

# ---------- Orlando skyline along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
for x0, x1, h in ((214, 222, 16), (224, 234, 30), (236, 246, 24), (248, 256, 34), (258, 266, 20)):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
m.polygon([(248, BASE - 34), (252, BASE - 39), (256, BASE - 34)], fill=255)   # tallest tower's crown
m.line([(252, BASE - 43), (252, BASE - 39)], fill=255)
sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(SILVER + (215,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(BLACK + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
for x0, x1, h in ((214, 222, 16), (224, 234, 30), (236, 246, 24), (248, 256, 34), (258, 266, 20)):
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=DEEP + (190,))

# rocket on its launch tower (Space Coast)
RX = 200
d.rectangle([RX - 10, BASE - 3, RX + 10, BASE], fill=STEEL + (235,), outline=BLACK + (235,))
d.rectangle([RX - 9, BASE - 36, RX - 6, BASE - 3], outline=BLACK + (235,), fill=STEEL + (200,))   # tower
for y in range(BASE - 34, BASE - 4, 4):
    d.line([(RX - 9, y), (RX - 6, y + 3)], fill=BLACK + (200,))
d.line([(RX - 6, BASE - 26), (RX - 2, BASE - 26)], fill=BLACK + (235,))                         # access arm
d.rectangle([RX - 2, BASE - 30, RX + 3, BASE - 5], fill=WHITE + (245,), outline=BLACK + (245,))
d.polygon([(RX - 2, BASE - 30), (RX + 0.5, BASE - 37), (RX + 3, BASE - 30)], fill=BLUE + (255,), outline=BLACK + (255,))
d.rectangle([RX - 2, BASE - 20, RX + 3, BASE - 18], fill=BLUE + (255,))
for fx in (-4, 5):                                                                              # fins
    d.polygon([(RX + (fx if fx < 0 else 3), BASE - 10), (RX + fx, BASE - 5), (RX + (-2 if fx < 0 else 3), BASE - 5)],
              fill=BLUE + (255,), outline=BLACK + (255,))
d.rectangle([RX - 1, BASE - 5, RX + 2, BASE - 4], fill=FLAME + (255,))

# Lake Eola fountain
FX = 286
d.ellipse([FX - 14, BASE - 5, FX + 14, BASE + 1], fill=BLUE + (200,), outline=BLACK + (220,))
d.polygon([(FX - 7, BASE - 3), (FX - 4, BASE - 12), (FX + 4, BASE - 12), (FX + 7, BASE - 3)], fill=WHITE + (240,), outline=BLACK + (240,))
d.polygon([(FX - 4, BASE - 12), (FX, BASE - 19), (FX + 4, BASE - 12)], fill=WHITE + (240,), outline=BLACK + (240,))
for k, y in enumerate((BASE - 9, BASE - 6)):
    d.line([(FX - 5 + k, y), (FX + 5 - k, y)], fill=SKY + (230,))
for a in (-60, -30, 0, 30, 60):                                                               # spray
    ang = math.radians(-90 + a)
    d.point((round(FX + 7 * math.cos(ang)), round(BASE - 20 + 4 * math.sin(ang))), fill=SKY + (230,))

# observation wheel
WX, WY, WR = 316, BASE - 18, 13
d.line([(WX - 6, BASE), (WX, WY)], fill=BLACK + (235,), width=2)
d.line([(WX + 6, BASE), (WX, WY)], fill=BLACK + (235,), width=2)
d.ellipse([WX - WR, WY - WR, WX + WR, WY + WR], outline=BLACK + (240,), width=2)
d.ellipse([WX - WR + 1, WY - WR + 1, WX + WR - 1, WY + WR - 1], outline=SILVER + (240,))
for k in range(8):
    a = math.radians(k * 45)
    ex, ey = WX + WR * math.cos(a), WY + WR * math.sin(a)
    d.line([(WX, WY), (ex, ey)], fill=STEEL + (200,))
    d.rectangle([ex - 1, ey - 1, ex + 1, ey + 1], fill=BLUE + (255,))
d.point((WX, WY), fill=BLACK + (255,))
d.line([(184, BASE), (332, BASE)], fill=BLACK + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "orlando-orbiters-overlay.png"))
print("saved")
