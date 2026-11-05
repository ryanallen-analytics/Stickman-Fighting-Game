"""Generate the Denver Miners team logo for Hoop Land (320x320 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import os

N = 80            # pixel-art canvas, upscaled 4x
NAVY = (13, 34, 64)
GOLD = (248, 190, 40)
GOLD_LIGHT = (255, 224, 120)
GOLD_DARK = (196, 136, 20)
MAROON = (150, 34, 52)
WOOD = (150, 96, 52)
WOOD_DARK = (104, 62, 30)
STEEL = (200, 208, 218)
STEEL_DARK = (128, 138, 152)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(art)

# ---------- crossed pickaxes ----------
def pickaxe(flip):
    f = (lambda p: p) if not flip else (lambda p: (N - 1 - p[0], p[1]))
    d.line([f((14, 64)), f((58, 18))], fill=WOOD_DARK, width=5)            # handle
    d.line([f((14, 63)), f((57, 18))], fill=WOOD, width=3)
    d.polygon([f(p) for p in ((47, 8), (54, 10), (61, 15), (66, 21), (69, 29), (65, 26), (60, 20),
                              (54, 16), (46, 13))], fill=STEEL)    # curved head
    d.line([f((49, 12)), f((56, 15)), f((63, 21))], fill=STEEL_DARK)
    d.rectangle([f((55, 15))[0] - 2, 15, f((55, 15))[0] + 2, 21], fill=STEEL_DARK)   # collar
pickaxe(False)
pickaxe(True)

# ---------- gold basketball ----------
C, R = (40, 36), 17
d.ellipse([C[0] - R, C[1] - R, C[0] + R, C[1] + R], fill=GOLD)
d.pieslice([C[0] - R, C[1] - R, C[0] + R, C[1] + R], 200, 290, fill=GOLD_LIGHT)   # shine
d.ellipse([C[0] - R + 3, C[1] - R + 3, C[0] + R - 3, C[1] + R - 3], fill=GOLD)
d.pieslice([C[0] - R, C[1] - R, C[0] + R, C[1] + R], 20, 110, fill=GOLD_DARK)    # shadow
d.ellipse([C[0] - R + 3, C[1] - R + 3, C[0] + R - 3, C[1] + R - 3], fill=GOLD)
d.line([(C[0], C[1] - R), (C[0], C[1] + R)], fill=NAVY, width=2)                 # seams
d.line([(C[0] - R, C[1]), (C[0] + R, C[1])], fill=NAVY, width=2)
d.arc([C[0] - R - 12, C[1] - R + 1, C[0] - 4, C[1] + R - 1], -55, 55, fill=NAVY, width=2)
d.arc([C[0] + 4, C[1] - R + 1, C[0] + R + 12, C[1] + R - 1], 125, 235, fill=NAVY, width=2)
d.point((C[0] - 8, C[1] - 10), fill=WHITE)                                          # sparkle
d.point((C[0] - 9, C[1] - 10), fill=WHITE)

# ---------- MINERS banner ----------
BY = 54
d.polygon([(4, BY + 3), (12, BY + 3), (12, BY + 13), (4, BY + 13), (7, BY + 8)], fill=MAROON)
d.polygon([(75, BY + 3), (67, BY + 3), (67, BY + 13), (75, BY + 13), (72, BY + 8)], fill=MAROON)
d.polygon([(9, BY + 11), (12, BY + 13), (12, BY + 11)], fill=(96, 20, 32))
d.polygon([(70, BY + 11), (67, BY + 13), (67, BY + 11)], fill=(96, 20, 32))
d.rectangle([10, BY, 69, BY + 11], fill=NAVY)
d.line([(10, BY + 1), (69, BY + 1)], fill=GOLD)
d.line([(10, BY + 10), (69, BY + 10)], fill=GOLD)
GLYPHS = {
    "M": ("#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"),
    "I": ("###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"),
    "N": ("#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"),
    "E": ("#####", "#....", "#....", "####.", "#....", "#....", "#####"),
    "R": ("####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"),
    "S": (".####", "#....", "#....", ".###.", "....#", "....#", "####."),
}
word = "MINERS"
width = sum(len(GLYPHS[ch][0]) for ch in word) + len(word) - 1
x = 40 - width // 2
for ch in word:
    for r, row in enumerate(GLYPHS[ch]):
        for c, px in enumerate(row):
            if px == "#":
                d.point((x + c, BY + 3 + r), fill=WHITE)
    x += len(GLYPHS[ch][0]) + 1

# navy outline around the whole logo
alpha = art.getchannel("A").point(lambda v: 255 if v else 0)
outline = Image.new("RGBA", (N, N), NAVY + (255,))
outline.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
logo = Image.alpha_composite(outline, art)
logo.resize((N * 4, N * 4), Image.NEAREST).save(os.path.join(HERE, "denver-miners-logo.png"))
print("saved")
