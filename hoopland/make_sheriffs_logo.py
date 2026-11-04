"""Generate the San Antonio Sheriffs team logo for Hoop Land (320x320 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os

N = 80            # pixel-art canvas, upscaled 4x
BLACK = (18, 18, 24)
LIGHT = (236, 240, 244)
SILVER = (192, 198, 208)
STEEL = (130, 138, 152)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(art)
C = (40, 37)
R_OUT, R_IN = 31, 17

def polar(r, deg):
    a = math.radians(deg)
    return (C[0] + r * math.cos(a), C[1] + r * math.sin(a))

# ---------- six-point badge star with bevelled facets ----------
for k in range(6):
    tip = -90 + k * 60
    p = polar(R_OUT, tip)
    left, right = polar(R_IN, tip - 30), polar(R_IN, tip + 30)
    lit = math.cos(math.radians(tip + 135)) > 0          # light from the upper left
    d.polygon([C, left, p], fill=LIGHT if lit else SILVER)
    d.polygon([C, p, right], fill=SILVER if lit else STEEL)
for k in range(6):                                       # ball tips
    x, y = polar(R_OUT + 1, -90 + k * 60)
    d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=SILVER)
    d.point((round(x) - 1, round(y) - 1), fill=WHITE)

# ---------- center seal ----------
d.ellipse([C[0] - 12, C[1] - 12, C[0] + 12, C[1] + 12], fill=BLACK)
d.ellipse([C[0] - 10, C[1] - 10, C[0] + 10, C[1] + 10], outline=SILVER)

GLYPHS = {
    "S": (".####", "#....", "#....", ".###.", "....#", "....#", "####."),
    "H": ("#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "I": ("###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"),
    "F": ("#####", "#....", "#....", "####.", "#....", "#....", "#...."),
    "A": (".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
}
def text(word, cx, y, col):
    width = sum(len(GLYPHS[ch][0]) for ch in word) + len(word) - 1
    x = cx - width // 2
    for ch in word:
        for r, row in enumerate(GLYPHS[ch]):
            for c, px in enumerate(row):
                if px == "#":
                    d.point((x + c, y + r), fill=col)
        x += len(GLYPHS[ch][0]) + 1

text("SA", C[0], C[1] - 6, WHITE)

# ---------- SHERIFFS banner ----------
BY = 49
d.polygon([(4, BY + 3), (12, BY + 3), (12, BY + 13), (4, BY + 13), (7, BY + 8)], fill=STEEL)    # tails
d.polygon([(75, BY + 3), (67, BY + 3), (67, BY + 13), (75, BY + 13), (72, BY + 8)], fill=STEEL)
d.polygon([(9, BY + 11), (12, BY + 13), (12, BY + 11)], fill=(80, 86, 98))
d.polygon([(70, BY + 11), (67, BY + 13), (67, BY + 11)], fill=(80, 86, 98))
d.rectangle([10, BY, 69, BY + 11], fill=BLACK)
d.line([(10, BY + 1), (69, BY + 1)], fill=SILVER)
d.line([(10, BY + 10), (69, BY + 10)], fill=SILVER)
text("SHERIFFS", 40, BY + 3, WHITE)

# black outline around the whole badge
alpha = art.getchannel("A").point(lambda v: 255 if v else 0)
outline = Image.new("RGBA", (N, N), BLACK + (255,))
outline.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
logo = Image.alpha_composite(outline, art)
logo.resize((N * 4, N * 4), Image.NEAREST).save(os.path.join(HERE, "san-antonio-sheriffs-logo.png"))
print("saved")
