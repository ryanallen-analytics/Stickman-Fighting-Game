"""Generate the New York Empire court overlay for Hoop Land (1024x512 transparent PNG).

A simple floor in the style of a classic New York court: a faint wood-tone
skyline along the near sideline and the team name stacked at two spots.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (168, 118, 70)
BLUE = (16, 70, 150)
ORANGE = (240, 120, 32)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ---------- faint skyline stained into the floor ----------
sky = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(sky)
BASE = BOTTOM
TOWERS = (  # (x0, x1, height) left to right
    (124, 132, 12), (133, 140, 20), (141, 150, 15), (151, 158, 26), (159, 168, 18), (169, 176, 30),
    (177, 186, 22), (187, 194, 34), (195, 202, 26),
    (226, 234, 28), (244, 252, 24), (253, 262, 33), (263, 270, 22), (271, 280, 38), (281, 288, 27),
    (289, 296, 32), (305, 312, 30), (313, 322, 41), (323, 330, 34), (348, 356, 36), (357, 364, 28),
    (365, 374, 22), (375, 382, 26), (383, 392, 14),
)
for x0, x1, h in TOWERS:
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
# Empire State Building: setbacks, crown and mast
ex = 214
for half, h in ((11, 30), (8, 40), (6, 48), (4, 53), (2, 57)):
    m.rectangle([ex - half, BASE - h, ex + half, BASE], fill=255)
m.line([(ex, BASE - 66), (ex, BASE - 57)], fill=255, width=1)
# Chrysler Building: stacked arches and needle
cx = 239
m.rectangle([cx - 5, BASE - 40, cx + 5, BASE], fill=255)
for k, half in enumerate((5, 4, 3, 2)):
    m.pieslice([cx - half, BASE - 44 - k * 3, cx + half, BASE - 36 - k * 3], 180, 360, fill=255)
m.line([(cx, BASE - 56), (cx, BASE - 48)], fill=255)
# 432 Park Avenue: pencil-thin tower
m.rectangle([299, BASE - 50, 303, BASE], fill=255)
# One World Trade Center: tapered faces and spire
wx = 340
m.polygon([(wx - 7, BASE), (wx - 7, BASE - 30), (wx - 4, BASE - 52), (wx + 4, BASE - 52), (wx + 7, BASE - 30), (wx + 7, BASE)], fill=255)
m.line([(wx, BASE - 64), (wx, BASE - 52)], fill=255)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (95,), (0, 0), sky)
img = layer.resize((W, H), Image.NEAREST)

# ---------- stacked team name at two spots, like the arena lettering on a classic NY floor ----------
d = ImageDraw.Draw(img)
d.fontmode = "1"
top_font, bottom_font = ImageFont.truetype(SERIF, 17), ImageFont.truetype(SANS, 14)

def lettering(cx, cy):
    d.text((cx, cy - 9), "NEW YORK", font=top_font, fill=BLUE + (255,), anchor="mm")
    d.line([(cx - 44, cy + 1), (cx + 44, cy + 1)], fill=ORANGE + (255,), width=2)
    d.text((cx, cy + 11), "EMPIRE", font=bottom_font, fill=BLUE + (255,), anchor="mm")

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
lettering(round(COURT[0] + 0.355 * court_w), round(COURT[1] + 0.12 * court_h))
lettering(round(COURT[0] + 0.62 * court_w), round(COURT[1] + 0.86 * court_h))

img.save(os.path.join(HERE, "new-york-empire-overlay.png"))
print("saved")
