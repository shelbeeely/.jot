#!/usr/bin/env python3
"""Build the original Jot typefaces, their SVG sources and inspector catalog.

All geometry is procedural. No outlines are imported from an existing font.
The same pinned toolchain produces byte-identical output, including WOFF2.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import math
import pathlib
import unicodedata

import pathops
from fontTools.agl import UV2AGL
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.transform import Transform
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path

from design_sans import ellipse, glyphs as sans_glyphs
from design_script import glyphs as script_glyphs

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'generated'
UPM = 1000
ASCENT, DESCENT = 1050, -320
EPOCH = 2082844800 + 1767225600  # 2026-01-01, seconds since OpenType's 1904 epoch.
VERSION = '1.009'
EXTRA = '\u0152\u0153\u0178\u0131\u20ac\u2010\u2011\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2022\u2026\u2039\u203a\u2212'
MARKS = '\u0300\u0301\u0302\u0303\u0304\u0306\u0307\u0308\u030a\u030b\u030c\u0327\u0328'
CHARSET = ''.join(dict.fromkeys(''.join(chr(c) for c in range(32, 127)) + ''.join(chr(c) for c in range(160, 256)) + EXTRA + MARKS))
LIGATURES = ('ffi', 'ffl', 'ff', 'fi', 'fl')
PROFILES = [('sans', 'sans', 'Jot Sans', 72), ('mono', 'mono', 'Jot Mono', 68), ('script05', '0.5', 'Jot Script 05', 40), ('script07', '0.7', 'Jot Script 07', 52), ('script10', '1.0', 'Jot Script 10', 78)]


def name_of(ch):
    return UV2AGL.get(ord(ch), f'uni{ord(ch):04X}')


def spec(advance, *paths, dots=(), components=(), **extra):
    return {'advance': advance, 'paths': list(paths), 'dots': list(dots), 'components': list(components), **extra}


def transformed(path, matrix):
    result = pathops.Path()
    path.draw(TransformPen(result.getPen(), matrix))
    return result


def transformed_design(design, matrix):
    """Width-fit a centerline design without turning its round nib elliptical."""
    result = copy.deepcopy(design)
    transform = Transform(*matrix)
    paths = []
    for d in design.get('paths', []):
        pen = SVGPathPen(None)
        parse_path(d, TransformPen(pen, matrix))
        paths.append(pen.getCommands())
    result['paths'] = paths
    result['dots'] = [(*transform.transformPoint((x, y)), r) for x, y, r in design.get('dots', [])]
    result['components'] = [(name, tuple(transform.transform(Transform(*inner)))) for name, inner in design.get('components', [])]
    for key in ['entry', 'exit']:
        if design.get(key):
            result[key] = transform.transformPoint(design[key])
    return result


def alternate_design(design, character, amplitude):
    """Bend local pen movements coherently; never merely translate the glyph."""
    result = copy.deepcopy(design)
    phase = (ord(character) % 17) * .37

    def point(x, y):
        def field(a, b):
            return (.7 * math.sin(b / 180 + phase) + .3 * math.sin(a / 135 + phase),
                    .45 * math.sin(a / 150 + phase) * math.sin(b / 240))
        dx, dy = field(x, y)
        ox, oy = field(design['advance'] / 2, 250)
        return (x + amplitude * (dx - ox), y + amplitude * (dy - oy))

    paths = []
    for d in design.get('paths', []):
        recording, pen = RecordingPen(), SVGPathPen(None)
        parse_path(d, recording)
        for operation, points in recording.value:
            getattr(pen, operation)(*[point(*p) if p is not None else None for p in points])
        paths.append(pen.getCommands())
    result['paths'] = paths
    result['dots'] = [(*point(x, y), r) for x, y, r in design.get('dots', [])]
    return result


def union(paths):
    result = pathops.Path()
    for p in paths:
        result = pathops.op(result, p, pathops.PathOp.UNION)
    if len(result):
        result.simplify(clockwise=False)
    return result


def stroke(d, width, gel=False, joins=()):
    # The gel preset has almost even pressure, not a calligraphic thick/thin
    # contrast. Per-stroke variation is fixed by the original vector, never time.
    if gel:
        seed = int.from_bytes(hashlib.sha256(d.encode()).digest()[:2], 'big')
        width *= .985 + (seed / 65535) * .03
    result = pathops.Path()
    parse_path(d, result.getPen())
    result.stroke(width, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    result.convertConicsToQuads(.05)
    result.simplify(clockwise=False)
    if gel:
        movements = RecordingPen()
        parse_path(d, movements)
        # Tiny round terminal pools give an exposed gel stroke a soft ending.
        # Joining anchors are never pooled: adjacent letters keep even joins.
        endings = []
        start = current = None
        for operation, points in movements.value:
            if operation == 'moveTo':
                start = current = points[0]
            elif operation == 'endPath':
                if start is not None:
                    endings.extend([start, current])
                start = current = None
            elif operation == 'closePath':
                start = current = None
            elif points:
                current = points[-1]
        for x, y in endings:
            if not any(abs(x - a) < 1 and abs(y - b) < 1 for a, b in joins):
                result = pathops.op(result, circle(x, y, width * .525), pathops.PathOp.UNION)
    return result


def circle(x, y, r):
    p = pathops.Path()
    parse_path(ellipse(x, y, r, r), p.getPen())
    return p


def script_entry(design, width):
    """Continue the first pen movement's tangent instead of introducing a corner."""
    vx, vy = 50, 25
    if design.get('paths'):
        movement = RecordingPen()
        parse_path(design['paths'][0], movement)
        if len(movement.value) > 1 and movement.value[1][1]:
            x, y = movement.value[1][1][0]
            vx, vy = x, y - 90
    length = math.hypot(vx, vy) or 1
    cx, cy = -18 * vx / length, 90 - 18 * vy / length
    return stroke(f'M-28 60 Q{cx:.3f} {cy:.3f} 0 90', width * .93)


