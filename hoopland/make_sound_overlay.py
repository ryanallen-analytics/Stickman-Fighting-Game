"""Generate the Nashville Sound court overlay for Hoop Land (1024x512 transparent PNG)."""
from PIL import Image, ImageDraw
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
TEAL = (64, 236, 236)
DEEP = (18, 150, 160)
NAVY = (12, 30, 70)
INK = (10, 14, 30)
GOLD = (245, 180, 50)
RED = (222, 58, 52)
IVORY = (250, 246, 232)
HERE = os.path.dirname(os.path.abspath(__file__))
CX, CY = 256, 128
LEFT, RIGHT, TOP, BOTTOM = 62, 450, 35, 221   # court edges

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- Nashville skyline rising off the far sideline ----------
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
BASE = TOP

def tower(x0, x1, h):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)

tower(120, 130, 7)
tower(132, 140, 11)
m.polygon([(142, BASE), (142, BASE - 10), (148, BASE - 14), (154, BASE - 10), (154, BASE)], fill=255)  # State Capitol
m.rectangle([147, BASE - 19, 149, BASE - 14], fill=255)
tower(158, 168, 9)
tower(170, 180, 15)
m.polygon([(182, BASE), (182, BASE - 14), (194, BASE - 20), (194, BASE)], fill=255)    # Pinnacle's sloped crown
tower(196, 204, 12)
# AT&T "Batman" Building: two spires with a notch between
tower(208, 226, 16)
m.polygon([(208, BASE - 16), (208, BASE - 21), (212, BASE - 21), (212, BASE - 16)], fill=255)
m.polygon([(222, BASE - 16), (222, BASE - 21), (226, BASE - 21), (226, BASE - 16)], fill=255)
m.line([(209, BASE - 27), (209, BASE - 21)], fill=255, width=2)
m.line([(224, BASE - 27), (224, BASE - 21)], fill=255, width=2)
m.rectangle([213, BASE - 18, 221, BASE - 16], fill=255)
tower(262, 272, 13)
tower(274, 286, 18)                                          # Four Seasons
m.rectangle([278, BASE - 21, 282, BASE - 18], fill=255)
tower(288, 296, 10)
m.pieslice([298, BASE - 8, 330, BASE + 8], 180, 360, fill=255)  # Bridgestone Arena
m.rectangle([318, BASE - 22, 319, BASE - 6], fill=255)         # its radio spire
tower(334, 346, 12)
tower(348, 356, 16)
tower(358, 370, 9)
tower(372, 380, 13)
tower(382, 392, 6)

skyline = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
skyline.paste(TEAL + (205,), (0, 0), mask)
outline = Image.eval(mask.filter(__import__("PIL.ImageFilter", fromlist=["x"]).MaxFilter(3)), lambda v: v)
edge = Image.composite(Image.new("L", mask.size, 0), outline, mask)
skyline.paste(INK + (230,), (0, 0), edge)
img = Image.alpha_composite(img, skyline)
d = ImageDraw.Draw(img)
# lit windows
for x0, x1, h in ((170, 180, 15), (208, 226, 16), (274, 286, 18), (348, 356, 16)):
    for y in range(BASE - h + 3, BASE - 1, 3):
        for x in range(x0 + 2, x1 - 1, 3):
            d.point((x, y), fill=GOLD + (220,))

# ---------- sound waves pulsing out of the center logo ----------
for i, r in enumerate((56, 63, 70)):
    a = 190 - i * 45
    for start, end in ((150, 210), (-30, 30)):
        d.arc([CX - r, CY - r, CX + r, CY + r], start, end, fill=TEAL + (a,), width=2)

# ---------- floating music notes ----------
def note(x, y, col, beamed=False):
    def px(cx, cy, c):
        d.point((cx, cy), fill=c)
    shape = []
    head = [(0, 0), (1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (-1, 2), (0, 2), (1, 2)]
    shape += head
    shape += [(2, -k) for k in range(1, 9)]
    if beamed:
        shape += [(x2 + 7, y2) for x2, y2 in head]
        shape += [(9, -k) for k in range(1, 9)]
        shape += [(xx, -8) for xx in range(2, 10)] + [(xx, -7) for xx in range(2, 10)]
    else:
        shape += [(3, -8), (4, -7), (5, -6), (5, -5), (4, -4)]
    for sx, sy in shape:                          # dark outline first
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            px(x + sx + ox, y + sy + oy, INK + (200,))
    for sx, sy in shape:
        px(x + sx, y + sy, col + (235,))

note(196, 66, TEAL)
note(304, 60, GOLD, beamed=True)
note(190, 186, RED, beamed=True)
note(318, 190, TEAL)

# ---------- piano keys along the near sideline ----------
KX0, KX1, KH = 146, 368, 13
ky = BOTTOM - KH
white = 8
for i, x in enumerate(range(KX0, KX1 - white + 1, white)):
    d.rectangle([x, ky, x + white, BOTTOM], fill=IVORY + (235,), outline=INK + (230,))
    if i % 7 not in (2, 6) and x + white < KX1 - white:   # black keys skip E-F and B-C
        d.rectangle([x + white - 2, ky, x + white + 2, ky + 7], fill=INK + (240,))
d.line([(KX0, ky), (KX0 + ((KX1 - KX0) // white) * white, ky)], fill=TEAL + (230,), width=1)

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "nashville-sound-overlay.png"))
print("saved")
