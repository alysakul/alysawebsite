#!/usr/bin/env python3
"""
Light touch-up pass on the raw traced contours (traced_glyphs.json):
settles small hand-drawn/pixel-trace wobble without reinterpreting the
letterforms.

Two earlier versions were tried and rejected for changing the actual
letterforms, not just cleaning up noise:
  - fit each edge to an idealized straight line or circular arc: re-derived
    whole edges from scratch, shifting corner positions and adding curves
    that weren't there.
  - corner-detect (via a coarse approxPolyDP + chord-angle filter) and
    smooth only within the corner-bounded segments: the coarse detection
    missed real corners on tight features (the Y's fork tip, the S's
    hooks) since they fell within the coarse epsilon, so those points got
    smoothed anyway -- and because traced points are spaced very unevenly
    (long straight runs have few, widely-spaced points; curves have many,
    close together), index-based neighbor averaging blended points across
    entire straight edges, dragging corners far from where they were
    traced (verified: >80 font units off on a 750 cap-height, clearly
    visible).

This version smooths each point against its immediate neighbors, but only
neighbors within MAX_BLEND_DIST of it -- distance-clamped, not
index-clamped. A hand-wobble neighbor a few units away still gets
blended; a corner's neighbor across a long straight run does not, no
corner detection required. Net effect: small zig-zag settles down, real
corners and tight curves stay put (verified by overlaying the smoothed
contours back onto the source photo -- max displacement ~13 font units on
a 750 cap-height, vs. >80 with the corner-detection approach). Output:
cleaned_glyphs.json, consumed by build_font.py.
"""
import json
import numpy as np

IN = "/Users/alysa/alysawebsite/scripts/traced_glyphs.json"
OUT = "/Users/alysa/alysawebsite/scripts/cleaned_glyphs.json"

MAX_BLEND_DIST = 25  # font units; don't blend across gaps this large -- a real edge, not noise
SMOOTH_WINDOW = 1
SMOOTH_PASSES = 2
CENTER_WEIGHT = 0.5


def smooth_contour(contour):
    pts = np.array(contour, dtype=float)
    n = len(pts)
    if n < 3:
        return contour

    for _ in range(SMOOTH_PASSES):
        out = pts.copy()
        side_weight = (1 - CENTER_WEIGHT) / (2 * SMOOTH_WINDOW)
        for i in range(n):
            acc = pts[i] * CENTER_WEIGHT
            wsum = CENTER_WEIGHT
            for step in range(1, SMOOTH_WINDOW + 1):
                for j in ((i + step) % n, (i - step) % n):
                    if np.linalg.norm(pts[j] - pts[i]) < MAX_BLEND_DIST:
                        acc += pts[j] * side_weight
                        wsum += side_weight
            out[i] = acc / wsum
        pts = out

    return [(round(x, 2), round(y, 2)) for x, y in pts]


def main():
    with open(IN) as f:
        data = json.load(f)
    cleaned = {}
    for letter, g in data.items():
        contours = [smooth_contour(c) for c in g["contours"]]
        cleaned[letter] = {"advance": g["advance"], "contours": contours}
        print(letter, "contours:", [len(c) for c in contours])
    with open(OUT, "w") as f:
        json.dump(cleaned, f, indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
