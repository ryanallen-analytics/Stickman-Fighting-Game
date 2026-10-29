"""Generate the Albuquerque Diablos court overlay for Hoop Land (1024x512 transparent PNG)."""
from PIL import Image, ImageDraw
from court_template import fit_to_court
import math, os, random

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
RED = (122, 31, 43)
EMBER = (196, 52, 30)
ORANGE = (232, 118, 46)
GOLD = (245, 169, 58)
CORE = (255, 226, 130)
HERE = os.path.dirname(os.path.abspath(__file__))
CX, CY = 256, 128            # center court
LEFT, RIGHT, TOP, BOTTOM = 62, 450, 35, 221   # court edges
random.seed(505)

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- desert sun behind the center logo ----------
sun = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
s = ImageDraw.Draw(sun)
for i in range(16):
    a0 = math.radians(i * 22.5 - 4)
    a1 = math.radians(i * 22.5 + 4)
    r0, r1 = 50, (74 if i % 2 == 0 else 64)
    s.polygon([(CX + r0 * math.cos(a0), CY + r0 * math.sin(a0)),
               (CX + r1 * math.cos((a0 + a1) / 2), CY + r1 * math.sin((a0 + a1) / 2)),
               (CX + r0 * math.cos(a1), CY + r0 * math.sin(a1))], fill=ORANGE + (95,))
s.ellipse([CX - 48, CY - 48, CX + 48, CY + 48], outline=GOLD + (120,), width=3)
s.ellipse([CX - 43, CY - 43, CX + 43, CY + 43], outline=EMBER + (90,), width=1)
img = Image.alpha_composite(img, sun)
d = ImageDraw.Draw(img)

# ---------- cracked desert floor in the four corners ----------
def crack(x, y, ang, length, depth=0):
    for _ in range(length):
        nx = x + math.cos(ang) * 2
        ny = y + math.sin(ang) * 2
        if not (LEFT < nx < RIGHT and TOP < ny < BOTTOM):
            return
        d.line([(x, y), (nx, ny)], fill=RED + (110,))
        x, y = nx, ny
        ang += random.uniform(-0.5, 0.5)
        if depth < 2 and random.random() < 0.12:
            crack(x, y, ang + random.choice((-1, 1)) * 0.9, length // 2, depth + 1)

for (x, y, ang) in ((LEFT + 4, TOP + 30, 0.3), (RIGHT - 4, TOP + 30, math.pi - 0.3),
                    (LEFT + 4, BOTTOM - 34, -0.3), (RIGHT - 4, BOTTOM - 34, math.pi + 0.3)):
    crack(x, y, ang, 14)

# ---------- Sandia Mountains ridge along the near sideline ----------
ridge = [(140, BOTTOM)]
for x in range(140, 373, 4):
    t = (x - 140) / 232
    h = 6 + 26 * math.sin(math.pi * t) ** 0.8 + 4 * math.sin(x * 0.21) + 2 * math.sin(x * 0.57)
    ridge.append((x, BOTTOM - h))
ridge.append((372, BOTTOM))
d.polygon(ridge, fill=RED + (120,))
d.line(ridge[1:-1], fill=(40, 10, 14, 200), width=1)
for x in range(150, 365, 9):                      # rocky striations on the west face
    t = (x - 140) / 232
    top = BOTTOM - (6 + 26 * math.sin(math.pi * t) ** 0.8) + 6
    d.line([(x, top), (x + 3, BOTTOM - 2)], fill=(40, 10, 14, 70))

# ---------- flames licking in from both sidelines ----------
def flame_heights(phase):
    hs = []
    for x in range(LEFT, RIGHT + 1):
        mid = math.exp(-((x - CX) / 120) ** 2)           # taller toward midcourt
        n = (math.sin(x * 0.31 + phase) + 0.6 * math.sin(x * 0.83 + phase * 2) + 0.4 * math.sin(x * 1.9 + phase))
        tongue = max(0.0, math.sin(x * 0.42 + phase * 3)) ** 3 * 8   # sharp tips
        hs.append(max(3, 6 + 10 * mid + 2.5 * n + tongue))
    return hs

LAYERS = ((1.00, RED, 215), (0.72, EMBER, 225), (0.48, ORANGE, 235), (0.26, GOLD, 240), (0.10, CORE, 245))

def flames(edge, direction, phase, skip=None):
    hs = flame_heights(phase)
    for scale, col, a in LAYERS:
        for i, h in enumerate(hs):
            x = LEFT + i
            if skip and skip[0] <= x <= skip[1]:
                continue
            hh = round(h * scale)
            if hh <= 0:
                continue
            y0, y1 = (edge, edge + hh) if direction > 0 else (edge - hh, edge)
            d.line([(x, y0), (x, y1)], fill=col + (a,))
    for _ in range(40):                                   # floating embers
        x = random.randint(LEFT + 4, RIGHT - 4)
        if skip and skip[0] - 6 <= x <= skip[1] + 6:
            continue
        h = hs[x - LEFT]
        y = edge + direction * (h + random.randint(2, 9))
        d.rectangle([x, y, x + random.choice((0, 1)), y + random.choice((0, 1))],
                    fill=random.choice((GOLD, ORANGE, EMBER)) + (220,))

flames(TOP + 6, -1, 0.0)                 # far sideline, burning up off the floor
flames(BOTTOM, -1, 1.7, skip=(146, 366))  # near sideline, parting around the mountains
# flames rising behind the ridge peaks
for x in range(146, 367):
    t = (x - 140) / 232
    ridge_top = BOTTOM - (6 + 26 * math.sin(math.pi * t) ** 0.8 + 4 * math.sin(x * 0.21) + 2 * math.sin(x * 0.57))
    h = 4 + 5 * max(0.0, math.sin(x * 0.37)) ** 2 + 3 * max(0.0, math.sin(x * 0.9 + 1)) ** 4
    for scale, col, a in LAYERS[:4]:
        hh = round(h * scale)
        if hh > 0:
            d.line([(x, ridge_top - hh), (x, ridge_top - 1)], fill=col + (a - 40,))

fit_to_court(img.resize((W, H), Image.NEAREST)).save(os.path.join(HERE, "albuquerque-diablos-overlay.png"))
print("saved")
