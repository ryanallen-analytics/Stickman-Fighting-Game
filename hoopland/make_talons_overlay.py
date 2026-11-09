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
LIGHT_FACE = (210, 170, 126)
DARK_FACE = (140, 100, 64)
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

# Broad, nearly horizontal spread wings: the leading edge sweeps up to high outer tips, a tier of
# pointed coverts runs along the top, and long primaries fan down and outward at the ends.
# Points are for the left wing, relative to center; the right wing mirrors them.
MID_FACE = (182, 140, 98)
EDGE = (130, 92, 58)
DROP = 12                                                 # sit the wings low enough to pass under the sponsor marks
def lower(pts):
    return tuple((x, y + DROP) for x, y in pts)
LEADING = lower(((-20, -12), (-36, -24), (-54, -34), (-70, -42), (-86, -48)))
TIPS = lower(((-92, -38), (-92, -26), (-88, -14), (-78, -8), (-66, -4), (-54, -2), (-42, 0), (-30, 2)))
NOTCHES = lower(((-84, -40), (-83, -28), (-80, -18), (-72, -12), (-60, -9), (-49, -6), (-37, -4), (-24, -2)))
COVERT_TIPS = lower(((-76, -38), (-64, -30), (-52, -22), (-40, -16), (-28, -10)))
COVERT_NOTCHES = lower(((-78, -45), (-64, -38), (-50, -30), (-36, -22), (-22, -15)))
for side in (-1, 1):
    P = lambda pts: [(CX - side * x, CY + y) for x, y in pts]       # side -1 is the left wing, 1 mirrors it
    outline = list(LEADING)
    for tip, notch in zip(TIPS, NOTCHES):
        outline += [tip, notch]
    wd.polygon(P(outline), fill=LIGHT_FACE + (255,))
    # covert tier: pointed feathers hanging off the leading edge
    coverts = list(LEADING)[::-1]
    for notch, tip in zip(COVERT_NOTCHES, COVERT_TIPS):
        coverts += [notch, tip]
    wd.polygon(P(coverts + [LEADING[0]]), fill=MID_FACE + (255,))
    # feather separations: from each trailing notch up toward the coverts
    for (nx, ny), k in zip(NOTCHES[:-1], range(len(NOTCHES) - 1)):
        cx_, cy_ = COVERT_TIPS[min(len(COVERT_TIPS) - 1, k * len(COVERT_TIPS) // (len(NOTCHES) - 1))]
        wd.line(P([(nx, ny), (nx + (cx_ - nx) * 0.75, ny + (cy_ - ny) * 0.75)]), fill=DARK_FACE + (255,))
    for (nx, ny), (tx, ty) in zip(COVERT_NOTCHES, COVERT_TIPS):      # covert separations
        wd.line(P([(nx, ny), (tx + (nx - tx) * 0.2, ty + (ny - ty) * 0.2)]), fill=DARK_FACE + (255,))
    wd.line(P(list(LEADING)), fill=EDGE + (255,), width=3)            # darker leading-edge stroke
alpha = wings.getchannel("A").point(lambda v: 125 if v else 0)
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
