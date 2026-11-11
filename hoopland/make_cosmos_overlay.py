"""Generate the Houston Cosmos court overlay for Hoop Land (1024x512 transparent PNG).

A minimalist, clean space floor: thin wood-stain orbits around the logo,
two faint constellations, a minimal fictional arena sponsor ("Apolune
Center") at two spots, and a hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (146, 104, 66)
BLACK = (20, 18, 22)
RED = (206, 17, 65)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
LINE = STAIN + (115,)
DOT = STAIN + (190,)

# ---------- thin orbits around the logo ----------
def orbit_point(rx, ry, tilt, t):
    x, y = rx * math.cos(t), ry * math.sin(t)
    c, s = math.cos(tilt), math.sin(tilt)
    return CX + x * c - y * s, CY + x * s + y * c

for rx, ry, deg, planet_t, planet_r in ((60, 18, -16, 200, 3), (54, 14, 18, 330, 2)):
    tilt = math.radians(deg)
    d.line([orbit_point(rx, ry, tilt, math.radians(a)) for a in range(0, 361, 2)], fill=LINE)
    px, py = orbit_point(rx, ry, tilt, math.radians(planet_t))
    d.ellipse([px - planet_r, py - planet_r, px + planet_r, py + planet_r], fill=DOT)

# ---------- two faint constellations ----------
def star(x, y, big=False):
    d.point((x, y), fill=DOT)
    if big:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            d.point((x + dx, y + dy), fill=STAIN + (130,))

def constellation(stars, links, big):
    for a, b in links:
        d.line([stars[a], stars[b]], fill=STAIN + (80,))
    for i, (x, y) in enumerate(stars):
        star(x, y, i in big)

# Big Dipper, low on the left between the arc and the logo
DIPPER = [(198, 170), (208, 166), (218, 168), (226, 174), (228, 184), (242, 186), (244, 176)]
constellation(DIPPER, [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 3)], {3, 6})
# Orion, high on the right between the logo and the far sideline
ORION = [(286, 62), (304, 60), (292, 76), (296, 78), (300, 80), (284, 94), (306, 92)]
constellation(ORION, [(0, 2), (1, 4), (2, 3), (3, 4), (2, 5), (4, 6)], {0, 6})

img = img.resize((W, H), Image.NEAREST)

# ---------- Apolune Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("APOLUNE", word_font, 3)
    total = 20 + word_w
    x = cx - total / 2
    d.ellipse([x, cy - 8, x + 14, cy + 6], fill=RED + (255,))              # crescent: a disc with a bite out of it
    d.ellipse([x + 4, cy - 10, x + 18, cy + 4], fill=(0, 0, 0, 0))
    d.ellipse([x + 7, cy - 3, x + 10, cy], fill=RED + (255,))              # a star tucked inside the curve
    spaced(x + 20, cy - 10, "APOLUNE", word_font, BLACK + (255,), 3)
    sub_w = width("CENTER", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "CENTER", sub_font, RED + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.17 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.83 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 34), "#CLEARFORLIFTOFF", font=tag_font, fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "houston-cosmos-overlay.png"))
print("saved")
