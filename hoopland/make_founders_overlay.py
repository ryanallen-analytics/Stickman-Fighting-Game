"""Generate the Philadelphia Founders court overlay for Hoop Land (1024x512 transparent PNG).

Laid out like a classic early-2000s Philadelphia floor: two shooting-star
basketballs off the sidelines, small star emblems by each paint, and a
minimal fictional arena sponsor ("Halvern Center") at two spots.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
GOLD = (200, 164, 90)
BLACK = (16, 16, 20)
RED = (218, 30, 50)
BLUE = (30, 90, 200)
LBLUE = (110, 175, 240)
SILVER = (200, 206, 216)
WHITE = (255, 255, 255)
BALL = (206, 146, 66)
NAVY = (20, 50, 130)
GRAY = (110, 120, 140)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CW, CH = RIGHT - LEFT, BOTTOM - TOP
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def at(fx, fy):
    """Point at a fraction of the court, matching the reference floor's layout."""
    return LEFT + fx * CW, TOP + fy * CH

# ---------- shooting-star basketballs ----------
def bezier(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]) for t in (i / n for i in range(n + 1))]

def shooting_ball(bx, by):
    # tail curls up and to the right of the ball, widening as it reaches the ball
    for k, (col, width) in enumerate(((BLUE, 5), (LBLUE, 4), (WHITE, 3), (SILVER, 3))):
        off = k * 3
        pts = bezier((bx + 34, by - 30 + off), (bx + 30 - off, by - 6 + off * 0.5), (bx + 4, by - 2 + off * 0.3))
        d.line([(x, y + 1) for x, y in pts], fill=BLACK + (200,), width=width)
        d.line(pts, fill=col + (250,), width=width)
    r = 8
    d.ellipse([bx - r - 1, by - r - 1, bx + r + 1, by + r + 1], fill=BLACK + (255,))
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=BALL + (255,))
    d.pieslice([bx - r + 2, by - r + 2, bx + r - 5, by + r - 5], 200, 260, fill=(236, 186, 110, 255))
    d.line([(bx, by - r), (bx, by + r)], fill=BLACK + (255,))
    d.line([(bx - r, by), (bx + r, by)], fill=BLACK + (255,))
    d.arc([bx - r - 6, by - r + 1, bx - 2, by + r - 1], -55, 55, fill=BLACK + (255,))
    d.arc([bx + 2, by - r + 1, bx + r + 6, by + r - 1], 125, 235, fill=BLACK + (255,))

shooting_ball(*at(0.6, 0.07))
shooting_ball(*at(0.36, 0.95))

# ---------- small star emblems by each paint ----------
def star_pts(cx, cy, r, tilt, inner=0.45):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * inner
        a = math.radians(-90 + tilt + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts

def emblem(cx, cy):
    d.polygon(star_pts(cx, cy, 13, -12), fill=RED + (255,))
    d.polygon(star_pts(cx, cy, 11, -12), fill=BLACK + (255,))
    for k in range(5):                                     # little streak under the star
        d.point((cx - 8 + k * 3, cy + 10 + (k % 2)), fill=LBLUE + (255,))
    g = GOLD + (255,)                                      # bold gold F monogram
    d.rectangle([cx - 3, cy - 5, cx - 2, cy + 4], fill=g)
    d.rectangle([cx - 3, cy - 5, cx + 3, cy - 4], fill=g)
    d.rectangle([cx - 3, cy - 1, cx + 2, cy], fill=g)
emblem(*at(0.89, 0.22))
emblem(*at(0.11, 0.78))

img = img.resize((W, H), Image.NEAREST)

# ---------- Halvern Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 15), ImageFont.truetype(SANS_LIGHT, 13)

def sponsor(fx, fy):
    cx, cy = COURT[0] + fx * (COURT[2] - COURT[0]), COURT[1] + fy * (COURT[3] - COURT[1])
    word_w = d.textlength("Halvern", font=word_font)
    sub_w = d.textlength(" Center", font=sub_font)
    total = 16 + word_w + sub_w
    x = cx - total / 2
    for k in range(3):                                     # mark: three rising slanted bars
        bx = x + k * 4
        d.polygon([(bx, cy + 6), (bx + 3, cy + 6 - 4 - k * 3), (bx + 5, cy + 6 - 4 - k * 3), (bx + 2, cy + 6)], fill=BLUE + (255,))
    d.text((x + 16, cy + 6), "Halvern", font=word_font, fill=NAVY + (255,), anchor="ls")
    d.text((x + 16 + word_w, cy + 6), " Center", font=sub_font, fill=GRAY + (255,), anchor="ls")

sponsor(0.34, 0.13)
sponsor(0.66, 0.87)

img.save(os.path.join(HERE, "philadelphia-founders-overlay.png"))
print("saved")
