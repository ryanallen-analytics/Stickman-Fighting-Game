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

# ---------- small league logos by each paint ----------
league = Image.open(os.path.join(HERE, "aba-league-logo.png")).convert("RGBA")
league = league.resize((128, 128), Image.NEAREST).resize((26, 26), Image.BOX)   # back to pixel scale, then shrink
league.putalpha(league.getchannel("A").point(lambda v: 255 if v >= 128 else 0))   # crisp, fully opaque pixels
for fx, fy in ((0.9, 0.22), (0.1, 0.84)):
    x = LEFT + fx * (RIGHT - LEFT) - 13
    y = TOP + fy * (BOTTOM - TOP) - 13
    img.alpha_composite(league, (round(x), round(y)))

img = img.resize((W, H), Image.NEAREST)

# ---------- arena name in the near treeline ----------
d = ImageDraw.Draw(img)
d.text((CX * 2, BOTTOM * 2 + 15), "BOREAL CENTER", font=ImageFont.truetype(SANS, 15), fill=WHITE + (255,), anchor="mm")

img.save(os.path.join(HERE, "minnesota-sabers-overlay.png"))
print("saved")
