"""Generate the Minnesota Sabers court overlay for Hoop Land (1024x512 transparent PNG).

Modeled on a classic Minnesota floor: rows of pine trees along both
sidelines, the arena name in the near treeline, and small league logos
by each paint.
"""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
LIME = (122, 193, 67)
FOREST = (24, 112, 56)
DARK = (8, 40, 24)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (LEFT + RIGHT) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron
ARENA_GAP = (220, 292)                                # room for the arena name in the near treeline
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# ---------- rows of pines along both sidelines ----------
def pine(x, base, h, col):
    """A small tiered pine: three stacked triangles, widest at the bottom."""
    for k in range(3):
        top = base - h + k * h // 3
        half = 2 + k * 1.5
        d.polygon([(x, top), (x - half, top + h // 3 + 1), (x + half, top + h // 3 + 1)], fill=col + (255,))
    d.rectangle([x, base - 1, x, base], fill=DARK + (255,))

def treeline(base, gap):
    for i, x in enumerate(range(LEFT + 3, RIGHT - 2, 8)):
        if gap[0] <= x <= gap[1]:
            continue
        pine(x, base, 11 if i % 2 else 9, LIME if i % 2 else FOREST)

treeline(TOP - 2, SCORER)
treeline(BOTTOM + 13, ARENA_GAP)

img = img.resize((W, H), Image.NEAREST)

# ---------- small league logos by each paint ----------
# Drawn pixel by pixel at full resolution rather than shrunk from the big league logo, so they stay sharp.
NAVY, RED, CREAM, ORANGE, BALL_DARK = (18, 32, 74), (206, 38, 44), (246, 234, 206), (236, 116, 36), (180, 76, 22)
BOLD = {"A": (".###.", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"),
        "B": ("####.", "##.##", "##.##", "####.", "##.##", "##.##", "####.")}
TINY = {"B": ("##.", "#.#", "##.", "#.#", "##."), "A": (".#.", "#.#", "###", "#.#", "#.#"),
        "S": (".##", "#..", ".#.", "..#", "##."), "K": ("#.#", "#.#", "##.", "#.#", "#.#"),
        "E": ("###", "#..", "##.", "#..", "###"), "T": ("###", ".#.", ".#.", ".#.", ".#."),
        "L": ("#..", "#..", "#..", "#..", "###")}

def glyphs(draw, word, font, x, y, col):
    for ch in word:
        for r, row in enumerate(font[ch]):
            for c, px in enumerate(row):
                if px == "#":
                    draw.point((x + c, y + r), fill=col + (255,))
        x += len(font[ch][0]) + 1

def mini_league_logo(cx, cy):
    badge = Image.new("RGBA", (60, 60), (0, 0, 0, 0))
    b = ImageDraw.Draw(badge)
    c = 30
    b.ellipse([c - 26, c - 26, c + 26, c + 26], fill=NAVY + (255,))
    b.ellipse([c - 24, c - 24, c + 24, c + 24], fill=RED + (255,))
    b.ellipse([c - 22, c - 22, c + 22, c + 22], fill=CREAM + (255,))
    for sx in (c - 10, c, c + 10):                        # three stars over the ball
        b.polygon([(sx, c - 20), (sx + 1, c - 18), (sx + 3, c - 18), (sx + 1, c - 17), (sx + 2, c - 15),
                   (sx, c - 16), (sx - 2, c - 15), (sx - 1, c - 17), (sx - 3, c - 18), (sx - 1, c - 18)],
                  fill=(RED if sx == c else NAVY) + (255,))
    b.ellipse([c - 14, c - 13, c + 14, c + 15], fill=NAVY + (255,))   # the ball
    b.ellipse([c - 13, c - 12, c + 13, c + 14], fill=ORANGE + (255,))
    b.pieslice([c - 13, c - 12, c + 13, c + 14], 20, 110, fill=BALL_DARK + (255,))
    b.ellipse([c - 11, c - 10, c + 12, c + 13], fill=ORANGE + (255,))
    b.line([(c, c - 12), (c, c + 14)], fill=NAVY + (255,))
    b.line([(c - 13, c + 1), (c + 13, c + 1)], fill=NAVY + (255,))
    b.arc([c - 22, c - 11, c - 5, c + 13], -55, 55, fill=NAVY + (255,))
    b.arc([c + 5, c - 11, c + 22, c + 13], 125, 235, fill=NAVY + (255,))
    glyphs(b, "ABA", BOLD, c - 8 + 1, c - 3 + 1, NAVY)    # wordmark with a navy drop shadow
    glyphs(b, "ABA", BOLD, c - 8, c - 3, (255, 255, 255))
    b.rectangle([c - 25, c + 15, c + 25, c + 23], fill=RED + (255,), outline=NAVY + (255,))   # ribbon
    b.polygon([(c - 29, c + 17), (c - 25, c + 17), (c - 25, c + 25), (c - 29, c + 25), (c - 27, c + 21)], fill=RED + (255,))
    b.polygon([(c + 29, c + 17), (c + 25, c + 17), (c + 25, c + 25), (c + 29, c + 25), (c + 27, c + 21)], fill=RED + (255,))
    glyphs(b, "BASKETBALL", TINY, c - 19, c + 17, (255, 255, 255))
    img.alpha_composite(badge, (round(cx - 30), round(cy - 30)))

for fx, fy in ((0.9, 0.22), (0.1, 0.84)):
    mini_league_logo(COURT[0] + fx * (COURT[2] - COURT[0]), COURT[1] + fy * (COURT[3] - COURT[1]))

# ---------- arena name in the near treeline ----------
d = ImageDraw.Draw(img)
d.text((CX * 2, BOTTOM * 2 + 15), "BOREAL CENTER", font=ImageFont.truetype(SANS, 15), fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "minnesota-sabers-overlay.png"))
print("saved")
