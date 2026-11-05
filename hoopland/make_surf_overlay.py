"""Generate the San Diego Surf court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw
import math, os, random

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (30, 42, 120)
LIGHT = (108, 180, 228)
FOAM = (236, 248, 255)
DEEP = (40, 96, 170)
ORANGE = (242, 112, 32)
YELLOW = (248, 192, 64)
SAND = (232, 206, 150)
SAND_DARK = (196, 166, 110)
KELP = (120, 128, 44)
KELP_DARK = (74, 82, 26)
TURTLE = (60, 150, 110)
SHELL = (40, 100, 70)
GRAY = (150, 164, 184)
BLACK = (14, 18, 40)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron
random.seed(619)

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def sprite(rows, palette, x, y, flip=False, scale=1):
    for r, row in enumerate(rows):
        for c, ch in enumerate(row[::-1] if flip else row):
            if ch in palette:
                d.rectangle([x + c * scale, y + r * scale, x + c * scale + scale - 1, y + r * scale + scale - 1],
                            fill=palette[ch] + (255,))

# ---------- far sideline: rolling wave, a surfer and leaping dolphins ----------
WAVE_BASE = TOP - 1
for x0, x1 in ((LEFT + 2, SCORER[0] - 2), (SCORER[1] + 2, RIGHT - 2)):
    for x in range(x0, x1 + 1):
        crest = WAVE_BASE - 7 - round(2.5 * math.sin(x * 0.12) + 1.5 * math.sin(x * 0.31))
        d.line([(x, crest), (x, WAVE_BASE)], fill=LIGHT + (240,))
        d.line([(x, crest + 4), (x, WAVE_BASE)], fill=DEEP + (240,))
        d.point((x, crest), fill=FOAM + (255,))
        if math.sin(x * 0.31) > 0.7:
            d.point((x, crest - 1), fill=FOAM + (255,))
    d.line([(x0, WAVE_BASE), (x1, WAVE_BASE)], fill=NAVY + (255,))

SURFER = (
    "....KK......",
    "....KK......",
    "...KKKK.....",
    "..K.KK.K....",
    ".K..KK..K...",
    "....KK......",
    "...K..K.....",
    "..K....K....",
    "..K....K....",
    "OOOOOOOOOOO.",
    ".YYYYYYYYYYO",
)
sprite(SURFER, {"K": NAVY, "O": ORANGE, "Y": YELLOW}, 140, WAVE_BASE - 25, scale=2)
for k in range(6):                                        # spray off the board
    d.point((137 - k, WAVE_BASE - 9 - (k % 2) * 2), fill=FOAM + (255,))

DOLPHIN = (
    "......GGGG......",
    "....GGGGGGGG....",
    "..GGGGGGGGGGGG..",
    ".GGGG......GGGGG",
    "GGG..........GG.",
    "GG...........G..",
    "G...............",
)
sprite(DOLPHIN, {"G": GRAY}, 300, WAVE_BASE - 26, scale=2)
sprite(DOLPHIN, {"G": GRAY}, 352, WAVE_BASE - 22, flip=True, scale=2)
for x, y in ((298, WAVE_BASE - 12), (386, WAVE_BASE - 10), (334, WAVE_BASE - 11)):
    d.point((x, y), fill=FOAM + (255,))

# ---------- school of fish circling the logo ----------
FISH = ("...LLL..L", ".LLLLLLLL", "LKLLLLLL.", ".LLLLLLLL", "...LLL..L")
R = 42
for k in range(10):
    a = math.radians(-90 + k * 36)
    x, y = CX + R * math.cos(a), CY + R * math.sin(a)
    if y > BOTTOM - 36:                                   # keep clear of the reef below
        continue
    col = LIGHT if k % 2 else ORANGE
    clockwise_right = math.sin(a) < 0                     # top half swims right, bottom half left
    sprite(FISH, {"L": col, "K": BLACK}, round(x - 4), round(y - 2), flip=clockwise_right)
for k in range(10):                                       # bubbles trailing the school
    a = math.radians(-72 + k * 36)
    x, y = CX + (R + 3) * math.cos(a), CY + (R + 3) * math.sin(a)
    if y > BOTTOM - 36:
        continue
    d.ellipse([x - 1, y - 1, x + 1, y + 1], outline=FOAM + (230,))

# ---------- near sideline: kelp forest on the sea floor ----------
BASE = BOTTOM
for x in range(182, 331):                                 # water tint behind the reef
    top = BASE - 34 - round(1.5 * math.sin(x * 0.15))
    fade = min(1.0, (x - 182) / 14, (330 - x) / 14)
    d.line([(x, top), (x, BASE - 1)], fill=(60, 165, 225, int(120 * fade)))
    d.point((x, top), fill=FOAM + (int(160 * fade),))
for x in range(182, 331):                                 # sandy bottom
    top = BASE - 4 - round(1.2 * math.sin(x * 0.09))
    d.line([(x, top), (x, BASE - 1)], fill=SAND + (240,))
    if random.random() < 0.12:
        d.point((x, random.randint(top + 1, BASE - 1)), fill=SAND_DARK + (255,))

def kelp(x, h, phase):
    pts = []
    for k in range(h):
        sx = x + 2 * math.sin(k * 0.25 + phase)
        pts.append((sx, BASE - 4 - k))
    d.line(pts, fill=KELP_DARK + (245,), width=2)
    for k in range(3, h - 1, 4):                          # blades alternate sides
        sx, sy = pts[k]
        side = 1 if (k // 4) % 2 else -1
        d.polygon([(sx, sy), (sx + side * 6, sy - 3), (sx + side * 5, sy - 1), (sx, sy + 2)], fill=KELP + (245,))
        d.point((round(sx + side * 1), round(sy)), fill=YELLOW + (230,))   # gas bladder
for x, h, ph in ((190, 22, 0.0), (202, 28, 1.3), (214, 18, 2.1), (296, 20, 0.7), (310, 29, 1.9), (322, 19, 0.3)):
    kelp(x, h, ph)

GARIBALDI = ("...OO.O", ".OOOOOO", "OKOOOOO", ".OOOOOO", "...OO.O")
for x, y, flip in ((222, BASE - 26, False), (280, BASE - 30, True), (284, BASE - 16, False)):
    sprite(GARIBALDI, {"O": ORANGE, "K": BLACK}, x, y, flip, scale=2)

TURTLE_ART = (
    "......SSSS.......",
    "....SSTSSTSS.....",
    "..TSSSSSSSSSST...",
    ".TTSSTSSSTSSSSTTT",
    "..TSSSSSSSSSST.TK",
    "....SSSSSSSS.....",
    "...TT......TT....",
)
sprite(TURTLE_ART, {"S": SHELL, "T": TURTLE, "K": BLACK}, 240, BASE - 22, scale=2)

STARFISH = ("..Y..", "YYYYY", ".YYY.", "Y...Y")
sprite(STARFISH, {"Y": ORANGE}, 230, BASE - 6)
d.ellipse([268, BASE - 5, 272, BASE - 2], fill=(240, 232, 214, 255), outline=SAND_DARK + (255,))   # sand dollar
for x, y in ((206, BASE - 34), (208, BASE - 38), (205, BASE - 42), (312, BASE - 35), (314, BASE - 40)):   # bubbles
    d.ellipse([x - 1, y - 1, x + 1, y + 1], outline=FOAM + (230,))
d.line([(182, BASE), (330, BASE)], fill=NAVY + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "san-diego-surf-overlay.png"))
print("saved")
