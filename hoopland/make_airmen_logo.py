"""Generate the New Orleans Airmen team logo for Hoop Land (320x320 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import os

N = 80            # pixel-art canvas, upscaled 4x
NAVY = (15, 34, 64)
RED = (200, 16, 46)
WHITE = (250, 250, 250)
SHADE = (196, 206, 222)
GOLD = (212, 175, 90)
HERE = os.path.dirname(os.path.abspath(__file__))

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(art)

# ---------- pilot wings ----------
TIERS = (
    [(26, 25), (14, 24), (3, 19), (1, 21), (6, 28), (26, 31)],
    [(26, 31), (6, 29), (9, 35), (26, 37)],
    [(26, 37), (11, 35), (15, 41), (27, 43)],
)
for side in (0, 1):
    flip = (lambda p: p) if side == 0 else (lambda p: (N - 1 - p[0], p[1]))
    for i, tier in enumerate(TIERS):
        pts = [flip(p) for p in tier]
        d.polygon(pts, fill=WHITE if i == 0 else SHADE)
    for x in range(8, 26, 3):                       # feather separations
        for y0, y1 in ((25, 30), (31, 36), (37, 42)):
            if (y0 == 31 and x < 9) or (y0 == 37 and x < 14):
                continue
            a, b = flip((x, y0 + 1)), flip((x - 1, y1))
            d.line([a, b], fill=NAVY)
    for y in (31, 37):                               # tier seams
        d.line([flip((7 if y == 31 else 10, y - 1)), flip((26, y))], fill=NAVY)

# ---------- roundel with fleur-de-lis ----------
C = (40, 31)
def disc(r, col):
    d.ellipse([C[0] - r, C[1] - r, C[0] + r, C[1] + r], fill=col)
disc(17, NAVY)
disc(15, RED)
disc(13, WHITE)
FLEUR = (
    "........#........",
    ".......###.......",
    ".......###.......",
    "......#####......",
    "......#####......",
    ".#....#####....#.",
    "###...#####...###",
    "####..#####..####",
    "#..##.#####.##..#",
    "#...##.###.##...#",
    ".#...#.###.#...#.",
    "...###########...",
    "...###########...",
    ".....#######.....",
    "......#####......",
    ".....##.#.##.....",
    "....##..#..##....",
    "...##...#...##...",
    "..##.........##..",
)
fx, fy = C[0] - 8, C[1] - 9
fleur_mask = Image.new("L", (N, N), 0)
for r, row in enumerate(FLEUR):
    for c, ch in enumerate(row):
        if ch == "#":
            fleur_mask.putpixel((fx + c, fy + r), 255)
ring = fleur_mask.filter(ImageFilter.MaxFilter(3))
art.paste(NAVY + (255,), (0, 0), Image.composite(ring, Image.new("L", (N, N), 0), Image.eval(fleur_mask, lambda v: 255 - v)))
art.paste(GOLD + (255,), (0, 0), fleur_mask)

# ---------- AIRMEN banner ----------
d.polygon([(8, 55), (17, 55), (17, 65), (8, 65), (11, 60)], fill=RED)       # ribbon tails
d.polygon([(71, 55), (62, 55), (62, 65), (71, 65), (68, 60)], fill=RED)
d.polygon([(14, 63), (17, 65), (17, 63)], fill=(120, 8, 28))
d.polygon([(65, 63), (62, 65), (62, 63)], fill=(120, 8, 28))
d.rectangle([15, 51, 64, 63], fill=NAVY)
d.line([(15, 52), (64, 52)], fill=RED)
d.line([(15, 62), (64, 62)], fill=RED)
GLYPHS = {
    "A": (".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"),
    "I": ("###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"),
    "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "M": ("#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"),
}
word = "AIRMEN"
width = sum(len(GLYPHS[ch][0]) for ch in word) + len(word) - 1
x = 40 - width // 2
for ch in word:
    g = GLYPHS[ch]
    for r, row in enumerate(g):
        for c, px in enumerate(row):
            if px == "#":
                d.point((x + c, 54 + r), fill=WHITE)
    x += len(g[0]) + 1

# navy outline around the whole badge
alpha = art.getchannel("A").point(lambda v: 255 if v else 0)
outline = Image.new("RGBA", (N, N), NAVY + (255,))
outline.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
logo = Image.alpha_composite(outline, art)

logo.resize((N * 4, N * 4), Image.NEAREST).save(os.path.join(HERE, "new-orleans-airmen-logo.png"))
print("saved")
