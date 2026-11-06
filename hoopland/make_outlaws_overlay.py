"""Generate the OKC Outlaws court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (16, 36, 82)
ORANGE = (232, 84, 40)
GOLD = (250, 190, 40)
GOLD_DARK = (196, 136, 20)
WOOD = (150, 98, 56)
WOOD_DARK = (96, 60, 30)
PARCH = (242, 224, 178)
INK = (60, 36, 20)
TAN = (214, 180, 120)
DUST = (232, 210, 166)
CACTUS = (70, 140, 70)
CACTUS_DARK = (40, 92, 44)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

GLYPHS = {
    "W": ("#...#", "#...#", "#.#.#", "#.#.#", ".#.#."), "A": (".#.", "#.#", "###", "#.#", "#.#"),
    "N": ("##.", "#.#", "#.#", "#.#", "#.#"), "T": ("###", ".#.", ".#.", ".#.", ".#."),
    "E": ("###", "#..", "##.", "#..", "###"), "D": ("##.", "#.#", "#.#", "#.#", "##."),
    "$": (".##", "##.", ".#.", ".##", "##."), "1": (".#.", "##.", ".#.", ".#.", "###"),
    "0": ("###", "#.#", "#.#", "#.#", "###"),
}
def text(word, x, y, col):
    for ch in word:
        for r, row in enumerate(GLYPHS[ch]):
            for c, px in enumerate(row):
                if px == "#":
                    d.point((x + c, y + r), fill=col + (255,))
        x += len(GLYPHS[ch][0]) + 1

# ---------- ranch fence with WANTED posters on the far apron ----------
RAIL_Y = (TOP - 14, TOP - 7)
for x0, x1 in ((LEFT + 4, SCORER[0] - 4), (SCORER[1] + 4, RIGHT - 4)):
    for y in RAIL_Y:
        d.rectangle([x0, y, x1, y + 2], fill=WOOD + (245,), outline=WOOD_DARK + (255,))
    for x in range(x0, x1 + 1, 20):
        d.rectangle([x, TOP - 18, x + 3, TOP - 2], fill=WOOD + (250,), outline=WOOD_DARK + (255,))
        d.point((x + 1, TOP - 16), fill=WOOD_DARK + (255,))
    for px in (x0 + (x1 - x0) // 3 - 14, x0 + 2 * (x1 - x0) // 3 - 14):
        py = TOP - 25
        d.polygon([(px, py), (px + 28, py + 1), (px + 27, py + 21), (px + 1, py + 20)], fill=PARCH + (255,), outline=INK + (255,))
        text("WANTED", px + 2, py + 2, INK)
        d.ellipse([px + 11, py + 10, px + 17, py + 16], fill=INK + (255,))             # outlaw mugshot
        d.rectangle([px + 10, py + 9, px + 18, py + 10], fill=INK + (255,))            # hat brim
        d.rectangle([px + 12, py + 7, px + 16, py + 9], fill=INK + (255,))
        d.rectangle([px + 11, py + 13, px + 17, py + 15], fill=ORANGE + (255,))        # bandana
        d.point((px + 14, py + 1), fill=(120, 120, 130, 255))                         # nail

# ---------- spur rowel behind the logo ----------
R_IN, R_OUT, POINTS = 22, 36, 12
pts = []
for k in range(POINTS * 2):
    r = R_OUT if k % 2 == 0 else R_IN
    a = math.radians(-90 + k * 180 / POINTS)
    pts.append((CX + r * math.cos(a), CY + r * math.sin(a)))
d.polygon([(x, y + 1) for x, y in pts], fill=NAVY + (255,))
d.polygon(pts, fill=GOLD + (250,), outline=NAVY + (255,))
for k in range(0, POINTS * 2, 2):                         # bevel down each spike
    x, y = pts[k]
    d.line([(CX + (x - CX) * 0.75, CY + (y - CY) * 0.75), (x, y)], fill=GOLD_DARK + (255,))
d.ellipse([CX - R_IN, CY - R_IN, CX + R_IN, CY + R_IN], fill=GOLD_DARK + (255,), outline=NAVY + (255,))

# ---------- prairie along the near sideline ----------
BASE = BOTTOM
for x in range(182, 331):                                 # dusty ground with grass tufts
    top = BASE - 3 - round(1.0 * math.sin(x * 0.11))
    d.line([(x, top), (x, BASE - 1)], fill=TAN + (235,))
    if x % 7 == 0:
        d.line([(x, top), (x - 1, top - 3)], fill=CACTUS_DARK + (230,))
        d.line([(x, top), (x + 1, top - 2)], fill=CACTUS_DARK + (230,))

# windmill
WX = 196
for sgn in (-1, 1):
    d.line([(WX + sgn * 6, BASE - 3), (WX + sgn * 1, BASE - 30)], fill=NAVY + (240,))
for y in range(BASE - 27, BASE - 3, 6):
    d.line([(WX - 6 + (BASE - 3 - y) / 5.4, y), (WX + 6 - (BASE - 3 - y) / 5.4, y)], fill=NAVY + (200,))
HUB = (WX, BASE - 32)
for k in range(12):
    a = math.radians(k * 30)
    d.line([HUB, (HUB[0] + 8 * math.cos(a), HUB[1] + 8 * math.sin(a))], fill=NAVY + (240,))
d.ellipse([HUB[0] - 8, HUB[1] - 8, HUB[0] + 8, HUB[1] + 8], outline=NAVY + (240,))
d.polygon([(HUB[0] - 1, HUB[1]), (HUB[0] - 14, HUB[1] - 4), (HUB[0] - 14, HUB[1] + 2)], fill=ORANGE + (240,), outline=NAVY + (255,))  # tail vane

# saguaro and prickly pear
def saguaro(x, h):
    d.rounded_rectangle([x - 2, BASE - h, x + 2, BASE - 2], 2, fill=CACTUS + (250,), outline=CACTUS_DARK + (255,))
    d.rounded_rectangle([x - 7, BASE - h + 6, x - 4, BASE - h + 13], 1, fill=CACTUS + (250,), outline=CACTUS_DARK + (255,))
    d.rectangle([x - 5, BASE - h + 11, x - 2, BASE - h + 13], fill=CACTUS + (250,))
    d.rounded_rectangle([x + 4, BASE - h + 3, x + 7, BASE - h + 10], 1, fill=CACTUS + (250,), outline=CACTUS_DARK + (255,))
    d.rectangle([x + 2, BASE - h + 8, x + 5, BASE - h + 10], fill=CACTUS + (250,))
saguaro(214, 20)
saguaro(304, 16)
for cx_, cy_ in ((226, BASE - 5), (230, BASE - 8), (233, BASE - 5)):
    d.ellipse([cx_ - 3, cy_ - 2, cx_ + 3, cy_ + 2], fill=CACTUS + (250,), outline=CACTUS_DARK + (255,))
d.point((230, BASE - 11), fill=ORANGE + (255,))

# outlaw galloping on horseback, kicking up dust
OX, OB = 252, BASE - 3
for x, y, r in ((OX - 3, OB - 4, 3), (OX - 8, OB - 3, 2), (OX - 1, OB - 1, 2)):
    d.ellipse([x - r, y - r, x + r, y + r], fill=DUST + (220,))
HORSE = NAVY + (255,)
d.ellipse([OX + 6, OB - 20, OX + 26, OB - 12], fill=HORSE)                                   # body
d.polygon([(OX + 22, OB - 19), (OX + 26, OB - 27), (OX + 30, OB - 27), (OX + 27, OB - 15)], fill=HORSE)   # neck
d.polygon([(OX + 26, OB - 29), (OX + 34, OB - 25), (OX + 33, OB - 22), (OX + 27, OB - 24)], fill=HORSE)   # head
d.point((OX + 27, OB - 30), fill=HORSE)
d.line([(OX + 8, OB - 18), (OX + 2, OB - 16), (OX, OB - 11)], fill=HORSE, width=2)            # tail
for leg in (((OX + 24, OB - 13), (OX + 30, OB - 8), (OX + 33, OB - 6)),
            ((OX + 22, OB - 13), (OX + 26, OB - 6), (OX + 25, OB - 1)),
            ((OX + 9, OB - 13), (OX + 4, OB - 7), (OX, OB - 6)),
            ((OX + 11, OB - 13), (OX + 11, OB - 6), (OX + 8, OB - 1))):
    d.line(leg, fill=HORSE, width=2)
d.polygon([(OX + 14, OB - 20), (OX + 19, OB - 20), (OX + 18, OB - 28), (OX + 14, OB - 28)], fill=HORSE)   # rider
d.ellipse([OX + 14, OB - 32, OX + 18, OB - 28], fill=HORSE)
d.rectangle([OX + 11, OB - 33, OX + 21, OB - 32], fill=HORSE)                                  # hat brim
d.rectangle([OX + 13, OB - 36, OX + 19, OB - 33], fill=HORSE)
d.line([(OX + 18, OB - 26), (OX + 25, OB - 23)], fill=HORSE)                                    # reins arm
d.line([(OX + 16, OB - 20), (OX + 19, OB - 15), (OX + 17, OB - 13)], fill=HORSE, width=2)       # leg
d.polygon([(OX + 14, OB - 28), (OX + 18, OB - 28), (OX + 11, OB - 25)], fill=ORANGE + (255,))   # bandana tail
d.rectangle([OX + 14, OB - 29, OX + 18, OB - 28], fill=ORANGE + (255,))

# Oklahoma oil derrick
DX = 320
for sgn in (-1, 1):
    d.line([(DX + sgn * 7, BASE - 3), (DX + sgn * 1, BASE - 34)], fill=NAVY + (240,))
for k, y in enumerate(range(BASE - 30, BASE - 3, 5)):
    half = 1 + (y - (BASE - 34)) * 6 / 31
    d.line([(DX - half, y), (DX + half, y)], fill=NAVY + (200,))
    d.line([(DX - half, y), (DX + half * (1 if k % 2 else -1) * 0.9, y + 5)], fill=NAVY + (150,))
d.rectangle([DX - 2, BASE - 36, DX + 2, BASE - 34], fill=NAVY + (255,))

# tumbleweed rolling past
TX, TY = 290, BASE - 6
for k in range(8):
    a = math.radians(k * 45)
    d.arc([TX - 4, TY - 4, TX + 4, TY + 4], k * 45, k * 45 + 70, fill=WOOD + (255,))
    d.line([(TX, TY), (TX + 3 * math.cos(a), TY + 3 * math.sin(a))], fill=WOOD_DARK + (200,))
for k in range(3):
    d.point((TX + 7 + k * 2, TY + 3), fill=DUST + (230,))
d.line([(182, BASE), (330, BASE)], fill=NAVY + (235,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "okc-outlaws-overlay.png"))
print("saved")
