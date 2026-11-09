"""Generate the Atlanta Talons court overlay for Hoop Land (1024x512 transparent PNG).

A sleek floor: faint wood-stain raptor wings spread behind the logo, a
minimal fictional arena sponsor ("Peachline Arena") at two spots, and a
hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
LIGHT_FACE = (206, 166, 122)
DARK_FACE = (166, 124, 84)
BLACK = (20, 18, 22)
RED = (200, 24, 40)
GOLD = (240, 176, 40)
GRAY = (120, 112, 112)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint raptor wings stained into the floor ----------
wings = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
wd = ImageDraw.Draw(wings)

# left wing outline relative to center: leading edge up to the tip, then the feathered trailing edge
LEADING = ((-20, -14), (-30, -34), (-44, -48), (-58, -56), (-68, -58))
TIPS = ((-70, -50), (-68, -38), (-64, -26), (-58, -14), (-50, -6), (-42, 0), (-33, 4), (-24, 6))
NOTCHES = ((-62, -44), (-60, -32), (-56, -22), (-50, -13), (-43, -6), (-35, -1), (-27, 1), (-20, 2))
BONE = ((-24, -16), (-34, -30), (-46, -40), (-58, -48))
for side in (-1, 1):
    P = lambda pts: [(CX - side * x, CY + y) for x, y in pts]       # side -1 is the left wing, 1 mirrors it
    outline = list(LEADING)
    for tip, notch in zip(TIPS, NOTCHES):
        outline += [tip, notch]
    wd.polygon(P(outline), fill=LIGHT_FACE + (255,))
    # coverts: a darker band along the leading edge with a scalloped lower edge
    wd.polygon(P(list(LEADING) + [(-62, -48), (-52, -40), (-40, -30), (-30, -18), (-22, -6)]), fill=DARK_FACE + (255,))
    for (nx, ny), k in zip(NOTCHES[:-1], range(len(NOTCHES) - 1)):   # feather separations
        bx, by = BONE[min(3, (len(NOTCHES) - 2 - k) // 2)]
        wd.line(P([(nx, ny), (bx + (nx - bx) * 0.35, by + (ny - by) * 0.35)]), fill=DARK_FACE + (255,))
alpha = wings.getchannel("A").point(lambda v: 105 if v else 0)
wings.putalpha(alpha)
img = wings.resize((W, H), Image.NEAREST)

# ---------- Peachline Arena: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("PEACHLINE", word_font, 1)
    total = 20 + word_w
    x = cx - total / 2
    d.ellipse([x, cy - 9, x + 14, cy + 5], fill=GOLD + (255,))                # the peach
    d.line([(x + 2, cy + 3), (x + 12, cy - 7)], fill=WHITE + (255,), width=2)  # a single clean cut
    d.polygon([(x + 8, cy - 9), (x + 14, cy - 15), (x + 12, cy - 9)], fill=RED + (255,))   # leaf
    spaced(x + 20, cy - 10, "PEACHLINE", word_font, BLACK + (255,), 1)
    sub_w = width("ARENA", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "ARENA", sub_font, RED + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.17 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.83 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 30), "#TALONSUP", font=tag_font, fill=GOLD + (255,), anchor="mm")

img.save(os.path.join(HERE, "atlanta-talons-overlay.png"))
print("saved")
