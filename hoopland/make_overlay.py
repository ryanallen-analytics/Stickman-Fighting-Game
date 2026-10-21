"""Generate the Louisville Mustangs court overlay for Hoop Land (1024x512 transparent PNG)."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
GOLD = (236, 196, 98)
BLACK = (18, 16, 14)
INK = (24, 18, 12)
HERE = os.path.dirname(os.path.abspath(__file__))
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ---------- skyline (logical 512x256 coords) ----------
BASE = 218          # just inside the near sideline
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
detail = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(detail)

def rect(x0, top, x1):
    m.rectangle([x0, top, x1, BASE], fill=255)

# Big Four Bridge (left): deck + three truss humps
deck = BASE - 8
m.rectangle([150, deck, 214, deck + 2], fill=255)
for x0 in (150, 172, 194):
    m.polygon([(x0, deck), (x0 + 4, deck - 9), (x0 + 16, deck - 9), (x0 + 20, deck)], fill=255)
    for k in range(4):
        xa = x0 + 4 + k * 3
        d.line([(xa, deck - 1), (xa + 3, deck - 8)], fill=INK + (150,))
for px in (152, 174, 196, 212):
    m.rectangle([px, deck + 2, px + 1, BASE], fill=255)

rect(216, BASE - 14, 224)                      # low riverfront block
# Humana Building: stepped postmodern crown
rect(226, BASE - 34, 236)
m.rectangle([228, BASE - 38, 234, BASE - 34], fill=255)
m.rectangle([230, BASE - 41, 232, BASE - 38], fill=255)
rect(238, BASE - 22, 246)
# 400 West Market: arched crown
rect(248, BASE - 40, 260)
m.pieslice([248, BASE - 47, 260, BASE - 33], 180, 360, fill=255)
rect(262, BASE - 18, 270)
# Aegon Center: tallest, dome + lantern
rect(272, BASE - 44, 286)
m.pieslice([273, BASE - 51, 285, BASE - 37], 180, 360, fill=255)
m.rectangle([278, BASE - 55, 280, BASE - 50], fill=255)
m.line([(279, BASE - 60), (279, BASE - 55)], fill=255)
# PNC Plaza: flat slab
rect(288, BASE - 32, 300)
rect(302, BASE - 20, 312)
# KFC Yum! Center-style arena: low curved roof
m.pieslice([314, BASE - 14, 338, BASE + 14], 180, 360, fill=255)
# Louisville Slugger museum + giant bat
rect(340, BASE - 12, 352)
m.polygon([(355, BASE), (358, BASE), (359, BASE - 30), (356, BASE - 30)], fill=255)
m.ellipse([355, BASE - 33, 360, BASE - 28], fill=255)

# windows inside the towers (sparse, faint)
for (x0, x1, top) in ((228, 234, BASE - 32), (250, 258, BASE - 36), (274, 284, BASE - 40), (290, 298, BASE - 29)):
    for y in range(top, BASE - 3, 4):
        for x in range(x0, x1, 3):
            d.point((x, y), fill=INK + (90,))

# outline = dilated silhouette minus silhouette, plus the base line
outer = mask.filter(ImageFilter.MaxFilter(3))
edge = Image.eval(Image.composite(Image.new("L", mask.size, 0), outer, mask), lambda v: v)
skyline = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
skyline.paste(INK + (200,), (0, 0), edge)
fill = Image.new("RGBA", (LW, LH), GOLD + (55,))       # faint gold wash inside buildings
skyline = Image.alpha_composite(Image.composite(fill, skyline, mask), detail)
ImageDraw.Draw(skyline).line([(146, BASE + 1), (366, BASE + 1)], fill=INK + (200,))
layer = skyline.resize((W, H), Image.NEAREST)

# ---------- sponsor decals (full-res, no anti-aliasing for a pixel look) ----------
dr = ImageDraw.Draw(layer)
dr.fontmode = "1"

def outlined(xy, text, font, fill, anchor="mm"):
    x, y = xy
    for dx in (-2, 0, 2):
        for dy in (-2, 0, 2):
            if dx or dy:
                dr.text((x + dx, y + dy), text, font=font, fill=BLACK + (230,), anchor=anchor)
    dr.text((x, y), text, font=font, fill=fill, anchor=anchor)

big, small = ImageFont.truetype(BOLD, 16), ImageFont.truetype(BOLD, 12)

def bolt(cx, cy, s, fill):
    pts = [(0, -6), (-3, 1), (0, 1), (-2, 7), (4, -1), (1, -1), (3, -6)]
    pts = [(cx + px * s, cy + py * s) for px, py in pts]
    dr.polygon([(x + 2, y + 2) for x, y in pts], fill=BLACK + (230,))
    dr.polygon(pts, fill=fill)

# Sponsor 1 (top-left, in front of the bench): Bluegrass Bolt Energy
cx, cy = 432, 122
dr.rounded_rectangle([362, 100, 502, 146], 6, fill=(30, 70, 150, 185), outline=BLACK + (230,), width=3)
bolt(376, cy, 1.9, GOLD + (255,))
outlined((446, cy - 7), "BLUEGRASS", big, (255, 255, 255, 255))
outlined((446, cy + 11), "BOLT  ENERGY", small, GOLD + (255,))

# Sponsor 2 (top-right): Derby Dash Courier
cx = 592
dr.rounded_rectangle([522, 100, 662, 146], 6, fill=(150, 24, 36, 185), outline=BLACK + (230,), width=3)
outlined((592, cy - 7), "DERBY DASH", big, (255, 255, 255, 255))
outlined((592, cy + 11), "COURIER CO.", small, GOLD + (255,))

layer.save(os.path.join(HERE, "louisville-mustangs-overlay.png"))
print("saved")
