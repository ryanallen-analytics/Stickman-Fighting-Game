"""Generate the Denver Miners court overlay for Hoop Land (1024x512 transparent PNG)."""
from court_template import COURT
from PIL import Image, ImageDraw, ImageFilter
import math, os

W, H = 1024, 512
LW, LH = W // 2, H // 2  # pixel-art layer, upscaled 2x
NAVY = (13, 34, 64)
GOLD = (248, 190, 40)
GOLD_LIGHT = (255, 230, 140)
GOLD_DARK = (190, 130, 20)
MAROON = (150, 34, 52)
CREAM = (244, 236, 220)
STEEL = (170, 178, 190)
WOOD = (120, 78, 42)
SNOW = (250, 252, 255)
HERE = os.path.dirname(os.path.abspath(__file__))
LEFT, TOP, RIGHT, BOTTOM = (v // 2 for v in COURT)   # court edges on the 2x pixel grid
CX, CY = (LEFT + RIGHT) // 2, (TOP + BOTTOM) // 2
SCORER = (234, 278)                                   # scorer's table gap on the far apron

img = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def nugget(x, y, s=1.0):
    pts = [(-4, 0), (-3, -3), (0, -4), (3, -3), (4, 0), (2, 3), (-2, 3)]
    d.polygon([(x + px * s, y + py * s) for px, py in pts], fill=GOLD + (255,), outline=GOLD_DARK + (255,))
    d.point((round(x - 1 * s), round(y - 2 * s)), fill=GOLD_LIGHT + (255,))

def sparkle(x, y, col=SNOW):
    d.line([(x - 2, y), (x + 2, y)], fill=col + (230,))
    d.line([(x, y - 2), (x, y + 2)], fill=col + (230,))

# ---------- mine-cart track along the far apron ----------
RAIL = TOP - 6
for x0, x1 in ((LEFT + 4, SCORER[0] - 2), (SCORER[1] + 2, RIGHT - 4)):
    for x in range(x0, x1, 6):                            # wooden ties
        d.rectangle([x, RAIL + 1, x + 3, RAIL + 3], fill=WOOD + (235,))
    d.line([(x0, RAIL), (x1, RAIL)], fill=STEEL + (240,))
    for cart_x in (x0 + (x1 - x0) // 3 - 9, x0 + 2 * (x1 - x0) // 3 - 9):
        d.polygon([(cart_x, RAIL - 14), (cart_x + 18, RAIL - 14), (cart_x + 16, RAIL - 3), (cart_x + 2, RAIL - 3)],
                  fill=MAROON + (245,), outline=NAVY + (255,))
        d.line([(cart_x + 1, RAIL - 11), (cart_x + 17, RAIL - 11)], fill=NAVY + (200,))
        for nx, ny in ((4, -15), (9, -17), (14, -15), (7, -14), (12, -14)):   # heaped gold
            nugget(cart_x + nx, RAIL + ny, 0.8)
        for wx in (cart_x + 4, cart_x + 14):
            d.ellipse([wx - 2, RAIL - 4, wx + 2, RAIL], fill=NAVY + (255,), outline=STEEL + (255,))
        sparkle(cart_x + 17, RAIL - 20)

# ---------- ring of gold nuggets around the logo ----------
R = 40
# angles skip 10-40 degrees below horizontal on each side, where the logo's banner sits
for deg in (-90, -45, -135, 0, 180, 90):
    a = math.radians(deg)
    nugget(CX + R * math.cos(a), CY + R * math.sin(a))
for deg in (-67, -113, -22, -158, 60, 120):
    a = math.radians(deg)
    sparkle(round(CX + R * math.cos(a)), round(CY + R * math.sin(a)), GOLD_LIGHT)

# ---------- Rockies behind the skyline ----------
BASE = BOTTOM
PEAKS = ((180, 0), (196, 14), (212, 8), (232, 22), (250, 12), (268, 24), (286, 14), (304, 20), (320, 9), (332, 0))
ridge = [(x, BASE - 4 - h) for x, h in PEAKS]
d.polygon([(180, BASE)] + ridge + [(332, BASE)], fill=(70, 100, 150, 150))
for (x0, h0), (x1, h1), (x2, h2) in zip(PEAKS, PEAKS[1:], PEAKS[2:]):
    if h1 >= 12 and h1 > h0 and h1 > h2:
        cap = 5
        lx = x1 - (x1 - x0) * cap / (h1 - h0)
        rx = x1 + (x2 - x1) * cap / (h1 - h2)
        d.polygon([(lx, BASE - 4 - h1 + cap), (x1, BASE - 4 - h1), (rx, BASE - 4 - h1 + cap)], fill=SNOW + (200,))

# ---------- Denver skyline along the near sideline ----------
mask = Image.new("L", (LW, LH), 0)
m = ImageDraw.Draw(mask)
# Colorado State Capitol: wings, drum and the gold-leaf dome
m.rectangle([186, BASE - 9, 218, BASE], fill=255)
m.rectangle([196, BASE - 15, 208, BASE - 9], fill=255)
for x0, x1, h in ((226, 238, 30), (242, 254, 34), (258, 268, 28), (288, 296, 22)):
    m.rectangle([x0, BASE - h, x1, BASE], fill=255)
m.pieslice([226, BASE - 36, 238, BASE - 24], 180, 360, fill=255)   # Wells Fargo Center's rounded crown
m.rectangle([228, BASE - 32, 236, BASE - 30], fill=255)
# D&F Tower: clock tower with a pyramid cap
m.rectangle([274, BASE - 24, 282, BASE], fill=255)
m.polygon([(273, BASE - 24), (278, BASE - 31), (283, BASE - 24)], fill=255)
m.line([(278, BASE - 34), (278, BASE - 31)], fill=255)
# Union Station: long hall with a raised center and its sign
m.rectangle([300, BASE - 8, 328, BASE], fill=255)
m.rectangle([308, BASE - 14, 320, BASE - 8], fill=255)

sky = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
sky.paste(CREAM + (220,), (0, 0), mask)
edge = Image.composite(Image.new("L", mask.size, 0), mask.filter(ImageFilter.MaxFilter(3)), mask)
sky.paste(NAVY + (235,), (0, 0), edge)
img.alpha_composite(sky)
d = ImageDraw.Draw(img)
# Capitol's gold dome on its drum
d.rectangle([198, BASE - 18, 206, BASE - 15], fill=CREAM + (240,), outline=NAVY + (240,))
d.pieslice([196, BASE - 27, 208, BASE - 15], 180, 360, fill=GOLD + (255,), outline=NAVY + (255,))
d.line([(202, BASE - 31), (202, BASE - 27)], fill=NAVY + (255,))
d.point((200, BASE - 24), fill=GOLD_LIGHT + (255,))
for x in range(188, 218, 3):
    if not 196 <= x <= 208:
        d.point((x, BASE - 5), fill=NAVY + (150,))
for x0, x1, h in ((226, 238, 30), (242, 254, 34), (258, 268, 28), (288, 296, 22)):
    for wy in range(BASE - h + 3, BASE - 2, 4):
        for wx in range(x0 + 2, x1 - 1, 3):
            d.point((wx, wy), fill=NAVY + (150,))
d.ellipse([276, BASE - 21, 280, BASE - 17], fill=CREAM + (255,), outline=NAVY + (255,))   # D&F clock
d.rectangle([309, BASE - 13, 319, BASE - 11], fill=MAROON + (230,))                       # Union Station sign
for x in (304, 324):
    d.rectangle([x - 1, BASE - 5, x + 1, BASE - 1], fill=NAVY + (200,))
d.line([(180, BASE), (332, BASE)], fill=NAVY + (230,))

img.resize((W, H), Image.NEAREST).save(os.path.join(HERE, "denver-miners-overlay.png"))
print("saved")
