"""Hoop Land custom court template geometry.

Hoop Land stretches the 1024x512 overlay around the court so that the playing
surface (sideline to sideline, baseline to baseline) fills the centered
640x320 box COURT; everything outside it lands on the borders and apron.
Measured from an in-game screenshot of an uploaded overlay.
"""
from PIL import Image

W, H = 1024, 512
COURT = (192, 96, 832, 416)
# The court box the make_*_overlay.py drawings are laid out on.
LAYOUT_COURT = (124, 70, 900, 442)


def fit_to_court(layer):
    """Map a 1024x512 drawing laid out on LAYOUT_COURT onto Hoop Land's COURT box."""
    sx = (LAYOUT_COURT[2] - LAYOUT_COURT[0]) / (COURT[2] - COURT[0])
    sy = (LAYOUT_COURT[3] - LAYOUT_COURT[1]) / (COURT[3] - COURT[1])
    # PIL's affine transform maps each output pixel back to its source pixel.
    data = (sx, 0, LAYOUT_COURT[0] - COURT[0] * sx, 0, sy, LAYOUT_COURT[1] - COURT[1] * sy)
    return layer.transform((W, H), Image.AFFINE, data, resample=Image.NEAREST)


def to_court(x, y):
    """Map a point laid out on LAYOUT_COURT to where fit_to_court puts it."""
    fx = COURT[0] + (x - LAYOUT_COURT[0]) * (COURT[2] - COURT[0]) / (LAYOUT_COURT[2] - LAYOUT_COURT[0])
    fy = COURT[1] + (y - LAYOUT_COURT[1]) * (COURT[3] - COURT[1]) / (LAYOUT_COURT[3] - LAYOUT_COURT[1])
    return round(fx), round(fy)
