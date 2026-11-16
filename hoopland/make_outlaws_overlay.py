"""Generate the OKC Outlaws court overlay for Hoop Land (1024x512 transparent PNG).

A sleek, minimal floor: a faint wood-stain outline of Oklahoma behind the
logo, a minimal fictional arena sponsor ("Cimarron Center") placed in open
floor between each three-point arc and half court, and a hashtag on the
near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 512
STAIN = (146, 104, 66)
NAVY = (16, 36, 82)
ORANGE = (232, 84, 40)
GOLD = (250, 190, 40)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
CX, CY = (COURT[0] + COURT[2]) / 2, (COURT[1] + COURT[3]) / 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint outline of Oklahoma behind the logo ----------
# (longitude, latitude) around the border, panhandle first, Red River along the bottom
BORDER = ((-103.0, 37.0), (-94.62, 37.0), (-94.62, 36.5), (-94.43, 35.4), (-94.48, 33.64), (-95.5, 33.88),
          (-96.4, 33.75), (-97.1, 33.85), (-97.6, 33.9), (-98.1, 34.1), (-98.6, 34.15), (-99.2, 34.25),
          (-99.7, 34.4), (-100.0, 34.56), (-100.0, 36.5), (-103.0, 36.5))
STATE_W = 240                                             # stays inside the three-point arcs
STATE_H = STATE_W / 2.05                                  # Oklahoma's width-to-height at its latitude
def project(lon, lat):
    return (CX - STATE_W / 2 + (lon + 103.0) / 8.57 * STATE_W,
            CY - STATE_H / 2 + (37.0 - lat) / 3.36 * STATE_H)
pixel = Image.new("RGBA", (W // 2, H // 2), (0, 0, 0, 0))   # draw on the 2x pixel grid for chunky edges
ImageDraw.Draw(pixel).polygon([(x / 2, y / 2) for x, y in (project(*p) for p in BORDER)], fill=STAIN + (70,))
img = pixel.resize((W, H), Image.NEAREST)

# ---------- Cimarron Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    """Draw the sponsor centered on (cx, cy) and return its bounding box."""
    word_w = width("CIMARRON", word_font, 2)
    total = 18 + word_w
    x = cx - total / 2
    d.arc([x, cy - 8, x + 12, cy + 6], 200, 340 + 360, fill=GOLD + (255,), width=3)   # a horseshoe, open at the top
    d.rectangle([x, cy - 8, x + 12, cy - 4], fill=(0, 0, 0, 0))
    for nx, ny in ((x + 2, cy - 2), (x + 10, cy - 2)):
        d.point((nx, ny), fill=NAVY + (255,))
    spaced(x + 18, cy - 10, "CIMARRON", word_font, NAVY + (255,), 2)
    sub_w = width("CENTER", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "CENTER", sub_font, ORANGE + (255,), 5)
    return (x - 2, cy - 12, x + total + 2, cy + 21)

# Open floor between each three-point arc and half court, clear of the arcs, hash marks and logo.
SPONSOR_SPOTS = ((420, 128), (1024 - 420, 512 - 128))
boxes = [sponsor(*spot) for spot in SPONSOR_SPOTS]

# ---------- hashtag on the near apron ----------
d.text((CX, COURT[3] + 30), "#OUTLAWNATION", font=ImageFont.truetype(SANS, 16), fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "okc-outlaws-overlay.png"))
print("saved; sponsor boxes:", [tuple(round(v) for v in b) for b in boxes])
