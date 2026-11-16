"""Generate the Dallas Knights court overlay for Hoop Land (1024x512 transparent PNG).

Modeled on a classic Dallas concept floor: a faint stained skyline with a
stained KNIGHTS wordmark above it, a fictional sponsor ("Bluebonnet
Center") split across the top of the floor clear of the three-point arcs,
the ABA badge at the scorer's table, and two championship trophies on the
near apron.
"""
from court_template import COURT
from league_badge import mini_league_badge
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
STAIN = (164, 116, 74)
NAVY = (12, 36, 80)
GREEN = (22, 140, 60)
BLUE = (40, 90, 200)
GOLD = (222, 182, 84)
GOLD_LIGHT = (250, 222, 140)
SILVER = (200, 206, 216)
WHITE = (255, 255, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX = (COURT[0] + COURT[2]) / 2
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS_LIGHT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# ---------- faint Dallas skyline stained into the floor (2x pixel grid) ----------
BASE = BOTTOM
sky = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(sky)
for x0, x1, h in ((180, 188, 12), (189, 196, 20), (197, 206, 16), (207, 214, 24),          # taller on the left
                  (266, 276, 18), (277, 286, 14), (287, 296, 10), (297, 306, 13), (307, 318, 8), (319, 328, 11),
                  (329, 340, 7), (341, 350, 5)):                                           # low on the right, under the wordmark
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
m.rectangle([224, BASE - 26, 228, BASE], fill=255)                                         # Reunion Tower stalk
m.ellipse([220, BASE - 36, 232, BASE - 24], fill=255)                                      # and its ball
m.rectangle([236, BASE - 32, 247, BASE], fill=255)                                         # Bank of America Plaza
m.polygon([(250, BASE), (250, BASE - 24), (256, BASE - 30), (262, BASE - 22), (262, BASE)], fill=255)   # Fountain Place
m.rectangle([214, BASE - 16, 223, BASE], fill=255)
layer = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
layer.paste(STAIN + (105,), (0, 0), sky)
img = layer.resize((W, H), Image.NEAREST)
d = ImageDraw.Draw(img)

# ---------- stained KNIGHTS wordmark above the low end of the skyline ----------
BLOCK = {
    "K": ("##..#", "##.#.", "###..", "##...", "###..", "##.#.", "##..#"),
    "N": ("##..#", "###.#", "#####", "##.##", "##..#", "##..#", "##..#"),
    "I": ("####", ".##.", ".##.", ".##.", ".##.", ".##.", "####"),
    "G": (".####", "##...", "##...", "##.##", "##..#", "##..#", ".####"),
    "H": ("##..#", "##..#", "##..#", "#####", "##..#", "##..#", "##..#"),
    "T": ("#####", "..##.", "..##.", "..##.", "..##.", "..##.", "..##."),
    "S": (".####", "##...", "##...", ".###.", "...##", "...##", "####."),
}
WORD, P = "KNIGHTS", 3                                     # 3 output pixels per glyph pixel
word_w = sum(len(BLOCK[ch][0]) * P + P for ch in WORD) - P
x, y0 = 598 - word_w // 2, 350
for ch in WORD:
    for r, row in enumerate(BLOCK[ch]):
        for c, px in enumerate(row):
            if px == "#":
                d.rectangle([x + c * P, y0 + r * P, x + c * P + P - 1, y0 + r * P + P - 1], fill=STAIN + (120,))
    x += len(BLOCK[ch][0]) * P + P

# ---------- Bluebonnet Center: fictional sponsor, split across the top of the floor ----------
LIGHT_BLUE = (120, 160, 240)

def bluebonnet(cx, top):
    """A minimal bluebonnet pair: tapering spikes of blue florets with white tips, on broad green leaves."""
    for sx, stop, rows in ((cx - 7, top + 6, 7), (cx + 7, top, 8)):   # a shorter and a taller spike
        base = stop + rows * 5
        d.line([(sx, base), (cx, top + 50)], fill=GREEN + (255,), width=2)
        for k in range(rows):
            y = base - k * 5
            half = max(1, (rows - k) // 2 + 1)
            for fx in range(-half, half + 1, 3):
                d.ellipse([sx + fx - 3, y - 3, sx + fx + 3, y + 2], fill=BLUE + (255,))
                d.point((sx + fx, y - 1), fill=LIGHT_BLUE + (255,))
        d.ellipse([sx - 2, stop - 4, sx + 2, stop], fill=WHITE + (255,))
    for sgn in (-1, 1):                                    # broad leaves at the base
        d.polygon([(cx, top + 48), (cx + sgn * 14, top + 42), (cx + sgn * 6, top + 50)], fill=GREEN + (255,))
    return (cx - 16, top - 4, cx + 16, top + 51)

mark_box = bluebonnet(432, 128)
name_font, sub_font = ImageFont.truetype(SANS, 17), ImageFont.truetype(SANS_LIGHT, 13)
NAME_C = (590, 150)
d.text((NAME_C[0], NAME_C[1] - 8), "Bluebonnet", font=name_font, fill=GREEN + (255,), anchor="mm")
d.text((NAME_C[0], NAME_C[1] + 10), "Center", font=sub_font, fill=NAVY + (255,), anchor="mm")
name_w = d.textlength("Bluebonnet", font=name_font)
name_box = (NAME_C[0] - name_w / 2, NAME_C[1] - 18, NAME_C[0] + name_w / 2, NAME_C[1] + 18)

# ---------- ABA badge at the scorer's table ----------
img.alpha_composite(mini_league_badge(), (round(CX - 30), 36))

# ---------- championship trophies on the near apron ----------
def trophy(x, y):
    """Minimal gold cup: bowl with handles, stem and a two-step base."""
    d.arc([x - 13, y + 1, x - 3, y + 11], 90, 270, fill=GOLD + (255,), width=2)          # handles
    d.arc([x + 3, y + 1, x + 13, y + 11], 270, 90, fill=GOLD + (255,), width=2)
    d.chord([x - 8, y - 6, x + 8, y + 14], 0, 180, fill=GOLD + (255,))                    # bowl
    d.rectangle([x - 8, y, x + 8, y + 4], fill=GOLD + (255,))
    d.line([(x - 5, y + 2), (x - 5, y + 7)], fill=GOLD_LIGHT + (255,))                   # shine
    d.rectangle([x - 1, y + 14, x + 1, y + 19], fill=GOLD + (255,))
    d.rectangle([x - 5, y + 19, x + 5, y + 21], fill=GOLD + (255,))
    d.rectangle([x - 7, y + 22, x + 7, y + 25], fill=GOLD + (255,))

year_font, label_font = ImageFont.truetype(SANS, 16), ImageFont.truetype(SANS_LIGHT, 8)
for year, gx in (("2035", CX - 120), ("2045", CX + 80)):
    trophy(gx, 432)
    d.text((gx + 16, 437), year, font=year_font, fill=WHITE + (255,), anchor="lm")
    d.text((gx + 16, 451), "C H A M P I O N S", font=label_font, fill=SILVER + (255,), anchor="lm")

img.save(os.path.join(HERE, "dallas-knights-overlay.png"))
print("saved; sponsor boxes:", [tuple(round(v) for v in b) for b in (mark_box, name_box)])
