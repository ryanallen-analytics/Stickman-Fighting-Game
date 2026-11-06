"""Generate the Dallas Knights court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (12, 36, 80)
INK = (8, 20, 46)
GREEN = (22, 140, 60)
NEON = (60, 220, 110)
SILVER = (206, 212, 222)
STEEL = (130, 140, 156)
STONE = (168, 174, 186)
STONE_DARK = (116, 122, 138)
WHITE = (255, 255, 255)
CREAM = (236, 232, 222)
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

# ---------- castle wall with Lone Star banners on the far apron ----------
WALL_TOP, WALL_BOT = TOP - 16, TOP - 2
for x0, x1 in ((LEFT + 4, SCORER[0] - 4), (SCORER[1] + 4, RIGHT - 4)):
    d.rectangle([x0, WALL_TOP, x1, WALL_BOT], fill=STONE + (245,), outline=INK + (255,))
    for x in range(x0, x1 - 4, 10):                       # merlons
        d.rectangle([x, WALL_TOP - 5, x + 5, WALL_TOP], fill=STONE + (245,), outline=INK + (255,))
    for r, y in enumerate(range(WALL_TOP + 4, WALL_BOT, 4)):   # brick courses
        d.line([(x0 + 1, y), (x1 - 1, y)], fill=STONE_DARK + (220,))
        for x in range(x0 + (4 if r % 2 else 0), x1, 8):
            d.line([(x, y - 3), (x, y)], fill=STONE_DARK + (220,))
    span = x1 - x0
    for k, bx in enumerate((x0 + span // 4, x0 + span // 2, x0 + 3 * span // 4)):   # banners
        col = GREEN if k % 2 == 0 else NAVY
        d.rectangle([bx - 5, WALL_TOP - 1, bx + 5, WALL_TOP], fill=INK + (255,))     # pole
        d.polygon([(bx - 4, WALL_TOP), (bx + 4, WALL_TOP), (bx + 4, WALL_BOT + 1), (bx, WALL_BOT - 2), (bx - 4, WALL_BOT + 1)],
                  fill=col + (255,), outline=INK + (255,))
        d.line([(bx - 3, WALL_TOP + 2), (bx + 3, WALL_TOP + 2)], fill=SILVER + (255,))
        star(bx, WALL_TOP + 7, 3.2, WHITE + (255,))

# ---------- crossed swords behind the logo ----------
def sword(sgn):
    tip = (CX - sgn * 48, CY - 48)
    guard = (CX + sgn * 34, CY + 34)
    ux, uy = (guard[0] - tip[0]) / 116, (guard[1] - tip[1]) / 116   # unit vector tip -> hilt
    px, py = -uy, ux                                                  # perpendicular
    blade = [(tip[0], tip[1]), (tip[0] + ux * 6 + px * 2.5, tip[1] + uy * 6 + py * 2.5),
             (guard[0] + px * 2.5, guard[1] + py * 2.5), (guard[0] - px * 2.5, guard[1] - py * 2.5),
             (tip[0] + ux * 6 - px * 2.5, tip[1] + uy * 6 - py * 2.5)]
    d.polygon(blade, fill=SILVER + (250,), outline=INK + (255,))
    d.line([(tip[0] + ux * 8, tip[1] + uy * 8), (guard[0] - ux * 2, guard[1] - uy * 2)], fill=WHITE + (230,))   # fuller
    d.line([(guard[0] + px * 8, guard[1] + py * 8), (guard[0] - px * 8, guard[1] - py * 8)], fill=INK + (255,), width=4)
    d.line([(guard[0] + px * 7, guard[1] + py * 7), (guard[0] - px * 7, guard[1] - py * 7)], fill=STEEL + (255,), width=2)
    grip_end = (guard[0] + ux * 10, guard[1] + uy * 10)
    d.line([guard, grip_end], fill=INK + (255,), width=4)
    d.line([guard, grip_end], fill=GREEN + (255,), width=2)
    d.ellipse([grip_end[0] - 3, grip_end[1] - 3, grip_end[0] + 3, grip_end[1] + 3], fill=STEEL + (255,), outline=INK + (255,))
sword(1)
sword(-1)

# ---------- Dallas skyline along the near sideline ----------
BASE = BOTTOM
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
m.polygon([(220, BASE), (220, BASE - 24), (226, BASE - 30), (232, BASE - 22), (232, BASE)], fill=255)   # Fountain Place
m.rectangle([236, BASE - 32, 248, BASE], fill=255)                                                     # Bank of America Plaza
m.rectangle([252, BASE - 26, 262, BASE], fill=255)                                                     # Renaissance Tower
m.rectangle([266, BASE - 22, 276, BASE], fill=255)                                                     # Comerica Bank Tower
m.rectangle([268, BASE - 25, 274, BASE - 22], fill=255)
m.rectangle([270, BASE - 27, 272, BASE - 25], fill=255)
m.rectangle([280, BASE - 14, 290, BASE], fill=255)
m.rectangle([292, BASE - 10, 300, BASE], fill=255)
sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(CREAM + (225,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(INK + (240,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
d.rectangle([235, BASE - 33, 249, BASE], outline=NEON + (255,))                         # BofA Plaza's green outline
d.line([(226, BASE - 29), (226, BASE - 2)], fill=STEEL + (200,))                         # Fountain Place facet
for x in (255, 259):                                                                     # Renaissance's antennas
    d.line([(x, BASE - 32), (x, BASE - 27)], fill=INK + (255,))
d.line([(254, BASE - 26), (260, BASE - 20)], fill=NAVY + (150,))                         # its X bracing
d.line([(260, BASE - 26), (254, BASE - 20)], fill=NAVY + (150,))
for x0, x1, h in ((238, 247, 30), (252, 262, 18), (266, 276, 20), (280, 290, 12)):
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=NAVY + (160,))
# Reunion Tower: stalk and the lit ball
RX = 310
d.rectangle([RX - 2, BASE - 24, RX + 2, BASE], fill=CREAM + (240,), outline=INK + (240,))
d.ellipse([RX - 6, BASE - 34, RX + 6, BASE - 22], fill=CREAM + (250,), outline=INK + (255,))
for gx, gy in ((-3, -30), (0, -31), (3, -30), (-4, -27), (0, -27), (4, -27), (-3, -24), (0, -24), (3, -24)):
    d.point((RX + gx, BASE + gy), fill=GREEN + (255,))
# Margaret Hunt Hill Bridge: single white arch with fanned cables
DECK = BASE - 5
d.rectangle([184, DECK, 216, DECK + 1], fill=INK + (240,))
d.arc([190, DECK - 20, 210, DECK + 20], 180, 360, fill=WHITE + (255,), width=2)
d.arc([189, DECK - 21, 211, DECK + 21], 180, 360, fill=INK + (200,), width=1)
for k in range(-3, 4):
    d.line([(200, DECK - 18), (200 + k * 5, DECK)], fill=WHITE + (200,))
for px in (186, 214):
    d.rectangle([px, DECK + 2, px + 1, BASE], fill=INK + (230,))
d.line([(182, BASE), (320, BASE)], fill=INK + (235,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "dallas-knights-overlay.png"))
print("saved")
