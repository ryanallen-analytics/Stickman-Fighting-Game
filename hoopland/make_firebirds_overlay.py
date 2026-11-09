"""Generate the Phoenix Firebirds court overlay for Hoop Land (1024x512 transparent PNG).

A sleek floor: a faint wood-stain desert sunburst behind the logo, a
minimal fictional arena sponsor ("Mesaline Arena") at two spots, and a
hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (184, 132, 84)
PURPLE = (42, 26, 106)
ORANGE = (226, 96, 32)
GOLD = (240, 170, 40)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint desert sunburst stained into the floor ----------
RAYS, R_IN, R_OUT = 18, 30, 96
burst = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
px = burst.load()
for y in range(CY - R_OUT, CY + R_OUT + 1):
    for x in range(CX - R_OUT, CX + R_OUT + 1):
        r = math.hypot(x - CX, y - CY)
        if not R_IN <= r <= R_OUT or not (TOP <= y < BOTTOM):
            continue
        wedge = int((math.degrees(math.atan2(y - CY, x - CX)) + 360 + 90 / RAYS) % 360 // (180 / RAYS))
        if wedge % 2:
            continue
        fade = 1 - (r - R_IN) / (R_OUT - R_IN)                 # strongest near the logo, gone at the rim
        px[x, y] = STAIN + (round(110 * fade ** 1.2),)
img = burst.resize((W, H), Image.NEAREST)

# ---------- Mesaline Arena: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 14), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("MESALINE", word_font, 2)
    total = 22 + word_w
    x = cx - total / 2
    d.polygon([(x, cy + 3), (x + 4, cy - 6), (x + 12, cy - 6), (x + 16, cy + 3)], fill=ORANGE + (255,))   # the mesa
    d.rectangle([x, cy + 5, x + 16, cy + 6], fill=PURPLE + (255,))                                        # horizon line
    spaced(x + 22, cy - 10, "MESALINE", word_font, PURPLE + (255,), 2)
    sub_w = width("ARENA", sub_font, 5)
    spaced(x + total - sub_w, cy + 8, "ARENA", sub_font, ORANGE + (255,), 5)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.17 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.83 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 30), "#RISEUP", font=tag_font, fill=GOLD + (255,), anchor="mm")

img.save(os.path.join(HERE, "phoenix-firebirds-overlay.png"))
print("saved")
