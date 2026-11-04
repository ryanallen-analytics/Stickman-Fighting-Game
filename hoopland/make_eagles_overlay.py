"""Generate the Washington Eagles court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (16, 36, 84)
RED = (210, 24, 48)
WHITE = (250, 250, 252)
MARBLE = (236, 234, 228)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def star(cx, cy, r, col, outline=None):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * 0.45
        a = math.radians(-90 + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    if outline:
        d.polygon([(x, y + 1) for x, y in pts], fill=outline)
        d.polygon([(x + 1, y) for x, y in pts], fill=outline)
        d.polygon([(x - 1, y) for x, y in pts], fill=outline)
        d.polygon([(x, y - 1) for x, y in pts], fill=outline)
    d.polygon(pts, fill=col)

# ---------- patriotic bunting along the far apron ----------
FAN_R, FAN_TOP = 12, TOP - 20
for x0, x1 in ((LEFT + 4, SCORER[0] - 2), (SCORER[1] + 2, RIGHT - 4)):
    d.line([(x0, FAN_TOP), (x1, FAN_TOP)], fill=WHITE + (230,))
    count = (x1 - x0) // (FAN_R * 2)
    pad = (x1 - x0 - count * FAN_R * 2) // 2
    for i in range(count):
        cx = x0 + pad + FAN_R + i * FAN_R * 2
        for r, col in ((FAN_R, RED), (FAN_R - 2, WHITE), (FAN_R - 4, RED), (FAN_R - 6, WHITE), (FAN_R - 8, NAVY)):
            d.pieslice([cx - r, FAN_TOP - r, cx + r, FAN_TOP + r], 0, 180, fill=col + (240,))
        for k in (-2, 0, 2):                              # stars in the navy band
            d.point((cx + k, FAN_TOP + 2), fill=WHITE + (255,))
        for k in range(1, 4):                             # pleat lines
            for sgn in (-1, 1):
                a = math.radians(90 + sgn * k * 22)
                d.line([(cx + 4 * math.cos(a), FAN_TOP + 4 * math.sin(a)),
                        (cx + FAN_R * math.cos(a), FAN_TOP + FAN_R * math.sin(a))], fill=NAVY + (90,))
        d.ellipse([cx - 1, FAN_TOP - 1, cx + 1, FAN_TOP + 1], fill=NAVY + (255,))

# ---------- ring of 13 stars around the logo ----------
R, RING_Y = 37, CY - 2                                     # the logo's art sits a little above its center
for k in range(13):
    a = math.radians(-90 + k * 360 / 13)
    star(CX + R * math.cos(a), RING_Y + R * math.sin(a), 3.6, (RED if k % 2 else WHITE) + (245,), outline=NAVY + (235,))

# ---------- Washington skyline along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
# Lincoln Memorial: colonnade under a flat attic
m.rectangle([184, BASE - 14, 214, BASE], fill=255)
m.rectangle([182, BASE - 17, 216, BASE - 14], fill=255)
# U.S. Capitol: wings, drum and dome with the statue
m.rectangle([224, BASE - 10, 288, BASE], fill=255)
m.rectangle([242, BASE - 16, 270, BASE - 10], fill=255)
m.rectangle([246, BASE - 22, 266, BASE - 16], fill=255)
m.pieslice([244, BASE - 36, 268, BASE - 12], 180, 360, fill=255)
m.rectangle([254, BASE - 39, 258, BASE - 34], fill=255)
m.line([(256, BASE - 43), (256, BASE - 39)], fill=255)
# Washington Monument: tall obelisk with a pyramidion
m.polygon([(296, BASE), (298, BASE - 50), (302, BASE - 50), (304, BASE)], fill=255)
m.polygon([(298, BASE - 50), (300, BASE - 55), (302, BASE - 50)], fill=255)
m.rectangle([292, BASE - 3, 308, BASE], fill=255)

sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(MARBLE + (220,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(NAVY + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
for x in range(186, 214, 3):                              # Lincoln's columns
    d.line([(x, BASE - 13), (x, BASE - 1)], fill=NAVY + (130,))
for x in range(226, 288, 3):                              # Capitol windows
    if not 242 <= x <= 270:
        d.point((x, BASE - 6), fill=NAVY + (150,))
for x in range(248, 266, 3):                              # drum columns
    d.line([(x, BASE - 21), (x, BASE - 17)], fill=NAVY + (130,))
for y in (BASE - 30, BASE - 26):                          # dome ribs
    d.line([(248, y), (264, y)], fill=NAVY + (90,))
d.rectangle([299, BASE - 47, 301, BASE - 46], fill=RED + (220,))   # aircraft warning lights
# Reflecting Pool in front of the Lincoln Memorial
d.rectangle([184, BASE - 2, 214, BASE - 1], fill=(90, 140, 200, 220))
d.line([(180, BASE), (312, BASE)], fill=NAVY + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "washington-eagles-overlay.png"))
print("saved")
