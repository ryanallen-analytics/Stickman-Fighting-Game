"""Generate the Cleveland Gladiators court overlay for Hoop Land (1024x512 transparent PNG).

A two-tier Colosseum arcade along the far apron, a faint wood-stain arena
oval around the logo, and a faint stained Cleveland skyline along the
near sideline.
"""
from court_template import COURT
from PIL import Image, ImageDraw
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
WINE = (134, 0, 56)
WINE_DARK = (86, 0, 34)
GOLD = (253, 187, 48)
BLACK = (14, 12, 16)
STAIN = (156, 108, 68)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- two-tier Colosseum arcade along the far apron ----------
WALL_TOP, WALL_BOT = TOP - 19, TOP - 2
def arch_opening(x, top, w, h):
    d.rectangle([x, top + w // 2, x + w - 1, top + h], fill=BLACK + (255,))
    d.pieslice([x, top, x + w - 1, top + w], 180, 360, fill=BLACK + (255,))

for x0, x1 in ((LEFT + 4, SCORER[0] - 4), (SCORER[1] + 4, RIGHT - 4)):
    bays = (x1 - x0) // 9
    x1 = x0 + bays * 9
    d.rectangle([x0, WALL_TOP, x1, WALL_BOT], fill=WINE + (250,))
    for y in (WALL_TOP, WALL_TOP + 7, WALL_BOT):            # gold cornices between the tiers
        d.line([(x0, y), (x1, y)], fill=GOLD + (255,))
    for k in range(bays):
        bx = x0 + k * 9
        arch_opening(bx + 2, WALL_TOP + 2, 5, 4)            # upper tier: small arches
        arch_opening(bx + 2, WALL_TOP + 9, 5, 7)            # lower tier: tall arches
        d.line([(bx, WALL_TOP + 8), (bx, WALL_BOT - 1)], fill=WINE_DARK + (255,))   # pilasters
    d.line([(x1, WALL_TOP + 8), (x1, WALL_BOT - 1)], fill=WINE_DARK + (255,))

# ---------- faint arena oval around the logo ----------
OUT, INN = (66, 40), (50, 29)
SEAT = STAIN + (95,)
d.ellipse([CX - OUT[0], CY - OUT[1], CX + OUT[0], CY + OUT[1]], outline=SEAT, width=2)
d.ellipse([CX - INN[0], CY - INN[1], CX + INN[0], CY + INN[1]], outline=SEAT)
d.ellipse([CX - (OUT[0] + INN[0]) // 2, CY - (OUT[1] + INN[1]) // 2,
           CX + (OUT[0] + INN[0]) // 2, CY + (OUT[1] + INN[1]) // 2], outline=STAIN + (55,))   # mid-tier walkway
for deg in range(0, 360, 15):                              # seating sections
    a = math.radians(deg)
    d.line([(CX + INN[0] * math.cos(a), CY + INN[1] * math.sin(a)),
            (CX + OUT[0] * math.cos(a), CY + OUT[1] * math.sin(a))], fill=SEAT)

# ---------- faint Cleveland skyline stained into the floor ----------
BASE = BOTTOM
sky = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(sky)
# Hope Memorial Bridge with two Guardians of Traffic pylons
m.rectangle([154, BASE - 7, 200, BASE - 5], fill=255)
for px in (162, 192):
    m.rectangle([px - 2, BASE - 18, px + 2, BASE], fill=255)
    m.rectangle([px - 1, BASE - 23, px + 1, BASE - 18], fill=255)      # the guardian figure
    m.ellipse([px - 1, BASE - 25, px + 1, BASE - 23], fill=255)
for ax in (168, 180):
    m.arc([ax - 6, BASE - 5, ax + 6, BASE + 7], 180, 360, fill=255, width=2)
# Terminal Tower: stepped tower with its spire
m.rectangle([200, BASE - 12, 224, BASE], fill=255)
m.rectangle([206, BASE - 26, 218, BASE], fill=255)
m.rectangle([209, BASE - 32, 215, BASE], fill=255)
m.polygon([(209, BASE - 32), (212, BASE - 38), (215, BASE - 32)], fill=255)
for x0, x1, h in ((228, 236, 20), (238, 246, 14), (266, 274, 18), (276, 284, 24), (300, 308, 16)):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# Key Tower: tallest, with a pyramid crown and mast
m.rectangle([286, BASE - 30, 296, BASE], fill=255)
m.polygon([(286, BASE - 30), (291, BASE - 36), (296, BASE - 30)], fill=255)
m.line([(291, BASE - 41), (291, BASE - 36)], fill=255)
# Rock & Roll Hall of Fame: glass pyramid with its tower
m.polygon([(318, BASE), (334, BASE - 16), (350, BASE)], fill=255)
m.rectangle([346, BASE - 20, 352, BASE], fill=255)
m.rectangle([352, BASE - 8, 362, BASE], fill=255)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (100,), (0, 0), sky)
img.alpha_composite(layer)
d = ImageDraw.Draw(img)
for k in range(1, 4):                                      # glass panes on the pyramid
    d.line([(318 + k * 4, BASE - k * 4), (350 - k * 4, BASE - k * 4)], fill=STAIN + (60,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "cleveland-gladiators-overlay.png"))
print("saved")
