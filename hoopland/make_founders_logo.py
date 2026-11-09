"""Generate the Philadelphia Founders team logo for Hoop Land (384x384 transparent PNG).

Early-2000s Philadelphia look: an italic gold wordmark with a black and red
outline, a star bursting from behind it, and a streaking basketball.
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

N = 128           # pixel-art canvas, upscaled 3x
GOLD = (200, 164, 90)
GOLD_LIGHT = (236, 206, 140)
BLACK = (16, 16, 20)
RED = (218, 30, 50)
BLUE = (30, 90, 200)
LBLUE = (110, 175, 240)
SILVER = (200, 206, 216)
WHITE = (255, 255, 255)
BALL = (206, 146, 66)
HERE = os.path.dirname(os.path.abspath(__file__))

def solid(mask, col):
    layer = Image.new("RGBA", (N, N), col + (255,))
    layer.putalpha(mask)
    return layer

def outlined(mask, inner_ring, outer_ring):
    """Stack: red outer ring, black inner ring, then the shape itself is filled by the caller."""
    m1 = mask.filter(ImageFilter.MaxFilter(3))
    m2 = m1.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    out.alpha_composite(solid(m2, outer_ring))
    out.alpha_composite(solid(m1, inner_ring))
    return out

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))

# ---------- star bursting from behind the wordmark ----------
def star_pts(cx, cy, r, tilt, inner=0.45):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * inner
        a = math.radians(-90 + tilt + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts
star = Image.new("L", (N, N), 0)
ImageDraw.Draw(star).polygon(star_pts(30, 40, 26, -14), fill=255)
art.alpha_composite(outlined(star, RED, BLACK))
art.alpha_composite(solid(star, BLACK))
inner_star = Image.new("L", (N, N), 0)
ImageDraw.Draw(inner_star).polygon(star_pts(30, 41, 15, -14), fill=255)
art.alpha_composite(solid(inner_star, RED))

# ---------- streak sweeping under the word into the ball ----------
def bezier(p0, p1, p2, n=60):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]) for t in (i / n for i in range(n + 1))]
streak = Image.new("RGBA", (N, N), (0, 0, 0, 0))
sd = ImageDraw.Draw(streak)
BANDS = ((0, SILVER, 4), (4, WHITE, 2), (6, LBLUE, 4), (10, BLUE, 4))
for offset, col, w in BANDS:
    pts = bezier((28 + offset * 0.3, 44 + offset), (52, 94 + offset * 0.6), (104, 74 + offset * 0.5))
    taper = len(pts) // 5                                  # thin, ragged start near the star
    sd.line(pts[taper:], fill=col + (255,), width=w)
    sd.line(pts[:taper + 1], fill=col + (255,), width=max(1, w - 1))
smask = streak.getchannel("A")
art.alpha_composite(solid(smask.filter(ImageFilter.MaxFilter(3)), BLACK))
art.alpha_composite(streak)

# ---------- FOUNDERS wordmark: bold italic block letters ----------
GLYPHS = {
    "F": ("######", "######", "##....", "##....", "#####.", "#####.", "##....", "##....", "##...."),
    "O": (".####.", "######", "##..##", "##..##", "##..##", "##..##", "##..##", "######", ".####."),
    "U": ("##..##", "##..##", "##..##", "##..##", "##..##", "##..##", "##..##", "######", ".####."),
    "N": ("##..##", "###.##", "######", "######", "##.###", "##..##", "##..##", "##..##", "##..##"),
    "D": ("#####.", "######", "##..##", "##..##", "##..##", "##..##", "##..##", "######", "#####."),
    "E": ("######", "######", "##....", "##....", "#####.", "#####.", "##....", "######", "######"),
    "R": ("#####.", "######", "##..##", "##..##", "######", "#####.", "##.##.", "##..##", "##..##"),
    "S": (".#####", "######", "##....", "#####.", ".#####", "....##", "....##", "######", "#####."),
}
WORD, S, Y0 = "FOUNDERS", 2, 44
letters = Image.new("L", (N, N), 0)
ld = ImageDraw.Draw(letters)
width = len(WORD) * 6 * S + (len(WORD) - 1) * 2
x0 = (N - width) // 2 - 3
x = x0
for ch in WORD:
    for r, row in enumerate(GLYPHS[ch]):
        shear = round((len(GLYPHS[ch]) - 1 - r) * S * 0.3)   # italic lean
        for c, px in enumerate(row):
            if px == "#":
                ld.rectangle([x + c * S + shear, Y0 + r * S, x + c * S + shear + S - 1, Y0 + r * S + S - 1], fill=255)
    x += 6 * S + 2
art.alpha_composite(outlined(letters, BLACK, RED))
art.alpha_composite(solid(letters, GOLD))
highlight = Image.new("L", (N, N), 0)                      # top-row highlight on each letter
for y in range(Y0, Y0 + S):
    for xx in range(N):
        if letters.getpixel((xx, y)):
            highlight.putpixel((xx, y), 255)
art.alpha_composite(solid(highlight, GOLD_LIGHT))

# ---------- the basketball at the end of the streak ----------
B, R = (106, 80), 13
ball = Image.new("L", (N, N), 0)
ImageDraw.Draw(ball).ellipse([B[0] - R, B[1] - R, B[0] + R, B[1] + R], fill=255)
art.alpha_composite(outlined(ball, BLACK, RED))
art.alpha_composite(solid(ball, BALL))
bd = ImageDraw.Draw(art)
bd.pieslice([B[0] - R + 3, B[1] - R + 3, B[0] + R - 8, B[1] + R - 8], 200, 260, fill=(236, 186, 110, 255))
bd.line([(B[0], B[1] - R), (B[0], B[1] + R)], fill=BLACK + (255,), width=1)
bd.line([(B[0] - R, B[1]), (B[0] + R, B[1])], fill=BLACK + (255,), width=1)
bd.arc([B[0] - R - 9, B[1] - R + 1, B[0] - 3, B[1] + R - 1], -55, 55, fill=BLACK + (255,))
bd.arc([B[0] + 3, B[1] - R + 1, B[0] + R + 9, B[1] + R - 1], 125, 235, fill=BLACK + (255,))

centered = Image.new("RGBA", (N, N), (0, 0, 0, 0))
centered.alpha_composite(art, (0, 9))                      # balance the empty space above and below
centered.resize((N * 3, N * 3), Image.NEAREST).save(os.path.join(HERE, "philadelphia-founders-logo.png"))
print("saved")