def punctuation():
    """Purpose-drawn punctuation, mathematical signs, currency and Latin symbols."""
    p = {
        ' ': spec(290), '\u00a0': spec(290), '\u00ad': spec(0),
        '.': spec(235, dots=[(118, 28, 45)]), ',': spec(235, 'M135 35 Q150 -55 75 -100', dots=[(130, 35, 40)]),
        ':': spec(245, dots=[(123, 35, 40), (123, 400, 40)]), ';': spec(245, 'M135 35 Q150 -55 75 -100', dots=[(130, 35, 40), (130, 400, 40)]),
        '!': spec(280, 'M140 235 L140 700', dots=[(140, 28, 44)]),
        '?': spec(530, 'M75 560 C70 785 480 775 475 555 C475 410 275 400 275 230', dots=[(275, 28, 44)]),
        "'": spec(220, 'M130 700 L95 520'), '"': spec(355, 'M110 700 L85 520', 'M265 700 L240 520'),
        '`': spec(300, 'M90 735 L205 630'), '^': spec(455, 'M70 480 L228 700 L385 480'),
        '~': spec(570, 'M65 285 C200 455 360 125 505 295'),
        '-': spec(405, 'M75 275 L330 275'), '_': spec(580, 'M55 -115 L525 -115'),
        '+': spec(610, 'M90 300 L520 300', 'M305 85 L305 515'), '=': spec(610, 'M90 195 L520 195', 'M90 405 L520 405'),
        '<': spec(550, 'M465 540 L85 300 L465 60'), '>': spec(550, 'M85 540 L465 300 L85 60'),
        '/': spec(420, 'M45 -100 L375 800'), '\\': spec(420, 'M45 800 L375 -100'), '|': spec(235, 'M118 -100 L118 800'),
        '(': spec(350, 'M265 800 C5 560 5 140 265 -100'), ')': spec(350, 'M85 800 C345 560 345 140 85 -100'),
        '[': spec(345, 'M270 800 L100 800 L100 -100 L270 -100'), ']': spec(345, 'M75 800 L245 800 L245 -100 L75 -100'),
        '{': spec(420, 'M335 800 C150 840 205 620 190 520 Q180 390 75 350 Q180 310 190 180 C205 80 150 -140 335 -100'),
        '}': spec(420, 'M85 800 C270 840 215 620 230 520 Q240 390 345 350 Q240 310 230 180 C215 80 270 -140 85 -100'),
        '*': spec(470, 'M235 725 L235 325', 'M65 625 L405 425', 'M65 425 L405 625'),
        '#': spec(650, 'M245 700 L125 0', 'M525 700 L405 0', 'M85 465 L585 465', 'M50 230 L550 230'),
        '$': spec(615, 'M535 610 C425 765 85 740 85 540 C85 335 535 390 535 170 C535 -40 170 -60 70 95', 'M310 805 L310 -100'),
        '%': spec(820, ellipse(205, 555, 115, 145), ellipse(615, 145, 115, 145), 'M150 0 L670 700'),
        '&': spec(720, 'M620 0 L165 485 C15 660 295 825 375 650 C445 495 35 340 85 130 C135 -95 500 -25 600 310', 'M440 310 L665 310'),
        '@': spec(905, 'M575 170 L625 515 C420 725 240 415 330 220 C420 55 570 190 595 350', 'M625 515 L575 205 C570 90 795 85 795 395 C795 860 70 890 70 350 C70 -100 640 -150 790 15'),
        '\u00a1': spec(280, 'M140 0 L140 465', dots=[(140, 675, 44)]),
        '\u00bf': spec(530, 'M455 140 C460 -85 50 -75 55 145 C55 290 255 300 255 470', dots=[(255, 675, 44)]),
        '\u00a2': spec(540, 'M460 420 C225 645 35 400 90 180 C125 20 315 -80 460 70', 'M310 650 L220 -140'),
        '\u00a3': spec(600, 'M90 0 L520 0', 'M145 0 C305 155 170 335 170 500 C170 740 430 770 520 630', 'M75 290 L430 290'),
        '\u00a4': spec(650, ellipse(325, 350, 190, 190), 'M75 100 L190 215', 'M460 485 L575 600', 'M75 600 L190 485', 'M460 215 L575 100'),
        '\u00a5': spec(620, 'M55 700 L310 340 L565 700', 'M310 340 L310 0', 'M100 300 L520 300', 'M100 145 L520 145'),
        '\u00a6': spec(235, 'M118 800 L118 450', 'M118 250 L118 -100'),
        '\u00a7': spec(600, 'M490 650 C365 795 95 705 135 520 C170 375 495 350 480 195 C465 10 170 -75 85 85', 'M110 420 C-30 160 465 165 485 365 C500 540 180 565 110 420'),
        '\u00a8': spec(450, dots=[(140, 670, 36), (310, 670, 36)]),
        '\u00a9': spec(830, ellipse(415, 350, 350, 375), 'M560 520 C285 760 175 110 555 170'),
        '\u00aa': spec(395, 'M95 670 C140 765 320 725 320 615 L320 420', 'M320 590 C160 690 45 540 115 460 C180 385 290 430 320 510', 'M65 325 L340 325'),
        '\u00ab': spec(580, 'M265 485 L85 275 L265 65', 'M495 485 L315 275 L495 65'),
        '\u00ac': spec(620, 'M80 385 L535 385 L535 160'),
        '\u00ae': spec(830, ellipse(415, 350, 350, 375), 'M280 150 L280 550 L420 550 C610 550 610 350 420 350 L280 350', 'M420 350 L555 150'),
        '\u00af': spec(500, 'M65 700 L435 700'), '\u00b0': spec(360, ellipse(180, 610, 100, 110)),
        '\u00b1': spec(610, 'M90 325 L520 325', 'M305 110 L305 540', 'M90 0 L520 0'),
        '\u00b4': spec(300, 'M95 630 L215 735'), '\u00b5': spec(560, 'M85 -220 L85 500', 'M85 500 L85 180 C85 -75 395 -65 475 155 L475 500 L475 0'),
        '\u00b6': spec(620, 'M345 -100 L345 700 L250 700 C-5 700 -5 330 250 330 L345 330', 'M520 700 L520 -100'),
        '\u00b7': spec(235, dots=[(118, 300, 40)]), '\u00b8': spec(350, 'M210 0 L140 -85 C330 -45 315 -250 100 -200'),
        '\u00ba': spec(395, ellipse(198, 595, 120, 145), 'M65 325 L330 325'),
        '\u00bb': spec(580, 'M85 485 L265 275 L85 65', 'M315 485 L495 275 L315 65'),
        '\u00d7': spec(610, 'M100 95 L510 505', 'M100 505 L510 95'), '\u00f7': spec(610, 'M90 300 L520 300', dots=[(305, 75, 38), (305, 525, 38)]),
        '\u20ac': spec(675, 'M585 610 C515 700 415 725 300 680 C15 570 15 125 300 15 C415 -30 515 -5 585 85', 'M45 440 L465 440', 'M45 270 L430 270'),
        '\u2010': spec(405, 'M75 275 L330 275'), '\u2011': spec(405, 'M75 275 L330 275'),
        '\u2013': spec(650, 'M55 275 L595 275'), '\u2014': spec(980, 'M55 275 L925 275'),
        '\u2018': spec(240, 'M155 740 C60 685 70 600 130 570'), '\u2019': spec(240, 'M85 570 C180 625 170 710 110 740'),
        '\u201a': spec(240, 'M85 -100 C180 -45 170 40 110 70'),
        '\u201c': spec(420, 'M155 740 C60 685 70 600 130 570', 'M335 740 C240 685 250 600 310 570'),
        '\u201d': spec(420, 'M85 570 C180 625 170 710 110 740', 'M265 570 C360 625 350 710 290 740'),
        '\u201e': spec(420, 'M85 -100 C180 -45 170 40 110 70', 'M265 -100 C360 -45 350 40 290 70'),
        '\u2022': spec(420, dots=[(210, 300, 75)]), '\u2026': spec(700, dots=[(115, 28, 42), (350, 28, 42), (585, 28, 42)]),
        '\u2039': spec(350, 'M265 485 L85 275 L265 65'), '\u203a': spec(350, 'M85 485 L265 275 L85 65'),
        '\u2212': spec(610, 'M90 300 L520 300'),
    }
    return p


