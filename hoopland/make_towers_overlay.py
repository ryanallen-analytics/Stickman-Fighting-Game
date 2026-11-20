"""Generate the Toronto Towers court overlay for Hoop Land (1024x512 transparent PNG).

A sleek floor: a faint stained Toronto skyline with the CN Tower rising
beside the logo, a minimal fictional sponsor ("Mapleway Centre") in open
floor between each three-point arc and half court, and a hashtag on the
near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (160, 110, 70)
RED = (206, 17, 65)
BLACK = (20, 18, 22)
GRAY = (110, 104, 110)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (COURT[0] + COURT[2]) / 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint Toronto skyline stained into the floor (2x pixel grid) ----------
BASE = BOTTOM
sky = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(sky)
for x0, x1, h in ((182, 190, 10), (191, 198, 16), (199, 208, 22), (209, 216, 28), (217, 226, 20), (227, 234, 26),
                  (235, 244, 18), (245, 252, 24), (253, 262, 30), (263, 270, 22), (271, 280, 16), (281, 290, 20),
                  (291, 298, 12)):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# CN Tower: tapering legs, the main pod, the SkyPod and the antenna
TX = 304
m.polygon([(TX - 5, BASE), (TX - 1, BASE - 70), (TX + 1, BASE - 70), (TX + 5, BASE)], fill=255)
m.rectangle([TX - 1, BASE - 92, TX + 1, BASE - 70], fill=255)
m.ellipse([TX - 7, BASE - 76, TX + 7, BASE - 66], fill=255)          # main pod
m.rectangle([TX - 3, BASE - 93, TX + 3, BASE - 89], fill=255)        # SkyPod
m.line([(TX, BASE - 110), (TX, BASE - 93)], fill=255)                # antenna
# Rogers Centre: low dome beside the tower
m.rectangle([314, BASE - 6, 346, BASE], fill=255)
m.pieslice([314, BASE - 16, 346, BASE + 4], 180, 360, fill=255)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (95,), (0, 0), sky)
img = layer.resize((W, H), Image.NEAREST)
d = ImageDraw.Draw(img)
TOWER_TOP = (BASE - 110) * 2                              # for the clearance check below

# ---------- Mapleway Centre: minimal fictional arena sponsor ----------
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def maple_leaf(cx, cy, s):
    """A simplified 11-point maple leaf with a short stem."""
    pts = [(0, -8), (2, -4), (5, -5), (4, -1), (8, -2), (7, 1), (9, 3), (3, 3), (1, 6), (-1, 6), (-3, 3),
           (-9, 3), (-7, 1), (-8, -2), (-4, -1), (-5, -5), (-2, -4)]
    d.polygon([(cx + x * s, cy + y * s) for x, y in pts], fill=RED + (255,))
    d.line([(cx, cy + 6 * s), (cx, cy + 9 * s)], fill=RED + (255,), width=2)

def sponsor(cx, cy):
    """Draw the sponsor centered on (cx, cy) and return its bounding box."""
    word_w = width("MAPLEWAY", word_font, 2)
    total = 20 + word_w
    x = cx - total / 2
    maple_leaf(x + 7, cy - 2, 0.85)
    spaced(x + 20, cy - 10, "MAPLEWAY", word_font, BLACK + (255,), 2)
    sub_w = width("CENTRE", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "CENTRE", sub_font, RED + (255,), 5)
    return (x - 2, cy - 12, x + total + 2, cy + 21)

# Open floor between each three-point arc and half court along the far sideline, clear of the CN Tower.
boxes = [sponsor(426, 132), sponsor(1024 - 426, 132)]

# ---------- hashtag on the near apron ----------
d.text((CX, COURT[3] + 30), "#STANDTALL", font=ImageFont.truetype(SANS, 16), fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "toronto-towers-overlay.png"))
print("saved; sponsor boxes:", [tuple(round(v) for v in b) for b in boxes], "; CN Tower top y:", TOWER_TOP)
