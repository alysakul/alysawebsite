#!/usr/bin/env python3
"""Compiles scripts/refined_glyphs.json (traced from the hand-drawn A/L/Y/S
by trace_glyphs.py, denoised by clean_glyphs.py, then given targeted
geometric touch-ups -- true right angles, smooth arcs -- by
refine_glyphs.py on specific features Alysa called out by name) into
fonts/AlysaLogo.ttf via fontTools."""
import json
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000
ASCENT = 800
DESCENT = -200

IN = "/Users/alysa/alysawebsite/scripts/refined_glyphs.json"
OUT = "/Users/alysa/alysawebsite/fonts/AlysaLogo.ttf"


def draw_contours(pen, contours):
    for points in contours:
        pen.moveTo(tuple(points[0]))
        for p in points[1:]:
            pen.lineTo(tuple(p))
        pen.closePath()


def main():
    with open(IN) as f:
        traced = json.load(f)

    letters = sorted(traced.keys())
    glyph_order = [".notdef", "space"] + letters
    cmap = {ord(" "): "space"}
    cmap.update({ord(ch): ch for ch in letters})

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)

    glyphs = {}
    advance_widths = {}

    notdef_pen = TTGlyphPen(None)
    draw_contours(notdef_pen, [[(50, 0), (450, 0), (450, 700), (50, 700)]])
    glyphs[".notdef"] = notdef_pen.glyph()
    advance_widths[".notdef"] = (500, 0)

    glyphs["space"] = TTGlyphPen(None).glyph()
    advance_widths["space"] = (260, 0)

    for ch in letters:
        pen = TTGlyphPen(None)
        draw_contours(pen, traced[ch]["contours"])
        glyphs[ch] = pen.glyph()
        advance_widths[ch] = (round(traced[ch]["advance"]), 0)

    fb.setupGlyf(glyphs)
    metrics = {name: advance_widths[name] for name in glyph_order}
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
    fb.setupNameTable({
        "familyName": "Alysa Logo",
        "styleName": "Regular",
        "uniqueFontIdentifier": "AlysaLogo-Regular",
        "fullName": "Alysa Logo Regular",
        "psName": "AlysaLogo-Regular",
    })
    fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=DESCENT, usWinAscent=ASCENT, usWinDescent=-DESCENT)
    fb.setupPost()

    fb.save(OUT)
    print("saved", OUT)


if __name__ == "__main__":
    main()