def accent_spec(ch):
    paths = {
        '\u0300': ['M-70 690 L55 590'], '\u0301': ['M-55 590 L70 690'],
        '\u0302': ['M-110 600 L0 700 L110 600'], '\u0303': ['M-130 620 C-40 745 45 540 135 660'],
        '\u0304': ['M-115 650 L115 650'], '\u0306': ['M-115 690 C-85 560 85 560 115 690'],
        '\u0307': [], '\u0308': [], '\u030a': [ellipse(0, 650, 65, 65)],
        '\u030b': ['M-100 590 L0 700', 'M30 590 L130 700'], '\u030c': ['M-110 700 L0 600 L110 700'],
        '\u0327': ['M25 -55 L-35 -120 C120 -75 130 -235 -65 -200'], '\u0328': ['M60 -20 C-125 -155 -50 -250 65 -190'],
    }
    dots = [(0, 650, 32)] if ch == '\u0307' else [(-80, 650, 32), (80, 650, 32)] if ch == '\u0308' else []
    return spec(0, *paths[ch], dots=dots, mark='bottom' if ch in '\u0327\u0328' else 'top', strokeScale=.72)


def repertoire(script):
    originals = script_glyphs() if script else sans_glyphs()
    glyphs = {ch: copy.deepcopy(v) for ch, v in originals.items()}
    glyphs.update(punctuation())
    for ch in MARKS:
        glyphs[ch] = accent_spec(ch)
    # Superscript figures and fractions are composed from our own figure designs.
    for char, digit in [('¹', '1'), ('²', '2'), ('³', '3')]:
        glyphs[char] = spec(335, components=[(digit, (.55, 0, 0, .55, 0, 315))])
    for char, numerator, denominator in [('¼', '1', '4'), ('½', '1', '2'), ('¾', '3', '4')]:
        glyphs[char] = spec(820, 'M205 0 L645 700', components=[(numerator, (.48, 0, 0, .48, 5, 370)), (denominator, (.48, 0, 0, .48, 510, 0))])
    glyphs['ı'] = copy.deepcopy(glyphs['i']); glyphs['ı']['dots'] = []
    # Distinct Latin letters: not substituted with ASCII lookalikes.
    glyphs['Æ'] = spec(900, 'M45 0 L355 700 L355 0', 'M150 240 L355 240', 'M355 700 L820 700', 'M355 350 L760 350', 'M355 0 L820 0')
    glyphs['æ'] = spec(850, 'M85 410 C150 555 445 535 425 315 L425 0', 'M425 275 C300 350 60 315 70 145 C75 -25 360 -55 425 130', 'M425 260 L780 260 C805 600 410 575 420 260 C425 -30 665 -65 770 60')
    glyphs['Ð'] = spec(700, 'M100 0 L100 700 L300 700 C695 700 695 0 300 0 Z', 'M30 350 L340 350')
    glyphs['ð'] = spec(570, ellipse(285, 235, 210, 235), 'M175 750 C355 700 525 565 495 245', 'M190 550 L440 720')
    glyphs['Ø'] = spec(710, 'M90 -40 L620 740', components=[('O', (1, 0, 0, 1, 0, 0))])
    glyphs['ø'] = spec(570, 'M75 -45 L495 545', components=[('o', (1, 0, 0, 1, 0, 0))])
    glyphs['Þ'] = spec(610, 'M90 0 L90 700', 'M90 550 L300 550 C630 550 630 195 300 195 L90 195')
    glyphs['þ'] = spec(570, 'M85 -240 L85 730', 'M85 360 C195 600 500 535 500 250 C500 -35 195 -100 85 140')
    glyphs['ß'] = spec(590, 'M85 0 L85 515 C85 775 485 780 440 560 C425 480 325 445 280 425 C595 380 600 0 330 0 L265 0')
    glyphs['Œ'] = spec(1020, 'M510 700 L930 700', 'M510 350 L865 350', 'M510 0 L930 0', components=[('O', (.75, 0, 0, 1, 0, 0))])
    glyphs['œ'] = spec(875, 'M465 260 L805 260 C830 600 435 575 445 260 C450 -30 690 -65 795 60', components=[('o', (.78, 0, 0, 1, 0, 0))])
    if script:
        # Western European joins retain the pen family instead of falling back
        # to upright geometric letter shapes inside an otherwise cursive word.
        def joining(advance, *paths, components=()):
            return spec(advance, *paths, components=components, entry=(0, 90), exit=(advance, 90))
        glyphs['æ'] = joining(850, components=[('a', (.8, 0, 0, 1, 0, 0)), ('e', (1, 0, 0, 1, 400, 0))])
        glyphs['œ'] = joining(842, components=[('o', (.8, 0, 0, 1, 0, 0)), ('e', (1, 0, 0, 1, 392, 0))])
        glyphs['ø'] = joining(glyphs['o']['advance'], 'M90 -20 L410 550', components=[('o', (1, 0, 0, 1, 0, 0))])
        glyphs['ð'] = joining(glyphs['d']['advance'], 'M320 605 L510 710', components=[('d', (1, 0, 0, 1, 0, 0))])
        glyphs['þ'] = joining(glyphs['p']['advance'], 'M165 468 C180 555 200 675 220 730', components=[('p', (1, 0, 0, 1, 0, 0))])
        glyphs['ß'] = joining(600, 'M0 90 C100 165 150 450 200 650 C235 810 490 785 445 600 C422 507 335 454 280 420 C530 425 540 170 398 83 C335 44 285 73 288 125 C315 170 424 18 600 90')
        glyphs['µ'] = joining(glyphs['u']['advance'], 'M135 90 L85 -210', components=[('u', (1, 0, 0, 1, 0, 0))])
        glyphs['Æ'] = spec(900, components=[('A', (.76, 0, 0, 1, 0, 0)), ('E', (.72, 0, 0, 1, 430, 0))])
        glyphs['Œ'] = spec(940, components=[('O', (.76, 0, 0, 1, 0, 0)), ('E', (.72, 0, 0, 1, 470, 0))])
        glyphs['Ð'] = spec(glyphs['D']['advance'], 'M80 350 C210 375 300 385 390 365', components=[('D', (1, 0, 0, 1, 0, 0))])
        glyphs['Ø'] = spec(glyphs['O']['advance'], 'M110 -30 L600 740', components=[('O', (1, 0, 0, 1, 0, 0))])
    # Canonical accents reuse the base design plus an original accent vector.
    for ch in CHARSET:
        if ch in glyphs:
            continue
        decomposition = unicodedata.normalize('NFD', ch)
        if len(decomposition) >= 2 and decomposition[0] in glyphs and all(m in MARKS for m in decomposition[1:]):
            base, *marks = decomposition
            if base == 'i':
                base = 'ı'
            original = glyphs[base]
            height = 200 if decomposition[0].isupper() else 0
            components = [(base, (1, 0, 0, 1, 0, 0))] + [(m, (1, 0, 0, 1, original['advance'] / 2, height)) for m in marks]
            glyphs[ch] = spec(original['advance'], components=components, entry=original.get('entry'), exit=original.get('exit'), accentedBase=base)
        else:
            raise ValueError(f'No original glyph for U+{ord(ch):04X} {ch}')
    return glyphs


