"""Generate the Charlotte Stingers court overlay for Hoop Land (1024x512 transparent PNG).

Inspired by a modern Charlotte floor: a stained QUEEN CITY wordmark, a
faint stained skyline, a minimal fictional sponsor ("Hiveline Center")
at two spots, honeycomb on the apron and a small emblem below the court.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (164, 92, 42)
TEAL = (0, 120, 140)
TEAL_DARK = (0, 84, 100)
TEAL_LIGHT = (90, 200, 210)
PURPLE = (40, 24, 96)
WHITE = (255, 255, 255)
GRAY = (110, 100, 120)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (LEFT + RIGHT) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- honeycomb on the apron ----------
def hexagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(60 * k)), cy + r * math.sin(math.radians(60 * k))) for k in range(6)]
HR = 9
for row in range(-1, LH // 15 + 2):
    for col in range(-1, LW // 13 + 2):
        cx = col * HR * 1.5
        cy = row * HR * math.sqrt(3) + (HR * math.sqrt(3) / 2 if col % 2 else 0)
        if not LEFT - HR < cx < RIGHT + HR or TOP - HR < cy < BOTTOM + HR:
            continue                                        # comb only the far and near aprons: off the court and clear of the baseline text
        d.polygon(hexagon(cx, cy, HR), outline=TEAL_DARK + (200,))

# ---------- QUEEN CITY stained above the logo ----------
BLOCK = {
    "Q": (".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"),
    "U": ("#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"),
    "C": (".####", "#....", "#....", "#....", "#....", "#....", ".####"),
    "I": ("###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"),
    "T": ("#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."),
    "Y": ("#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."),
    " ": ("...", "...", "...", "...", "...", "...", "..."),
}
WORD, S = "QUEEN CITY", 2
width = sum(len(BLOCK[ch][0]) * S + 2 for ch in WORD) - 2
x, y0 = CX - width // 2, TOP + 9
for ch in WORD:
    for r, row in enumerate(BLOCK[ch]):
        for c, px in enumerate(row):
            if px == "#":
                d.rectangle([x + c * S, y0 + r * S, x + c * S + S - 1, y0 + r * S + S - 1], fill=STAIN + (95,))
    x += len(BLOCK[ch][0]) * S + 2

# ---------- faint Charlotte skyline along the near sideline ----------
BASE = BOTTOM
sky = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(sky)
for x0, x1, h in ((184, 192, 12), (193, 200, 18), (201, 210, 14), (222, 230, 22), (262, 270, 20), (271, 280, 26),
                  (294, 302, 18), (303, 312, 24), (313, 320, 14), (321, 330, 10)):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# Bank of America Corporate Center: tallest, with its crown of spires
m.rectangle([240, BASE - 34, 252, BASE], fill=255)
m.polygon([(240, BASE - 34), (243, BASE - 38), (249, BASE - 38), (252, BASE - 34)], fill=255)
for k, sx in enumerate(range(241, 252, 2)):
    m.line([(sx, BASE - 38), (sx, BASE - 42 - (2 if k in (2, 3) else 0))], fill=255)
# Duke Energy Center: stepped crown
m.rectangle([254, BASE - 28, 261, BASE], fill=255)
m.rectangle([256, BASE - 31, 259, BASE - 28], fill=255)
# 550 South Tryon: curved top
m.rectangle([212, BASE - 24, 220, BASE], fill=255)
m.pieslice([212, BASE - 28, 228, BASE - 20], 180, 270, fill=255)
# Truist Center: pointed spire
m.rectangle([282, BASE - 24, 291, BASE], fill=255)
m.polygon([(282, BASE - 24), (286, BASE - 31), (291, BASE - 24)], fill=255)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (85,), (0, 0), sky)
img.alpha_composite(layer)
d = ImageDraw.Draw(img)

# ---------- small stinger emblem below the court ----------
ex, ey = CX, BOTTOM + 14
d.polygon(hexagon(ex, ey, 8), fill=PURPLE + (255,), outline=TEAL_LIGHT + (255,))
d.polygon([(ex - 4, ey - 4), (ex + 4, ey - 4), (ex, ey + 6)], fill=TEAL_LIGHT + (255,))   # the stinger
d.line([(ex - 3, ey - 1), (ex + 3, ey - 1)], fill=PURPLE + (255,))
d.line([(ex - 2, ey + 2), (ex + 2, ey + 2)], fill=PURPLE + (255,))

img = img.resize((W, H), Image.NEAREST)

# ---------- Hiveline Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("HIVELINE", word_font, 2)
    total = 20 + word_w
    x = cx - total / 2
    d.polygon([(x + 7 + 7 * math.cos(math.radians(60 * k + 30)), cy - 2 + 7 * math.sin(math.radians(60 * k + 30)))
               for k in range(6)], outline=TEAL + (255,), width=2)
    d.ellipse([x + 5, cy - 4, x + 9, cy], fill=PURPLE + (255,))
    spaced(x + 20, cy - 10, "HIVELINE", word_font, PURPLE + (255,), 2)
    sub_w = width("CENTER", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "CENTER", sub_font, GRAY + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.15 * court_w, COURT[1] + 0.13 * court_h)
sponsor(COURT[0] + 0.85 * court_w, COURT[1] + 0.85 * court_h)

img.save(os.path.join(HERE, "charlotte-stingers-overlay.png"))
print("saved")
