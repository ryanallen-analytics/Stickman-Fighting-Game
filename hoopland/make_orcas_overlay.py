"""Generate the Anchorage Orcas court overlay for Hoop Land (1024x512 transparent PNG)."""
from PIL import Image, ImageDraw
import math, os, random

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
INK = (14, 14, 22)
ICE = (118, 172, 210)
SHADE = (62, 104, 150)
SNOW = (246, 250, 255)
GREEN = (61, 220, 151)
TEAL = (43, 196, 196)
SEA = (22, 58, 92)
FOAM = (220, 240, 250)
HERE = os.path.dirname(os.path.abspath(__file__))
CX, CY = 256, 128
LEFT, RIGHT, TOP, BOTTOM = 62, 450, 35, 221   # court edges
random.seed(907)

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def blend(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

# ---------- northern lights over the far half ----------
# Each ribbon has a bright lower hem; rays fade upward toward the far sideline.
RIBBONS = ((56, 9, 0.021, 0.0, GREEN, TEAL, 34, 1.0),
           (72, 7, 0.027, 2.1, TEAL, GREEN, 26, 0.75))
for base, amp, freq, phase, c0, c1, ray, strength in RIBBONS:
    for x in range(LEFT + 2, RIGHT - 1):
        edge_fade = min(1.0, (x - LEFT) / 40, (RIGHT - x) / 40)
        hem = base + amp * math.sin(x * freq + phase) + 3 * math.sin(x * freq * 3.7 + phase)
        flicker = 0.7 + 0.3 * math.sin(x * 0.33 + phase * 5) * math.sin(x * 0.11 + phase)
        length = ray * (0.6 + 0.4 * flicker)
        for k in range(int(length)):
            y = round(hem - k)
            if y <= TOP + 2:
                break
            t = k / length
            a = (1 - t) ** 1.3 * 210 * flicker * edge_fade * strength
            if k < 2:
                a = 220 * edge_fade * strength
            if a < 8:
                continue
            col = blend(c0, c1, min(1.0, t * 1.4))
            d.point((x, y), fill=col + (int(a),))

# stars sprinkled above the aurora
for _ in range(34):
    x, y = random.randint(LEFT + 6, RIGHT - 6), random.randint(TOP + 3, TOP + 22)
    d.point((x, y), fill=SNOW + (random.choice((150, 200, 240)),))
for x, y in ((120, 42), (390, 44), (300, 40)):   # a few twinkles
    d.line([(x - 2, y), (x + 2, y)], fill=SNOW + (200,))
    d.line([(x, y - 2), (x, y + 2)], fill=SNOW + (200,))

# ---------- Chugach Mountains along the near sideline ----------
PEAKS = ((140, 0), (168, 18), (186, 10), (210, 30), (228, 20), (246, 36),
         (262, 24), (280, 33), (300, 16), (318, 27), (338, 12), (356, 20), (372, 0))
WATER = BOTTOM - 7
pts = [(x, WATER - h) for x, h in PEAKS]
d.polygon([(140, WATER)] + pts + [(372, WATER)], fill=ICE + (215,))
# snowcaps: the top third of each peak
for (x0, h0), (x1, h1), (x2, h2) in zip(PEAKS, PEAKS[1:], PEAKS[2:]):
    if h1 < 14 or h1 < h0 or h1 < h2:
        continue
    cap = h1 * 0.38
    lx = x1 - (x1 - x0) * cap / (h1 - h0)
    rx = x1 + (x2 - x1) * cap / (h1 - h2)
    y = WATER - h1 + cap
    d.polygon([(lx, y), (x1, WATER - h1), (rx, y), (rx - 3, y + 2), (x1 - 1, y - 1), (lx + 3, y + 2)],
              fill=SNOW + (225,))
d.line(pts, fill=INK + (210,), width=1)
for (x, h) in PEAKS[1:-1]:                         # ridge shadows
    if h > 15:
        d.polygon([(x, WATER - h + 1), (x + 9, WATER - 1), (x + 2, WATER - 1)], fill=SHADE + (170,))

# ---------- Cook Inlet waves at the mountains' feet ----------
for x in range(LEFT + 1, RIGHT):
    crest = WATER + 1 + round(1.5 * math.sin(x * 0.45))
    fade = min(1.0, (x - LEFT) / 30, (RIGHT - x) / 30)
    d.line([(x, crest), (x, BOTTOM - 1)], fill=SEA + (int(190 * fade),))
    if math.sin(x * 0.45) > 0.6:
        d.point((x, crest), fill=FOAM + (int(230 * fade),))
for x in range(LEFT + 8, RIGHT - 8, 23):           # little whitecaps
    d.line([(x, BOTTOM - 3), (x + 3, BOTTOM - 3)], fill=FOAM + (160,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "anchorage-orcas-overlay.png"))
print("saved")