def outline(specification, width, resolve, gel=False):
    parts = []
    paths = specification.get('paths', [])
    stroke_width = width * specification.get('strokeScale', 1)
    # Pool only exposed ends. End caps inside another movement are junctions,
    # not places where the pen lifts; swelling them creates visible join bumps.
    coverage = [stroke(d, stroke_width) for d in paths] if gel and len(paths) > 1 else []
    for index, d in enumerate(paths):
        joins = [p for p in [specification.get('entry'), specification.get('exit')] if p]
        if coverage:
            movements = RecordingPen()
            parse_path(d, movements)
            start = current = None
            for operation, points in movements.value:
                if operation == 'moveTo':
                    start = current = points[0]
                elif operation == 'endPath':
                    for point in [start, current]:
                        if point and any(other.contains(point) for n, other in enumerate(coverage) if n != index):
                            joins.append(point)
                    start = current = None
                elif operation == 'closePath':
                    start = current = None
                elif points:
                    current = points[-1]
        parts.append(stroke(d, width * specification.get('strokeScale', 1), gel=gel and not specification.get('mark'), joins=joins))
    for x, y, r in specification.get('dots', []):
        parts.append(circle(x, y, r * width / 52))
    for name, matrix in specification.get('components', []):
        parts.append(resolve(name, matrix))
    return union(parts)


