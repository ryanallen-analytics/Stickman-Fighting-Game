"""Generate the Utah Summit court overlay for Hoop Land (1024x512 transparent PNG).

A simple floor in the style of a classic Utah court: a faint wood-stain
mountain range behind the logo, a minimal fictional arena sponsor
("Velora Center") at two spots, and a hashtag on the near apron.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
LIGHT_FACE = (206, 170, 128)
DARK_FACE = (170, 130, 92)
PURPLE = (74, 44, 130)
NAVY = (12, 35, 80)
SKY = (108, 174, 224)
GRAY = (110, 104, 132)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (LEFT + RIGHT) // 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint mountain range stained into the floor ----------
FOOT = BOTTOM - 22                                        # where the range fades out
PEAKS = ((148, FOOT), (176, 132), (192, 112), (204, 120), (222, 86), (236, 98), (256, 58),
         (274, 92), (288, 80), (306, 112), (318, 104), (338, 136), (364, FOOT))
faces = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
fd = ImageDraw.Draw(faces)
fd.polygon(PEAKS, fill=LIGHT_FACE + (255,))
for i in range(1, len(PEAKS) - 1):                        # shade each peak's right-hand face
    px, py = PEAKS[i]
    nx, ny = PEAKS[i + 1]
    if py < PEAKS[i - 1][1] and py < ny:                  # a summit
        fd.polygon([(px, py), (nx, ny), (nx + (px - nx) * 0.15, FOOT), (px + 4, FOOT)], fill=DARK_FACE + (255,))
fade = Image.new("L", (LW, LH), 0)
for y in range(LH):                                       # fade from the summits down toward the sideline
    t = (y - 58) / (FOOT - 58)
    if 0 <= t <= 1:
        ImageDraw.Draw(fade).line([(0, y), (LW, y)], fill=round(130 * (1 - t) ** 0.8 + 20))
alpha = Image.composite(fade, Image.new("L", (LW, LH), 0), faces.getchannel("A"))
faces.putalpha(alpha)
img = faces.resize((W, H), Image.NEAREST)

# ---------- Velora Center: minimal fictional arena sponsor ----------
d = ImageDraw.Draw(img)
word_font, sub_font = ImageFont.truetype(SANS, 15), ImageFont.truetype(SANS_LIGHT, 10)

def spaced(x, y, text, font, fill, spacing):
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + spacing
    return x

def width(text, font, spacing):
    return sum(d.textlength(ch, font=font) for ch in text) + spacing * (len(text) - 1)

def sponsor(cx, cy):
    word_w = width("VELORA", word_font, 3)
    total = 18 + word_w
    x = cx - total / 2
    for k, col in enumerate((PURPLE, SKY)):              # two stacked chevrons
        y = cy - 9 + k * 6
        d.polygon([(x, y + 8), (x + 7, y), (x + 14, y + 8), (x + 11, y + 8), (x + 7, y + 4), (x + 3, y + 8)], fill=col + (255,))
    spaced(x + 18, cy - 10, "VELORA", word_font, NAVY + (255,), 3)
    sub_w = width("CENTER", sub_font, 4)
    spaced(x + total - sub_w, cy + 8, "CENTER", sub_font, GRAY + (255,), 4)

court_w, court_h = COURT[2] - COURT[0], COURT[3] - COURT[1]
sponsor(COURT[0] + 0.14 * court_w, COURT[1] + 0.2 * court_h)
sponsor(COURT[0] + 0.86 * court_w, COURT[1] + 0.2 * court_h)

# ---------- hashtag on the near apron ----------
tag_font = ImageFont.truetype(SANS, 16)
d.text(((COURT[0] + COURT[2]) / 2, COURT[3] + 30), "#REACHTHESUMMIT", font=tag_font, fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "utah-summit-overlay.png"))
print("saved")
