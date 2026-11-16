"""A small ABA league badge for court overlays.

Drawn pixel by pixel at full resolution rather than shrunk from the big
league logo, so the stars, ball, wordmark and ribbon stay sharp.
"""
from PIL import Image, ImageDraw

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

def mini_league_badge():
    """The ABA league badge drawn pixel by pixel at 60x60 for placing on a court overlay."""
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
    return badge