def font_features(glyph_info, script, mono=False):
    names = {g['name'] for g in glyph_info}
    lines = ['languagesystem DFLT dflt;', 'languagesystem latn dflt;']
    marks = [g for g in glyph_info if g.get('mark')]
    bases = [g for g in glyph_info if not g.get('mark')]
    lines += ['@BASE = [' + ' '.join(g['name'] for g in bases) + '];', '@MARK = [' + ' '.join(g['name'] for g in marks) + '];', 'table GDEF { GlyphClassDef @BASE, , @MARK, ; } GDEF;']
    lines.append('feature liga {')
    for lig in LIGATURES:
        lines.append(f"sub {' '.join(name_of(c) for c in lig)} by {'_'.join(lig)};")
    lines.append('} liga;')
    if script:
        joining = [g for g in glyph_info if g.get('joining') and g.get('form') == 'base']
        base = [g['name'] for g in joining]
        all_join = [g['name'] for g in glyph_info if g.get('joining')]
        lines += ['@JOIN = [' + ' '.join(all_join) + '];', '@ISO = [' + ' '.join(base) + '];']
        for label, suffix in [('INI', 'init'), ('MED', 'medi'), ('FIN', 'fina')]:
            lines.append(f'@{label} = [' + ' '.join(f'{n}.{suffix}' for n in base) + '];')
        lines += ['feature calt {', 'lookupflag IgnoreMarks;', "sub @JOIN @ISO' @JOIN by @MED;", "sub @JOIN @ISO' by @FIN;", "sub @ISO' @JOIN by @INI;", '} calt;', 'feature curs {', 'lookupflag IgnoreMarks;']
        for g in glyph_info:
            if not g.get('joining'):
                continue
            entry = '<anchor ' + ' '.join(str(int(v)) for v in g['entry']) + '>' if g.get('entry') else '<anchor NULL>'
            exit_ = '<anchor ' + ' '.join(str(int(v)) for v in g['exit']) + '>' if g.get('exit') else '<anchor NULL>'
            lines.append(f"pos cursive {g['name']} {entry} {exit_};")
        lines.append('} curs;')
    else:
        alternates = [g for g in glyph_info if g.get('alternateOf')]
        lines += ['feature ss01 {']
        lines += [f"sub {g['alternateOf']} by {g['name']};" for g in alternates]
        lines += ['} ss01;', 'feature calt {', 'lookupflag IgnoreMarks;', "sub f' [parenright bracketright braceright quoteright quotedblright] by f.short;"]
        lines += [f"sub {g['alternateOf']} {g['alternateOf']}' by {g['name']};" for g in alternates]
        lines += ['} calt;']
    top_marks = [g for g in marks if g['mark'] == 'top']
    bottom_marks = [g for g in marks if g['mark'] == 'bottom']
    for g in top_marks:
        lines.append(f"markClass {g['name']} <anchor 0 600> @TOP;")
    for g in bottom_marks:
        lines.append(f"markClass {g['name']} <anchor 0 -60> @BOTTOM;")
    lines.append('feature mark {')
    for g in bases:
        if g['name'] == '.notdef' or not g['path']:
            continue
        anchor_x = int(g['advanceWidth'] / 2)
        anchor_y = 800 if g.get('uppercase') else 600
        lines.append(f"pos base {g['name']} <anchor {anchor_x} {anchor_y}> mark @TOP <anchor {anchor_x} -60> mark @BOTTOM;")
    lines.append('} mark;')
    pairs = [('A', 'V', -65), ('A', 'W', -45), ('A', 'Y', -55), ('V', 'A', -65), ('W', 'A', -45), ('Y', 'A', -55), ('T', 'a', -40), ('T', 'o', -45), ('T', 'e', -40), ('F', 'o', -35), ('L', 'T', -25), ('P', 'a', -25)]
    lines.append('feature kern {')
    for left, right, value in ([] if mono else pairs):
        if name_of(left) in names and name_of(right) in names:
            lines.append(f'pos {name_of(left)} {name_of(right)} {int(value * (.65 if script else 1))};')
    lines.append('} kern;')
    return '\n'.join(lines) + '\n'


