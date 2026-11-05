"""Generate the LA Stars court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
PURPLE = (85, 37, 130)
DEEP = (52, 20, 84)
GOLD = (253, 185, 39)
GOLD_LIGHT = (255, 222, 120)
WHITE = (255, 255, 255)
SUN = ((255, 214, 80), (255, 170, 60), (250, 120, 90), (232, 80, 130))   # gold to pink
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def star(cx, cy, r, col):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * 0.45
        a = math.radians(-90 + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=col)

def palm(x, base, h, col=PURPLE, lean=1):
    """Palm tree: curved trunk rising from base, fronds fanning out at the top."""
    top = (x + lean * 3, base - h)
    for k in range(h):                                     # trunk with a gentle curve
        t = k / h
        tx = x + lean * 3 * t * t
        d.line([(tx - 1, base - k), (tx + 1 - (1 if t > 0.6 else 0), base - k)], fill=col + (245,))
        if k % 3 == 0:
            d.point((round(tx), base - k), fill=DEEP + (245,))
    for ang, length in ((-170, 9), (-140, 10), (-110, 8), (-70, 8), (-40, 10), (-10, 9), (-155, 7), (-25, 7)):
        a = math.radians(ang)
        ex, ey = top[0] + length * math.cos(a), top[1] + length * math.sin(a)
        droop = (ex + 0.5 * math.cos(a), ey + 3)           # fronds droop at the tips
        d.line([top, (ex, ey), droop], fill=col + (245,), width=2)
    d.ellipse([top[0] - 2, top[1] - 1, top[0] + 2, top[1] + 3], fill=DEEP + (255,))   # coconuts

# ---------- far apron: palms, Griffith Observatory and the pier wheel ----------
APRON = TOP - 1
for x0, x1 in ((LEFT + 4, SCORER[0] - 4), (SCORER[1] + 4, RIGHT - 4)):
    mid = (x0 + x1) // 2
    for i, x in enumerate(range(x0 + 8, x1 - 4, 24)):
        if abs(x - mid) < 22:
            continue
        palm(x, APRON, 15 if i % 2 else 19, lean=1 if i % 2 else -1)
    if x0 < CX:
        # Griffith Observatory on its hill
        d.pieslice([mid - 26, APRON - 8, mid + 26, APRON + 8], 180, 360, fill=DEEP + (200,))
        d.rectangle([mid - 12, APRON - 13, mid + 12, APRON - 7], fill=WHITE + (245,), outline=PURPLE + (255,))
        d.pieslice([mid - 6, APRON - 21, mid + 6, APRON - 9], 180, 360, fill=WHITE + (245,), outline=PURPLE + (255,))
        for sx in (-12, 12):
            d.pieslice([mid + sx - 3, APRON - 17, mid + sx + 3, APRON - 11], 180, 360, fill=WHITE + (245,), outline=PURPLE + (255,))
        d.line([(mid, APRON - 24), (mid, APRON - 21)], fill=PURPLE + (255,))
        for wx in range(mid - 9, mid + 10, 3):
            d.line([(wx, APRON - 12), (wx, APRON - 8)], fill=PURPLE + (160,))
    else:
        # Santa Monica Pier Ferris wheel
        wr, wy = 11, APRON - 14
        d.rectangle([mid - 18, APRON - 3, mid + 18, APRON - 1], fill=DEEP + (230,))
        d.line([(mid - 5, APRON - 3), (mid, wy)], fill=PURPLE + (255,), width=2)
        d.line([(mid + 5, APRON - 3), (mid, wy)], fill=PURPLE + (255,), width=2)
        d.ellipse([mid - wr, wy - wr, mid + wr, wy + wr], outline=PURPLE + (255,), width=2)
        for k in range(10):
            a = math.radians(k * 36)
            ex, ey = mid + wr * math.cos(a), wy + wr * math.sin(a)
            d.line([(mid, wy), (ex, ey)], fill=PURPLE + (200,))
            d.point((round(ex), round(ey)), fill=(232, 80, 130, 255))
        d.point((mid, wy), fill=WHITE + (255,))

# ---------- Walk of Fame star plaques arching over the logo ----------
R = 54
for k in range(7):
    a = math.radians(200 + k * 140 / 6)
    x, y = CX + R * math.cos(a), CY + R * math.sin(a)
    d.rectangle([x - 5, y - 5, x + 5, y + 5], fill=DEEP + (240,), outline=GOLD + (255,))
    star(x, y + 0.5, 4.2, (232, 80, 130, 255))
    star(x, y + 0.5, 2.2, GOLD_LIGHT + (255,))

# ---------- near sideline: synthwave sunset, skyline and palms ----------
BASE = BOTTOM
SR = 30
sun_mask = Image.new("L", (LW, LH), 0)
ImageDraw.Draw(sun_mask).pieslice([CX - SR, BASE - SR, CX + SR, BASE + SR], 180, 360, fill=255)
band_h = SR / len(SUN)
for i, col in enumerate(SUN):                             # banded sun, gold on top to pink below
    band = Image.new("L", (LW, LH), 0)
    y0 = BASE - SR + i * band_h + (1 if i else 0)         # thin gaps between bands
    ImageDraw.Draw(band).rectangle([0, y0, LW, BASE - SR + (i + 1) * band_h - 1], fill=255)
    img.paste(col + (230,), (0, 0), Image.composite(sun_mask, Image.new("L", (LW, LH), 0), band))
d = ImageDraw.Draw(img)
SKY = PURPLE + (240,)
# Wilshire Grand: sail-shaped crown with its spire
d.polygon([(222, BASE), (222, BASE - 22), (230, BASE - 28), (230, BASE)], fill=SKY)
d.line([(230, BASE - 33), (230, BASE - 28)], fill=SKY)
# U.S. Bank Tower: stepped cylinder with the crown
d.rectangle([233, BASE - 26, 243, BASE], fill=SKY)
d.rectangle([235, BASE - 29, 241, BASE - 26], fill=SKY)
d.ellipse([235, BASE - 32, 241, BASE - 27], fill=SKY)
d.rectangle([245, BASE - 10, 250, BASE], fill=SKY)
# Capitol Records Building: stacked records with the needle
d.rectangle([262, BASE - 8, 267, BASE], fill=SKY)
for k in range(6):
    d.ellipse([270 - (1 if k % 2 else 0), BASE - 4 - k * 3, 282 + (1 if k % 2 else 0), BASE - k * 3], fill=SKY)
d.rectangle([272, BASE - 20, 280, BASE - 16], fill=SKY)
d.line([(276, BASE - 28), (276, BASE - 20)], fill=SKY)
d.point((276, BASE - 29), fill=(232, 80, 130, 255))
d.rectangle([285, BASE - 14, 292, BASE], fill=SKY)
for x0, x1, top in ((233, 243, BASE - 24), (285, 292, BASE - 12)):   # lit windows
    for wy in range(top, BASE - 2, 3):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=GOLD_LIGHT + (200,))
palm(204, BASE, 24, lean=1)
palm(214, BASE, 17, lean=-1)
palm(308, BASE, 24, lean=-1)
palm(298, BASE, 17, lean=1)
d.line([(186, BASE), (326, BASE)], fill=DEEP + (240,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "la-stars-overlay.png"))
print("saved")
