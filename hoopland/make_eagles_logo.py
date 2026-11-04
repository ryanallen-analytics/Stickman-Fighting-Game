"""Generate the Washington Eagles team logo for Hoop Land (320x320 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os

N = 80            # pixel-art canvas, upscaled 4x
NAVY = (16, 36, 84)
RED = (210, 24, 48)
WHITE = (250, 250, 252)
SHADE = (190, 200, 220)
GOLD = (236, 186, 60)
HERE = os.path.dirname(os.path.abspath(__file__))

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(art)

# ---------- bald eagle head, facing right ----------
OX, OY = 18, 3
def P(pts):
    return [(OX + x, OY + y) for x, y in pts]

HEAD = P([(2, 38), (6, 33), (0, 29), (6, 26), (1, 21), (8, 19), (4, 13), (12, 10), (11, 5),
          (19, 2), (27, 2), (32, 5), (34, 10), (31, 21), (27, 26), (25, 32), (21, 38)])
d.polygon(HEAD, fill=WHITE)
for streak in ([(3, 33), (10, 29)], [(2, 27), (9, 24)], [(3, 21), (10, 19)], [(6, 14), (12, 13)],
               [(12, 34), (16, 30)], [(17, 37), (20, 32)]):          # feather shading
    d.line(P(streak), fill=SHADE)
BEAK = P([(30, 10), (36, 10), (40, 13), (41, 18), (39, 23), (37, 19), (33, 20), (29, 21)])
d.polygon(BEAK, fill=GOLD)
d.line(P([(30, 16), (38, 16)]), fill=NAVY)                          # mouth line
d.line(P([(36, 11), (39, 14)]), fill=(255, 226, 140))                # beak highlight
d.polygon(P([(18, 8), (33, 9), (33, 11), (22, 11)]), fill=NAVY)     # fierce brow
d.rectangle(P([(26, 12), (28, 13)]), fill=RED)                       # eye
d.point(P([(27, 12)])[0], fill=NAVY)

# ---------- EAGLES wordmark (glyphs drawn at 2x) ----------
GLYPHS = {                                       # bold: vertical strokes two units wide
    "E": ("#####", "##...", "##...", "####.", "##...", "##...", "#####"),
    "A": (".###.", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"),
    "G": (".####", "##...", "##...", "##.##", "##.##", "##.##", ".####"),
    "L": ("##...", "##...", "##...", "##...", "##...", "##...", "#####"),
    "S": (".####", "##...", "##...", ".###.", "...##", "...##", "####."),
}
WORD, TY = "EAGLES", 44
width = len(WORD) * 10 + (len(WORD) - 1) * 2
x = 40 - width // 2
for ch in WORD:
    for r, row in enumerate(GLYPHS[ch]):
        for c, px in enumerate(row):
            if px == "#":
                col = RED if r >= 5 else WHITE                       # red-striped base like a flag
                d.rectangle([x + c * 2, TY + r * 2, x + c * 2 + 1, TY + r * 2 + 1], fill=col)
    x += 12

# ---------- DC flag stars ----------
def star(cx, cy, r, col):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * 0.45
        a = math.radians(-90 + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=col)
for sx in (28, 40, 52):
    star(sx, 66, 4, RED)

# navy outline around the whole logo
alpha = art.getchannel("A").point(lambda v: 255 if v else 0)
outline = Image.new("RGBA", (N, N), NAVY + (255,))
outline.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
logo = Image.alpha_composite(outline, art)
logo.resize((N * 4, N * 4), Image.NEAREST).save(os.path.join(HERE, "washington-eagles-logo.png"))
print("saved")