def make_font(id_, profile, family, pen_width, weight):
    script = profile in ('0.5', '0.7', '1.0')
    mono = profile == 'mono'
    width = pen_width * (1.4 if weight == 700 else 1)
    specs = repertoire(script)
    cache = {}

    def resolve(ch, matrix=None):
        if matrix is not None:
            # Fractions deliberately scale uniformly. Width-fit ligatures keep
            # the same pen width by transforming their movements, not ink.
            if abs(abs(matrix[0]) - abs(matrix[3])) > .001:
                return outline(transformed_design(specs[ch], matrix), width, resolve, gel=True)
            return transformed(resolve(ch), matrix)
        if ch not in cache:
            cache[ch] = outline(specs[ch], width, resolve, gel=True)
        return cache[ch]

    mono_paths = {}

    def fit_mono(path):
        if not len(path):
            return path
        left, _, right, _ = path.bounds
        scale = min(1, (550 - width) / max(1, right - left - width))
        return scale, 325 - (left + right) * scale / 2

    records = []
    outlines = {}
    cmap = {}

    def add(name, path, advance, unicode=None, **meta):
        # Font and inspector share the same quantized TrueType geometry.
        p = TTGlyphPen(None)
        path.draw(Cu2QuPen(p, max_err=.15, reverse_direction=True))
        glyph = p.glyph()
        glyph.recalcBounds(None)
        svg = SVGPathPen(None)
        glyph.draw(svg, {})
        d = svg.getCommands()
        bounds = [glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax] if glyph.numberOfContours else [0, 0, 0, 0]
        advance = int(round(advance))
        lsb = bounds[0] if d else 0
        records.append({'name': name, 'unicode': unicode, 'path': d, 'bounds': bounds, 'advanceWidth': advance, 'lsb': lsb, 'rsb': advance - bounds[2] if d else advance, **meta})
        outlines[name] = glyph
        if unicode is not None:
            cmap[unicode] = name

    add('.notdef', stroke('M85 0 L85 700 L515 700 L515 0 Z M85 0 L515 700', width * .65), 650 if mono else 600)
    for ch in CHARSET:
        s = specs[ch]
        p = resolve(ch)
        advance = s['advance']
        if mono and not s.get('mark'):
            if len(p):
                scale, shift = fit_mono(p)
                p = resolve(ch, (scale, 0, 0, 1, shift, 0))
            advance = 0 if ch == '\u00ad' else 650
            mono_paths[ch] = p
        joining = script and ch.islower() and s.get('entry') is not None
        path = p
        # Isolated forms have a modest entry lift and terminal, never brush tapers.
        if joining:
            a = s['advance']
            path = union([p, script_entry(s, width), stroke(f'M{a} 90 Q{a + 24} 103 {a + 35} 145', width * .9)])
        add(name_of(ch), path, advance, ord(ch), mark=s.get('mark'), uppercase=ch.isupper(), joining=joining, form='base', **({'entry': None, 'exit': None} if joining else {}))
    if script:
        # All matching accented forms reuse their corresponding base plus accent.
        joining_chars = [ch for ch in CHARSET if ch.islower() and specs[ch].get('entry') is not None]
        for ch in joining_chars:
            s = specs[ch]; a = s['advance']; p = resolve(ch)
            for suffix in ['init', 'medi', 'fina']:
                parts = [p]
                if suffix == 'init':
                    parts.append(script_entry(s, width))
                if suffix == 'fina':
                    parts.append(stroke(f'M{a} 90 Q{a + 24} 103 {a + 35} 145', width * .9))
                add(name_of(ch) + '.' + suffix, union(parts), a, joining=True, form=suffix, entry=[0, 90] if suffix != 'init' else None, exit=[a, 90] if suffix != 'fina' else None)
    else:
        short_f = spec(specs['f']['advance'], 'M135 0 L135 550 C135 710 240 745 280 700', 'M55 480 L285 480')
        short_path = outline(short_f, width, resolve, gel=True)
        if mono:
            scale, shift = fit_mono(short_path)
            short_path = outline(transformed_design(short_f, (scale, 0, 0, 1, shift, 0)), width, resolve, gel=True)
        add('f.short', short_path, 650 if mono else specs['f']['advance'])
        # A real second drawing for letters/digits, selected by ss01 or when a
        # character repeats. No text-node splitting or random rendering jitter.
        for ch in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789':
            source = specs[ch]
            base = mono_paths[ch] if mono else resolve(ch)
            for amplitude in [0, 1, 2, 3, 4, 6, 9, 12, 16, 20, 26, 34, 42, 52, 65, 80]:
                variant = alternate_design(source, ch, amplitude)
                p = outline(variant, width, resolve, gel=True)
                if mono:
                    scale, shift = fit_mono(p)
                    p = outline(transformed_design(variant, (scale, 0, 0, 1, shift, 0)), width, resolve, gel=True)
                combined = abs(pathops.op(base, p, pathops.PathOp.UNION).area)
                intersection = abs(pathops.op(base, p, pathops.PathOp.INTERSECTION).area)
                difference = (combined - intersection) / combined
                if .095 <= difference <= .23:
                    break
            else:
                raise ValueError(f'Alternate variation outside limits: {family} {weight} {ch}: {difference:.3f}')
            add(name_of(ch) + '.alt', p, 650 if mono else source['advance'], alternateOf=name_of(ch), variation=difference, uppercase=ch.isupper())
    # Genuine combined outlines, with compact common f joins rather than text encoding tricks.
    for lig in LIGATURES:
        paths, x = [], 0
        for i, ch in enumerate(lig):
            paths.append(transformed(mono_paths[ch] if mono else resolve(ch), (1, 0, 0, 1, x, 0)))
            x += 650 if mono else specs[ch]['advance'] - (0 if script else 42 if i < len(lig) - 1 else 0)
        p = union(paths)
        base_name = '_'.join(lig)
        add(base_name, p, x, joining=script, form='base', entry=None, exit=None)
        if script:
            for suffix in ['init', 'medi', 'fina']:
                parts = [p]
                if suffix == 'init':
                    parts.append(stroke('M-28 60 Q-10 82 0 90', width * .93))
                if suffix == 'fina':
                    parts.append(stroke(f'M{x} 90 Q{x + 24} 103 {x + 35} 145', width * .9))
                add(base_name + '.' + suffix, union(parts), x, joining=True, form=suffix, entry=[0, 90] if suffix != 'init' else None, exit=[x, 90] if suffix != 'fina' else None)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(list(outlines))
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(outlines)
    fb.setupHorizontalMetrics({g['name']: (g['advanceWidth'], g['lsb']) for g in records})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT, lineGap=0)
    style = 'Bold' if weight == 700 else 'Regular'
    fb.setupNameTable({'familyName': family, 'styleName': style, 'uniqueFontIdentifier': f'{family} {style} {VERSION}', 'fullName': f'{family} {style}', 'psName': family.replace(' ', '') + '-' + style, 'version': 'Version ' + VERSION, 'copyright': 'Copyright 2026 The Jot Font Authors. Original procedural outlines.', 'licenseDescription': 'SIL Open Font License, Version 1.1.', 'licenseInfoURL': 'https://openfontlicense.org'})
    fb.setupOS2(version=4, sTypoAscender=ASCENT, sTypoDescender=DESCENT, sTypoLineGap=0, usWinAscent=ASCENT, usWinDescent=-DESCENT, sxHeight=500, sCapHeight=700, usWeightClass=weight, fsType=0, fsSelection=0x80 | (0x20 if weight == 700 else 0x40))
    fb.setupPost(isFixedPitch=1 if mono else 0)
    fb.setupMaxp()
    fb.setupHead(created=EPOCH, modified=EPOCH, macStyle=1 if weight == 700 else 0)
    features = font_features(records, script, mono)
    addOpenTypeFeaturesFromString(fb.font, features)
    fb.font.recalcTimestamp = False
    fb.font.flavor = 'woff2'
    binary = io.BytesIO(); fb.font.save(binary)
    filename = f'jot-{profile}-{weight}.woff2' if not script else f'jot-script-{profile.replace(".", "")}-{weight}.woff2'
    catalog = {'id': id_, 'family': family, 'profile': profile, 'weight': weight, 'file': filename, 'unitsPerEm': UPM, 'ascent': ASCENT, 'descent': DESCENT, 'capHeight': 700, 'xHeight': 500, 'glyphs': records}
    return binary.getvalue(), catalog, features


