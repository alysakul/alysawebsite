#!/usr/bin/env python3
"""
Traces the four hand-drawn letters (A, L, Y, S) directly from the
photographed sketch (../IMG_0253.tiff) into vector contours -- no
programmatic/geometric letterform construction. Each letter was drawn in
pen as an OUTLINE (not filled), so per letter:
  - one ink loop for a simple stroke silhouette (L, Y, S) -> fill its
    entire interior solid.
  - two nested ink loops for a letter with a true counter (A: the outer
    trapezoid loop + a separate inner arch loop) -> fill the outer loop
    solid, then subtract the inner loop's interior as a hole.

Which components belong to which letter, and which is "outer" vs "hole",
is derived from the scan itself (connected components + bbox nesting),
not hand-picked -- the only manual step is reading off the sketch's
baseline/cap-height guide so all four letters share one scale.

Outputs scripts/traced_glyphs.json: {letter: {advance, contours: [[[x,y],...], ...]}}
in font-unit space (UPM 1000, y-up, origin on the baseline), ready for
build_font.py to compile into a .ttf.
"""
import json
import cv2
import numpy as np
from PIL import Image

SRC = "/Users/alysa/alysawebsite/IMG_0253.tiff"
OUT = "/Users/alysa/alysawebsite/scripts/traced_glyphs.json"

UPM = 1000
CAP = 750
PAD = 50  # crop padding in source pixels

# Read off the sketch: the ruled baseline the letters sit on, and the cap
# line at the top of the strokes -- shared by all five drawn letters.
BASELINE_PX = 1356
CAP_PX = 62
SCALE = CAP / (BASELINE_PX - CAP_PX)


def load_ink_mask():
    im = Image.open(SRC).convert("L")
    arr = np.array(im)
    _, mask = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return mask


def find_letter_clusters(mask):
    n, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    comps = [
        {"id": i, "x": stats[i][0], "y": stats[i][1], "w": stats[i][2], "h": stats[i][3], "area": stats[i][4]}
        for i in range(1, n)
        if stats[i][4] > 500 and stats[i][0] > 30  # drop paper texture + left-margin spiral punch holes
    ]
    comps.sort(key=lambda c: c["x"])

    clusters = []
    for c in comps:
        if clusters and c["x"] <= clusters[-1]["x_end"]:
            clusters[-1]["members"].append(c)
            clusters[-1]["x_end"] = max(clusters[-1]["x_end"], c["x"] + c["w"])
        else:
            clusters.append({"members": [c], "x_end": c["x"] + c["w"]})
    return [cl["members"] for cl in clusters], labels


def build_fill_mask(members, labels, mask):
    xs0 = min(m["x"] for m in members) - PAD
    ys0 = min(m["y"] for m in members) - PAD
    xs1 = max(m["x"] + m["w"] for m in members) + PAD
    ys1 = max(m["y"] + m["h"] for m in members) + PAD
    xs0, ys0 = max(xs0, 0), max(ys0, 0)

    members_sorted = sorted(members, key=lambda c: c["area"], reverse=True)
    outer = members_sorted[0]
    holes = members_sorted[1:]

    outer_mask = (labels == outer["id"]).astype(np.uint8) * 255
    outer_mask = outer_mask[ys0:ys1, xs0:xs1]
    # smooth the pixel staircase before tracing, so the vector follows the
    # pen stroke rather than the raster grid
    outer_mask = cv2.GaussianBlur(outer_mask, (0, 0), 3)
    _, outer_mask = cv2.threshold(outer_mask, 127, 255, cv2.THRESH_BINARY)
    filled = cv2.morphologyEx(outer_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # fill everything the outer loop encloses (its own hollow interior included)
    h, w = filled.shape
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    flood = filled.copy()
    cv2.floodFill(flood, ff_mask, (0, 0), 255)
    filled = filled | cv2.bitwise_not(flood)

    for hole in holes:
        hole_mask = (labels == hole["id"]).astype(np.uint8) * 255
        hole_mask = hole_mask[ys0:ys1, xs0:xs1]
        hole_mask = cv2.GaussianBlur(hole_mask, (0, 0), 3)
        _, hole_mask = cv2.threshold(hole_mask, 127, 255, cv2.THRESH_BINARY)
        hh, hw = hole_mask.shape
        hff_mask = np.zeros((hh + 2, hw + 2), np.uint8)
        hflood = hole_mask.copy()
        cv2.floodFill(hflood, hff_mask, (0, 0), 255)
        hole_filled = hole_mask | cv2.bitwise_not(hflood)
        filled[hole_filled > 0] = 0

    return filled, (xs0, ys0)


def mask_to_contours(filled_mask, origin):
    # X is local to the crop (normalized per-glyph below in main(), since a
    # glyph's horizontal position on the page isn't meaningful). Y still
    # uses the shared page baseline so all four letters line up vertically.
    xs0, ys0 = origin
    contours, hierarchy = cv2.findContours(filled_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    result = []
    for cnt in contours:
        eps = 1.8
        approx = cv2.approxPolyDP(cnt, eps, True)
        pts = approx.reshape(-1, 2)
        if len(pts) < 3:
            continue
        font_pts = []
        for (px, py) in pts:
            fx = px * SCALE
            fy = (BASELINE_PX - (py + ys0)) * SCALE
            font_pts.append((round(fx, 2), round(fy, 2)))
        result.append(font_pts)
    return result


def main():
    mask = load_ink_mask()
    clusters, labels = find_letter_clusters(mask)
    print(f"found {len(clusters)} letter clusters")

    letters = {}
    used_letters = set()
    order = ["A", "L", "Y", "S", "A"]  # left-to-right in the photo
    for cluster, letter in zip(clusters, order):
        if letter in used_letters:
            continue  # keep the first occurrence of a repeated letter
        used_letters.add(letter)
        filled, origin = build_fill_mask(cluster, labels, mask)
        contours = mask_to_contours(filled, origin)
        xs = [p[0] for c in contours for p in c]
        advance = round(max(xs) - min(xs) + 60, 1) if xs else 400
        letters[letter] = {"advance": advance, "contours": contours}
        print(f"{letter}: {len(cluster)} ink component(s), {len(contours)} contour(s), advance={advance}")

    with open(OUT, "w") as f:
        json.dump(letters, f, indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
