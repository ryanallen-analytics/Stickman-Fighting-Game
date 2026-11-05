"""Generate the Miami Tides court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
PINK = (224, 64, 168)
CYAN = (64, 184, 232)
DEEP = (20, 96, 150)
BLACK = (16, 14, 24)
WHITE = (255, 255, 255)
PASTELS = ((250, 206, 228), (196, 236, 250), (178, 240, 214), (255, 226, 150))
PALM = (20, 70, 80)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- curling waves along the far sideline ----------
CREST = (
    "......######....",
    "....###CCCCW#...",
    "...##CCCCCCWW#..",
    "..##CCC###CCW#..",
    ".##CCC#....#W#..",
    ".#CCC#.......#..",
    "#CCCC#..........",
    "#CCCCC#.........",
    "#CCCCCC##.......",
    "#DDCCCCCC###....",
    "#DDDDCCCCCCC####",
)
PAL = {"#": BLACK, "C": CYAN, "W": WHITE, "D": DEEP}
def crest(x, y):
    for r, row in enumerate(CREST):
        for c, ch in enumerate(row):
            if ch in PAL:
                d.point((x + c, y + r), fill=PAL[ch] + (245,))
for x0, x1 in ((LEFT + 2, SCORER[0] - 2), (SCORER[1] + 2, RIGHT - 2)):
    for x in range(x0, x1 - 15, 16):
        crest(x, TOP - 12)
    d.rectangle([x0, TOP - 2, x0 + ((x1 - x0 - 15) // 16) * 16 + 15, TOP - 1], fill=DEEP + (245,))

# ---------- tide ripples around the logo ----------
for r, col, phase in ((42, CYAN, 0), (48, PINK, 12)):
    for start in range(phase, 360 + phase, 24):           # dashed ripple: 16 degrees on, 8 off
        mid = math.radians(start + 8)
        if CY + r * math.sin(mid) > BOTTOM - 34:          # leave room for the skyline
            continue
        d.arc([CX - r, CY - r, CX + r, CY + r], start, start + 16, fill=col + (235,), width=2)

# ---------- Ocean Drive along the near sideline ----------
BASE = BOTTOM - 5
def deco(x0, x1, h, fill, neon, crown):
    d.rectangle([x0, BASE - h, x1, BASE], fill=fill + (240,), outline=BLACK + (240,))
    mid = (x0 + x1) // 2
    if crown == "step":                                    # stepped Art Deco parapet
        d.rectangle([mid - 4, BASE - h - 3, mid + 4, BASE - h], fill=fill + (240,), outline=BLACK + (240,))
        d.rectangle([mid - 2, BASE - h - 6, mid + 2, BASE - h - 3], fill=fill + (240,), outline=BLACK + (240,))
    elif crown == "fin":                                  # vertical neon sign fin
        d.rectangle([mid - 1, BASE - h - 9, mid + 1, BASE - h + 6], fill=BLACK + (240,))
        d.line([(mid, BASE - h - 8), (mid, BASE - h + 5)], fill=neon + (255,))
    elif crown == "round":
        d.pieslice([x0, BASE - h - 4, x1, BASE - h + 4], 180, 360, fill=fill + (240,), outline=BLACK + (240,))
    d.line([(x0 + 1, BASE - h + 2), (x1 - 1, BASE - h + 2)], fill=neon + (255,))          # neon trim
    for wy in range(BASE - h + 5, BASE - 3, 4):            # eyebrow windows
        for wx in range(x0 + 2, x1 - 2, 4):
            d.rectangle([wx, wy, wx + 1, wy + 1], fill=DEEP + (200,))
        d.line([(x0 + 1, wy - 1), (x1 - 1, wy - 1)], fill=BLACK + (90,))
    d.rectangle([mid - 1, BASE - 3, mid + 1, BASE], fill=BLACK + (220,))                  # door

deco(214, 230, 16, PASTELS[0], CYAN, "step")
deco(232, 244, 22, PASTELS[1], PINK, "fin")
deco(246, 266, 14, PASTELS[3], PINK, "round")
deco(268, 280, 20, PASTELS[2], PINK, "fin")
deco(282, 298, 15, PASTELS[0], CYAN, "step")

def palm(x, h, lean):
    for k in range(h):
        t = k / h
        d.point((round(x + lean * 3 * t * t), BASE - k), fill=PALM + (245,))
        d.point((round(x + lean * 3 * t * t) + 1, BASE - k), fill=PALM + (245,))
    top = (x + lean * 3, BASE - h)
    for ang, length in ((-170, 8), (-140, 9), (-110, 7), (-70, 7), (-40, 9), (-10, 8)):
        a = math.radians(ang)
        ex, ey = top[0] + length * math.cos(a), top[1] + length * math.sin(a)
        d.line([top, (ex, ey), (ex, ey + 3)], fill=PALM + (245,), width=2)
palm(204, 24, 1)
palm(308, 24, -1)
palm(318, 16, 1)

# flamingo on one leg
FLAMINGO = (
    "...PP..",
    "..PPPK.",
    "..P..K.",
    "..P....",
    "...P...",
    "...P...",
    "..P....",
    ".PPPPP.",
    "PPPPPPP",
    ".PPPPPP",
    "....P..",
    "....P..",
    "...P...",
    "....P..",
    "....PP.",
)
FX, FY = 190, BASE - len(FLAMINGO) + 1
for r, row in enumerate(FLAMINGO):
    for c, ch in enumerate(row):
        if ch != ".":
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                px = img.getpixel((FX + c + ox, FY + r + oy))
                if px[3] == 0:
                    d.point((FX + c + ox, FY + r + oy), fill=BLACK + (200,))
for r, row in enumerate(FLAMINGO):
    for c, ch in enumerate(row):
        if ch != ".":
            d.point((FX + c, FY + r), fill=(PINK if ch == "P" else BLACK) + (255,))

# surf breaking along the sideline
for x in range(184, 330):
    crest_y = BASE + 1 + round(1.2 * math.sin(x * 0.5))
    d.line([(x, crest_y), (x, BOTTOM - 1)], fill=CYAN + (230,))
    if math.sin(x * 0.5) > 0.5:
        d.point((x, crest_y), fill=WHITE + (255,))
d.line([(184, BOTTOM), (330, BOTTOM)], fill=DEEP + (240,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "miami-tides-overlay.png"))
print("saved")