def generated_files():
    files = {'jot-original-OFL.txt': (ROOT / 'OFL.txt').read_bytes()}
    catalog = {'schemaVersion': 1, 'generatorVersion': VERSION, 'fonts': []}
    for id_, profile, family, width in PROFILES:
        for weight in [400, 700]:
            binary, record, features = make_font(id_, profile, family, width, weight)
            files[record['file']] = binary
            catalog['fonts'].append(record)
            files[f'features/{id_}-{weight}.fea'] = features.encode()
            for glyph in record['glyphs']:
                # Y-up font data remains untouched; only the SVG presentation is flipped.
                d = glyph['path']
                a = max(glyph['advanceWidth'], glyph['bounds'][2] + 70, 300)
                x = min(-100, glyph['bounds'][0] - 50)
                svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} -{ASCENT} {a - x + 50} {ASCENT - DESCENT}"><title>{record["family"]} {weight}: {glyph["name"]}</title><path transform="scale(1,-1)" d="{d}"/></svg>\n'
                files[f'svg/{id_}-{weight}/{glyph["name"]}.svg'] = svg.encode()
    files['catalog.json'] = (json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    checksums = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}
    files['SHA256SUMS.json'] = (json.dumps(checksums, indent=2) + '\n').encode()
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Compare generated bytes without writing any files.')
    parser.add_argument('--output', type=pathlib.Path, default=OUT)
    args = parser.parse_args()
    files = generated_files()
    if args.check:
        existing = {str(p.relative_to(args.output)): p for p in args.output.rglob('*') if p.is_file()} if args.output.exists() else {}
        changed = sorted(set(files) ^ set(existing))
        changed += [name for name in files.keys() & existing.keys() if existing[name].read_bytes() != files[name]]
        if changed:
            raise SystemExit('Generated fonts are stale: ' + ', '.join(changed[:12]) + '. Run python3 fonts/build.py')
        print(f'Original Jot fonts: {len(files)} generated files are current.')
        return
    args.output.mkdir(parents=True, exist_ok=True)
    for stale in args.output.rglob('*'):
        if stale.is_file() and str(stale.relative_to(args.output)) not in files:
            stale.unlink()
    for name, data in files.items():
        target = args.output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print(f'Built 10 original WOFF2 faces, SVG glyphs and catalog ({len(files)} files).')


if __name__ == '__main__':
    main()
