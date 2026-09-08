#!/usr/bin/env python3
"""
Targeted geometric touch-ups on top of cleaned_glyphs.json, applied only to
the specific features Alysa called out by name -- everything else stays
exactly as traced/cleaned:

  A: the two bottom feet get true 90-degree corners (currently slightly
     rounded where the pen lifted); the outer top arch and the counter's
     top arch both become smooth circular arcs (both edges of that top
     stroke, inside and outside).
  L: rebuilt as an exact rectangle, with a small foot/tail added at the
     bottom-right so it reads as an L rather than a plain bar.
  Y: the two arm tops and the stem bottom get true 90-degree corners; the
     inner fork (where the two arms meet) becomes a smooth circular arc,
     fit the same way as the A's counter arch.
  S: no shape changes -- just a couple more light smoothing passes to
     settle any remaining small jaggedness in its curves.

Each edit targets a specific, hand-identified index range of the
already-cleaned contour (found by inspecting the point list directly
against the traced photo) -- this is a one-off shape edit, not a general
rule, so it explicitly names which points it touches rather than trying
to auto-detect these features on arbitrary letters. New contours are
assembled by concatenating labeled slices of the original array (never
mutated in place), so there's no index-shift bookkeeping.

Input: cleaned_glyphs.json. Output: refined_glyphs.json, consumed by
build_font.py.
"""
import json
import numpy as np

IN = "/Users/alysa/alysawebsite/scripts/cleaned_glyphs.json"
OUT = "/Users/alysa/alysawebsite/scripts/refined_glyphs.json"


def fit_circle(points):
    pts = np.array(points, dtype=float)
    x, y = pts[:, 0], pts[:, 1]
    A = np.column_stack([2 * x, 2 * y, np.ones(len(x))])
    b = x ** 2 + y ** 2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    r = np.sqrt(c + cx ** 2 + cy ** 2)
    return cx, cy, r


