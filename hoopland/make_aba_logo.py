"""Generate the ABA league logo for Hoop Land (384x384 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter
import math, os

N = 96            # pixel-art canvas, upscaled 4x
NAVY = (18, 32, 74)
RED = (206, 38, 44)
RED_DARK = (130, 20, 30)
CREAM = (246, 234, 206)
CREAM_DARK = (232, 214, 174)
ORANGE = (236, 116, 36)
ORANGE_LIGHT = (250, 160, 70)
ORANGE_DARK = (180, 76, 22)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))

art = Image.new("RGBA", (N, N), (0, 0, 0, 0))
d = ImageDraw.Draw(art)
C = (48, 45)

def disc(r, col):
    d.ellipse([C[0] - r, C[1] - r, C[0] + r, C[1] + r], fill=col)

# ---------- badge rings with a retro sunburst ----------
disc(44, NAVY)
disc(41, RED)
disc(39, CREAM)
for k in range(24):                                       # sunburst rays
    if k % 2:
        continue
    a0, a1 = math.radians(k * 15), math.radians(k * 15 + 15)
    d.polygon([C, (C[0] + 39 * math.cos(a0), C[1] + 39 * math.sin(a0)),
               (C[0] + 39 * math.cos(a1), C[1] + 39 * math.sin(a1))], fill=CREAM_DARK)
d.ellipse([C[0] - 39, C[1] - 39, C[0] + 39, C[1] + 39], outline=NAVY)

def star(cx, cy, r, col):
    pts = []
    for k in range(10):
        rr = r if k % 2 == 0 else r * 0.45
        a = math.radians(-90 + k * 36)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=col)
for k, deg in enumerate((-150, -120, -90, -60, -30)):    # arc of stars over the ball
    a = math.radians(deg)
    star(C[0] + 32 * math.cos(a), C[1] + 32 * math.sin(a), 4 if deg == -90 else 3, RED if k % 2 else NAVY)

# ---------- basketball ----------
B, BR = (48, 46), 21
d.ellipse([B[0] - BR - 1, B[1] - BR - 1, B[0] + BR + 1, B[1] + BR + 1], fill=NAVY)
d.ellipse([B[0] - BR, B[1] - BR, B[0] + BR, B[1] + BR], fill=ORANGE)
d.pieslice([B[0] - BR, B[1] - BR, B[0] + BR, B[1] + BR], 20, 110, fill=ORANGE_DARK)       # shading
d.ellipse([B[0] - BR + 3, B[1] - BR + 3, B[0] + BR - 2, B[1] + BR - 2], fill=ORANGE)
d.pieslice([B[0] - BR + 3, B[1] - BR + 3, B[0] + BR - 6, B[1] + BR - 6], 200, 250, fill=ORANGE_LIGHT)
d.line([(B[0], B[1] - BR), (B[0], B[1] + BR)], fill=NAVY, width=2)                          # seams
d.line([(B[0] - BR, B[1]), (B[0] + BR, B[1])], fill=NAVY, width=2)
d.arc([B[0] - BR - 14, B[1] - BR + 1, B[0] - 5, B[1] + BR - 1], -55, 55, fill=NAVY, width=2)
d.arc([B[0] + 5, B[1] - BR + 1, B[0] + BR + 14, B[1] + BR - 1], 125, 235, fill=NAVY, width=2)

# ---------- bold ABA wordmark across the ball ----------
BOLD = {
    "A": (".###.", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"),
    "B": ("####.", "##.##", "##.##", "####.", "##.##", "##.##", "####."),
}
word, S = "ABA", 2
letters = Image.new("L", (N, N), 0)
ld = ImageDraw.Draw(letters)
width = len(word) * 5 * S + (len(word) - 1) * 2
x0, y0 = 48 - width // 2, 39
x = x0
for ch in word:
    for r, row in enumerate(BOLD[ch]):
        for c, px in enumerate(row):
            if px == "#":
                ld.rectangle([x + c * S, y0 + r * S, x + c * S + S - 1, y0 + r * S + S - 1], fill=255)
    x += 5 * S + 2
for offset, col in ((2, RED), (1, NAVY)):                # layered 70s drop shadow keeps the counters open
    shadow = Image.new("L", (N, N), 0)
    shadow.paste(letters, (offset, offset))
    art.paste(col + (255,), (0, 0), shadow)
art.paste(WHITE + (255,), (0, 0), letters)

# ---------- BASKETBALL ribbon ----------
RY = 72
d.polygon([(4, RY + 3), (14, RY + 3), (14, RY + 13), (4, RY + 13), (8, RY + 8)], fill=RED)            # tails
d.polygon([(91, RY + 3), (81, RY + 3), (81, RY + 13), (91, RY + 13), (87, RY + 8)], fill=RED)
d.polygon([(11, RY + 11), (14, RY + 13), (14, RY + 11)], fill=RED_DARK)
d.polygon([(84, RY + 11), (81, RY + 13), (81, RY + 11)], fill=RED_DARK)
d.rectangle([12, RY, 83, RY + 11], fill=RED)
d.line([(12, RY + 1), (83, RY + 1)], fill=WHITE)
d.line([(12, RY + 10), (83, RY + 10)], fill=WHITE)
SMALL = {
    "B": ("##.", "#.#", "##.", "#.#", "##."), "A": (".#.", "#.#", "###", "#.#", "#.#"),
    "S": (".##", "#..", ".#.", "..#", "##."), "K": ("#.#", "#.#", "##.", "#.#", "#.#"),
    "E": ("###", "#..", "##.", "#..", "###"), "T": ("###", ".#.", ".#.", ".#.", ".#."),
    "L": ("#..", "#..", "#..", "#..", "###"),
}
word = "BASKETBALL"
x = 48 - (len(word) * 4 - 1) // 2
for ch in word:
    for r, row in enumerate(SMALL[ch]):
        for c, px in enumerate(row):
            if px == "#":
                d.point((x + c, RY + 3 + r), fill=WHITE)
    x += 4

# navy outline around the whole badge
alpha = art.getchannel("A").point(lambda v: 255 if v else 0)
edge = Image.new("RGBA", (N, N), NAVY + (255,))
edge.putalpha(alpha.filter(ImageFilter.MaxFilter(3)))
logo = Image.alpha_composite(edge, art)
logo.resize((N * 4, N * 4), Image.NEAREST).save(os.path.join(HERE, "aba-league-logo.png"))
print("saved")