def arc_between(p_start, p_end, fit_pts, n_interior):
    """n_interior smooth circular-arc points strictly between p_start and
    p_end (both kept fixed), fit to fit_pts, following whichever sweep
    direction passes closest to fit_pts' own midpoint."""
    cx, cy, r = fit_circle(fit_pts)
    a_start = np.arctan2(p_start[1] - cy, p_start[0] - cx)
    a_end = np.arctan2(p_end[1] - cy, p_end[0] - cx)
    mid = np.array(fit_pts[len(fit_pts) // 2])

    best = None
    for dirn in (1, -1):
        d = (a_end - a_start) % (2 * np.pi)
        if dirn == -1:
            d -= 2 * np.pi
        angles = a_start + d * np.linspace(0, 1, 20)
        arc_pts = np.column_stack([cx + r * np.cos(angles), cy + r * np.sin(angles)])
        score = np.min(np.linalg.norm(arc_pts - mid, axis=1))
        if best is None or score < best[0]:
            best = (score, d)
    _, d = best
    angles = a_start + d * np.linspace(0, 1, n_interior + 2)[1:-1]
    return np.column_stack([cx + r * np.cos(angles), cy + r * np.sin(angles)])


def smooth(pts, window=1, passes=2, max_dist=25, center_weight=0.5):
    pts = np.array(pts, dtype=float)
    n = len(pts)
    for _ in range(passes):
        out = pts.copy()
        side_weight = (1 - center_weight) / (2 * window)
        for i in range(n):
            acc = pts[i] * center_weight
            wsum = center_weight
            for step in range(1, window + 1):
                for j in ((i + step) % n, (i - step) % n):
                    if np.linalg.norm(pts[j] - pts[i]) < max_dist:
                        acc += pts[j] * side_weight
                        wsum += side_weight
            out[i] = acc / wsum
        pts = out
    return pts


def round2(pts):
    return [(round(float(x), 2), round(float(y), 2)) for x, y in pts]


# ---------------------------------------------------------------- A ----

def refine_A(contours):
    outer = np.array(contours[0], dtype=float)
    counter = np.array(contours[1], dtype=float)

    # -- bottom: four corners, all snapped to true right angles --
    vx_outer_left = np.mean(outer[6:20, 0])
    hy_left = np.mean(outer[27:31, 1])
    vx_inner_left = outer[36, 0]

    vx_inner_right = np.mean(outer[43:51, 0])
    hy_right = np.mean(outer[55:59, 1])
    vx_outer_right = np.mean(outer[60:73, 0])

    left_outer_corner = np.array([vx_outer_left, hy_left])
    left_inner_corner = np.array([vx_inner_left, hy_left])
    right_inner_corner = np.array([vx_inner_right, hy_right])
    right_outer_corner = np.array([vx_outer_right, hy_right])

    seg_vert_left = outer[6:20].copy()
    seg_vert_left[:, 0] = vx_outer_left
    seg_flat_left = outer[27:31].copy()
    seg_flat_left[:, 1] = hy_left
    seg_notch_top = outer[37:43].copy()  # unchanged -- the genuine second notch
    seg_vert_inner_right = outer[43:51].copy()
    seg_vert_inner_right[:, 0] = vx_inner_right
    seg_flat_right = outer[55:59].copy()
    seg_flat_right[:, 1] = hy_right
    seg_vert_right = outer[60:73].copy()
    seg_vert_right[:, 0] = vx_outer_right

    bottom_rebuilt = np.vstack([
        seg_vert_left,
        [left_outer_corner],
        seg_flat_left,
        [left_inner_corner],
        [[vx_inner_left, outer[36, 1]]],
        seg_notch_top,
        seg_vert_inner_right,
        [right_inner_corner],
        seg_flat_right,
        [right_outer_corner],
        seg_vert_right,
    ])

    # top region (wraps past idx84/idx0 in the original ordering) sits
    # untouched at the tail (old idx73:85) and head (old idx0:6) -- keep the
    # array rotated so this whole span is one contiguous run for the arc step.
    top_tail = outer[73:85]
    top_head = outer[0:6]
    top_region = np.vstack([top_tail, top_head])  # 18 pts, no wrap

    p_start, p_end = top_region[0], top_region[-1]
    arc = arc_between(p_start, p_end, top_region, n_interior=14)
    new_top = np.vstack([[p_start], arc, [p_end]])

    new_outer = np.vstack([bottom_rebuilt, new_top])

    # counter's rounded top cap: old idx24,25,26,0,1,2,3 (wraps) -- rotate so
    # it's contiguous, keep endpoints idx24 and idx3 fixed.
    top_cap = np.vstack([counter[24:27], counter[0:4]])  # 7 pts, no wrap
    p_start, p_end = top_cap[0], top_cap[-1]
    arc = arc_between(p_start, p_end, top_cap, n_interior=10)
    new_cap = np.vstack([[p_start], arc, [p_end]])
    new_counter = np.vstack([counter[4:24], new_cap])

    return [round2(new_outer), round2(new_counter)]


# ---------------------------------------------------------------- L ----

def refine_L(contours):
    pts = np.array(contours[0], dtype=float)
    left_x = np.mean(pts[14:19, 0])
    right_x = np.mean(pts[36:40, 0])
    top_y = np.mean(pts[3:8, 1])
    bottom_y = np.mean(pts[26:32, 1])
    stroke_w = right_x - left_x

    foot_len = stroke_w * 0.55
    foot_h = stroke_w * 0.3

    rect = [
        (left_x, top_y),
        (right_x, top_y),
        (right_x, bottom_y + foot_h),
        (right_x + foot_len, bottom_y + foot_h),
        (right_x + foot_len, bottom_y),
        (left_x, bottom_y),
    ]
    return [round2(np.array(rect))]


# ---------------------------------------------------------------- Y ----

def refine_Y(contours):
    pts = np.array(contours[0], dtype=float)

    # -- left arm top (outer corner + inner corner) --
    vx_left_outer = np.mean(pts[3:19, 0])
    vx_left_inner = np.mean(pts[99:107, 0])
    hy_left_top = np.mean(np.vstack([pts[107:109], pts[0:1]])[:, 1])
    left_outer_corner = np.array([vx_left_outer, hy_left_top])
    left_inner_corner = np.array([vx_left_inner, hy_left_top])

    # -- right arm top (outer corner + inner corner) --
    vx_right_outer = np.mean(pts[65:76, 0])
    vx_right_inner = np.mean(pts[83:90, 0])
    hy_right_top = np.mean(pts[78:81, 1])
    right_outer_corner = np.array([vx_right_outer, hy_right_top])
    right_inner_corner = np.array([vx_right_inner, hy_right_top])

    # -- stem bottom (two corners) --
    vx_stem_left = np.mean(pts[30:36, 0])
    vx_stem_right = np.mean(pts[48:56, 0])
    hy_stem_bottom = np.mean(pts[38:46, 1])
    stem_left_corner = np.array([vx_stem_left, hy_stem_bottom])
    stem_right_corner = np.array([vx_stem_right, hy_stem_bottom])

    seg_left_inner_top = pts[99:107].copy()
    seg_left_inner_top[:, 0] = vx_left_inner
    seg_left_outer_top = pts[3:19].copy()
    seg_left_outer_top[:, 0] = vx_left_outer
    seg_armpit_left = pts[19:30]  # unchanged curve into the stem

    seg_stem_left = pts[30:36].copy()
    seg_stem_left[:, 0] = vx_stem_left
    seg_flat_bottom = pts[38:46].copy()
    seg_flat_bottom[:, 1] = hy_stem_bottom
    seg_stem_right = pts[48:56].copy()
    seg_stem_right[:, 0] = vx_stem_right

    seg_armpit_right = pts[56:65]  # unchanged curve out of the stem
    seg_right_outer_top = pts[65:76].copy()
    seg_right_outer_top[:, 0] = vx_right_outer
    seg_right_inner_top = pts[82:90].copy()
    seg_right_inner_top[:, 0] = vx_right_inner

    # -- fork (inner arch), matched in technique to the A's counter arch --
    fork_fit = pts[89:99]
    p_fork_start, p_fork_end = pts[89], pts[98]
    fork_arc = arc_between(p_fork_start, p_fork_end, fork_fit, n_interior=10)

    new_pts = np.vstack([
        seg_left_inner_top,
        [left_inner_corner],
        [left_outer_corner],
        seg_left_outer_top,
        seg_armpit_left,
        seg_stem_left,
        [stem_left_corner],
        seg_flat_bottom,
        [stem_right_corner],
        seg_stem_right,
        seg_armpit_right,
        seg_right_outer_top,
        [right_outer_corner],
        [right_inner_corner],
        seg_right_inner_top,
        [pts[89]],
        fork_arc,
        [pts[98]],
    ])
    return [round2(new_pts)]


# ---------------------------------------------------------------- S ----

def refine_S(contours):
    pts = smooth(contours[0], window=1, passes=2, max_dist=25, center_weight=0.5)
    return [round2(pts)]


def main():
    with open(IN) as f:
        data = json.load(f)

    refined = {}
    refined["A"] = {"advance": data["A"]["advance"], "contours": refine_A(data["A"]["contours"])}
    refined["L"] = {"advance": data["L"]["advance"], "contours": refine_L(data["L"]["contours"])}
    refined["Y"] = {"advance": data["Y"]["advance"], "contours": refine_Y(data["Y"]["contours"])}
    refined["S"] = {"advance": data["S"]["advance"], "contours": refine_S(data["S"]["contours"])}

    for letter, g in refined.items():
        print(letter, "contours:", [len(c) for c in g["contours"]])

    with open(OUT, "w") as f:
        json.dump(refined, f, indent=1)
    print("saved", OUT)


if __name__ == "__main__":
    main()
