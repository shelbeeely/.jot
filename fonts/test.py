#!/usr/bin/env python3
"""Structural, shaping, joining, outline and reproducibility checks for Jot fonts."""
import hashlib
import io
import json
import pathlib
import unittest

import uharfbuzz as hb
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont

import build


class OriginalFontTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((build.OUT / 'catalog.json').read_text())
        cls.faces = []
        for record in cls.catalog['fonts']:
            path = build.OUT / record['file']
            font = TTFont(path)
            font.flavor = None
            binary = io.BytesIO(); font.save(binary)
            shaping = hb.Font(hb.Face(binary.getvalue()))
            shaping.scale = (1000, 1000)
            cls.faces.append((record, font, shaping))

    def shape(self, face, text, **features):
        record, font, shaping = face
        buffer = hb.Buffer(); buffer.add_str(text); buffer.guess_segment_properties()
        hb.shape(shaping, buffer, features)
        order = font.getGlyphOrder()
        return [(order[g.codepoint], p) for g, p in zip(buffer.glyph_infos, buffer.glyph_positions)]

    def test_ten_real_faces_and_coverage(self):
        self.assertEqual(len(self.faces), 10)
        expected = {ord(ch) for ch in build.CHARSET}
        for record, font, _ in self.faces:
            with self.subTest(face=record['file']):
                self.assertEqual(set(font.getBestCmap()), expected)
                self.assertEqual(font['head'].unitsPerEm, 1000)
                self.assertEqual(font['OS/2'].usWeightClass, record['weight'])
                self.assertEqual(font['OS/2'].version, 4)
                self.assertEqual(bool(font['OS/2'].fsSelection & 0x20), record['weight'] == 700)
                self.assertEqual(bool(font['head'].macStyle & 1), record['weight'] == 700)
                self.assertEqual(font['OS/2'].sCapHeight, 700)
                self.assertEqual(font['OS/2'].sxHeight, 500)
                self.assertEqual(font['name'].getDebugName(1), record['family'])
                for text in ['François, Straße, Æsir & cœur — £25 / €30.', 'Ísland: Þór, øl, mañana…']:
                    self.assertNotIn('.notdef', [name for name, _ in self.shape((record, font, _), text)])

    def test_closed_original_outlines_and_consistent_metrics(self):
        for record, font, _ in self.faces:
            for glyph in record['glyphs']:
                with self.subTest(face=record['file'], glyph=glyph['name']):
                    self.assertEqual(tuple(font['hmtx'][glyph['name']]), (glyph['advanceWidth'], glyph['lsb']))
                    if not glyph['path']:
                        self.assertIn(glyph['unicode'], [0x20, 0xA0, 0xAD])
                        continue
                    recording = RecordingPen(); parse_path(glyph['path'], recording)
                    self.assertNotIn('endPath', [op for op, _ in recording.value], 'Every visible outline must be closed.')
                    self.assertGreaterEqual(glyph['bounds'][1], record['descent'])
                    self.assertLessEqual(glyph['bounds'][3], record['ascent'])
                    self.assertEqual(glyph['rsb'], glyph['advanceWidth'] - glyph['bounds'][2])
                    if glyph.get('mark'):
                        self.assertEqual(glyph['advanceWidth'], 0)

    def test_real_opentype_tables_and_ligatures(self):
        for face in self.faces:
            record, font, _ = face
            features = {r.FeatureTag for r in font['GSUB'].table.FeatureList.FeatureRecord}
            self.assertTrue({'liga', 'calt'} <= features)
            positions = {r.FeatureTag for r in font['GPOS'].table.FeatureList.FeatureRecord}
            self.assertTrue(({'mark'} if record['id'] == 'mono' else {'kern', 'mark'}) <= positions)
            if record['profile'] in ('0.5', '0.7', '1.0'):
                self.assertIn('curs', positions)
            for source, expected in [('office', 'f_f_i'), ('afflict', 'f_f_l'), ('fluff', 'f_l')]:
                on = self.shape(face, source, liga=True, calt=True)
                off = self.shape(face, source, liga=False, calt=True)
                self.assertTrue(any(name.split('.')[0] == expected for name, _ in on))
                self.assertFalse(any('_' in name for name, _ in off))
                self.assertLess(len(on), len(off))

    def test_contextual_vectors_and_optical_kerning(self):
        for face in self.faces:
            record, font, _ = face
            glyphs = {g['name']: g for g in record['glyphs']}
            if record['profile'] in ('sans', 'mono'):
                self.assertEqual(self.shape(face, 'f)', calt=True)[0][0], 'f.short')
                self.assertEqual(self.shape(face, 'f)', calt=False)[0][0], 'f')
                self.assertNotEqual(glyphs['f']['path'], glyphs['f.short']['path'])
            else:
                on = [name for name, _ in self.shape(face, 'minimum', calt=True)]
                off = [name for name, _ in self.shape(face, 'minimum', calt=False)]
                self.assertTrue(on[0].endswith('.init'))
                self.assertTrue(on[-1].endswith('.fina'))
                self.assertTrue(all(name.endswith('.medi') for name in on[1:-1]))
                self.assertTrue(all('.' not in name for name in off))
                self.assertEqual(len({glyphs[name]['path'] for name in ['a', 'a.init', 'a.medi', 'a.fina']}), 4)
            on = sum(p.x_advance for _, p in self.shape(face, 'AV', kern=True))
            off = sum(p.x_advance for _, p in self.shape(face, 'AV', kern=False))
            if record['id'] == 'mono':
                self.assertEqual(on, off)
            else:
                self.assertLess(on, off)

    def test_all_lowercase_join_pairs(self):
        for face in self.faces:
            record, _, _ = face
            if record['profile'] in ('sans', 'mono'):
                continue
            glyphs = {g['name']: g for g in record['glyphs']}
            letters = [chr(g['unicode']) for g in record['glyphs'] if g['unicode'] and g.get('joining') and g.get('form') == 'base']
            for left in letters:
                for right in letters:
                    shaped = self.shape(face, left + right, liga=False, calt=True, curs=True)
                    self.assertEqual(len(shaped), 2)
                    (ln, lp), (rn, rp) = shaped
                    self.assertTrue(ln.endswith('.init'), (left, right, ln))
                    self.assertTrue(rn.endswith('.fina'), (left, right, rn))
                    exit_ = glyphs[ln]['exit']; entry = glyphs[rn]['entry']
                    self.assertLessEqual(abs(lp.x_offset + exit_[0] - (lp.x_advance + rp.x_offset + entry[0])), 1)
                    self.assertLessEqual(abs(lp.y_offset + exit_[1] - (lp.y_advance + rp.y_offset + entry[1])), 1)

    def test_accents_do_not_change_document_text(self):
        for face in self.faces:
            nfc = self.shape(face, 'école Ångström naïve', liga=True, calt=True)
            nfd = self.shape(face, 'e\u0301cole A\u030Angstro\u0308m nai\u0308ve', liga=True, calt=True)
            self.assertEqual([(name, p.x_advance, p.x_offset, p.y_offset) for name, p in nfc], [(name, p.x_advance, p.x_offset, p.y_offset) for name, p in nfd])
            plain = sum(p.x_advance for _, p in self.shape(face, 'qa'))
            marked = self.shape(face, 'q\u0301a', calt=True)
            self.assertEqual(sum(p.x_advance for _, p in marked), plain)
            self.assertTrue(any(name == build.name_of('\u0301') and p.x_advance == 0 for name, p in marked))

    def test_weights_and_profiles_are_separate_outlines(self):
        by_id = {(r['id'], r['weight']): r for r, _, _ in self.faces}
        for id_, _, _, _ in build.PROFILES:
            regular = {g['name']: g for g in by_id[id_, 400]['glyphs']}
            bold = {g['name']: g for g in by_id[id_, 700]['glyphs']}
            self.assertNotEqual(regular['H']['path'], bold['H']['path'])
            self.assertEqual(regular['H']['advanceWidth'], bold['H']['advanceWidth'])
        paths = [{g['name']: g['path'] for g in by_id[id_, 400]['glyphs']}['a'] for id_ in ['script05', 'script07', 'script10']]
        self.assertEqual(len(set(paths)), 3)

    def test_sans_uses_the_same_round_gel_pen(self):
        for record, _, _ in self.faces:
            if record['profile'] != 'sans':
                continue
            width = 72 * (1.4 if record['weight'] == 700 else 1)
            design = build.repertoire(False)['H']
            gel = build.outline(design, width, lambda _: None, gel=True)
            plain = build.outline(design, width, lambda _: None, gel=False)
            def vector(path):
                pen = build.TTGlyphPen(None)
                path.draw(build.Cu2QuPen(pen, max_err=.15, reverse_direction=True))
                glyph = pen.glyph()
                result = build.SVGPathPen(None); glyph.draw(result, {})
                return result.getCommands()
            actual = next(g['path'] for g in record['glyphs'] if g['name'] == 'H')
            self.assertEqual(actual, vector(gel))
            self.assertNotEqual(actual, vector(plain))

    def test_gel_terminals_preserve_joins_and_profile_dot_weights(self):
        path = 'M0 0 L0 200 M300 500 L300 700'
        exposed = build.stroke(path, 52, gel=True)
        joined = build.stroke(path, 52, gel=True, joins=[(0, 0)])
        self.assertLess(exposed.bounds[1], joined.bounds[1] - .5,
                        'The first exposed start pools even with several pen movements; a joining anchor does not.')
        regular = {r['id']: r for r, _, _ in self.faces if r['weight'] == 400}
        diameters = []
        for id_ in ['script05', 'script07', 'script10']:
            dot = next(g for g in regular[id_]['glyphs'] if g['name'] == 'period')
            diameters.append(dot['bounds'][2] - dot['bounds'][0])
        self.assertLess(diameters[0], diameters[1])
        self.assertGreater(diameters[2] / diameters[0], 1.8,
                           'Broad punctuation must retain the broad pen width, rather than hitting a shared dot-size cap.')

    def test_width_fit_letters_keep_the_round_nib(self):
        # The O inside Sans Œ is width-fit to75%. Its vertical nib must remain
        # full width, rather than shrinking to75% like an outlined-path scale.
        for record, _, _ in self.faces:
            if record['profile'] != 'sans':
                continue
            glyph = next(g for g in record['glyphs'] if g['unicode'] == ord('Œ'))
            width = 72 * (1.4 if record['weight'] == 700 else 1)
            centerline = build.pathops.Path()
            for d in build.repertoire(False)['O']['paths']:
                parse_path(d, centerline.getPen())
            expected_left = centerline.bounds[0] * .75 - width / 2
            self.assertLess(abs(glyph['bounds'][0] - expected_left), 2)

    def test_handprinted_sans_proportions_and_distinct_stems(self):
        for record, _, _ in self.faces:
            if record['id'] != 'sans':
                continue
            glyphs = {g['name']: g for g in record['glyphs']}
            self.assertLess(glyphs['O']['advanceWidth'], 675, 'Capitals have upright, narrow printed proportions.')
            self.assertGreater(glyphs['I']['bounds'][2] - glyphs['I']['bounds'][0], 200,
                               'The printed capital I has visible end bars to distinguish it from l.')
            self.assertEqual(len({glyphs[n]['path'] for n in ['I', 'l', 'one']}), 3)

    def test_mono_keeps_columns_and_overhangs_inside_cells(self):
        for face in self.faces:
            record, font, _ = face
            if record['id'] != 'mono':
                continue
            self.assertEqual(font['post'].isFixedPitch, 1)
            for glyph in record['glyphs']:
                if (glyph['unicode'] is not None or glyph.get('alternateOf')) and not glyph.get('mark') and glyph['unicode'] != 0xad:
                    self.assertEqual(glyph['advanceWidth'], 650)
                    self.assertGreaterEqual(glyph['bounds'][0], 0)
                    self.assertLessEqual(glyph['bounds'][2], 650)
            for text in ['iiii WWWW 0000', 'office != afflict', 'Il1 {}[](); // café']:
                for enabled in [True, False]:
                    shaped = self.shape(face, text, liga=enabled, calt=enabled, kern=enabled)
                    self.assertEqual(sum(p.x_advance for _, p in shaped), 650 * len(text))

    def test_generated_checksums_and_license(self):
        checksums = json.loads((build.OUT / 'SHA256SUMS.json').read_text())
        for name, digest in checksums.items():
            self.assertEqual(hashlib.sha256((build.OUT / name).read_bytes()).hexdigest(), digest, name)
        license_text = (build.OUT / 'jot-original-OFL.txt').read_text()
        self.assertIn('SIL OPEN FONT LICENSE Version 1.1', license_text)
        self.assertIn('The Jot Font Authors', license_text)
        self.assertNotIn('The Caveat Project Authors', license_text)

    def test_printed_alternates_are_real_stable_shapes(self):
        for face in self.faces:
            record, font, _ = face
            if record['id'] not in ('sans', 'mono'):
                continue
            glyphs = {g['name']: g for g in record['glyphs']}
            for alternate in (g for g in record['glyphs'] if g.get('alternateOf')):
                base = build.pathops.Path()
                other = build.pathops.Path()
                parse_path(glyphs[alternate['alternateOf']]['path'], base.getPen())
                parse_path(alternate['path'], other.getPen())
                union = abs(build.pathops.op(base, other, build.pathops.PathOp.UNION).area)
                intersection = abs(build.pathops.op(base, other, build.pathops.PathOp.INTERSECTION).area)
                difference = (union - intersection) / union
                self.assertGreaterEqual(difference, .08, f'{record["file"]} {alternate["name"]}: too similar')
                self.assertLessEqual(difference, .25, f'{record["file"]} {alternate["name"]}: too distorted')
            for ch in 'aeonmIl10':
                base = build.name_of(ch)
                self.assertNotEqual(glyphs[base]['path'], glyphs[base + '.alt']['path'])
                self.assertEqual(glyphs[base]['advanceWidth'], glyphs[base + '.alt']['advanceWidth'])
            self.assertEqual([n for n, _ in self.shape(face, 'ee', liga=False, calt=True)], ['e', 'e.alt'])
            self.assertEqual([n for n, _ in self.shape(face, 'ae', liga=False, calt=False, ss01=True)], ['a.alt', 'e.alt'])
            sample = 'coffee 0011 III'
            on = sum(p.x_advance for _, p in self.shape(face, sample, liga=False, calt=True, ss01=True))
            off = sum(p.x_advance for _, p in self.shape(face, sample, liga=False, calt=False, ss01=False))
            self.assertEqual(on, off)

    def test_ink_does_not_pool_inside_stroke_intersections(self):
        drawing = build.spec(250, 'M0 0 L0 200', 'M0 100 L150 100')
        ink = build.outline(drawing, 52, lambda _: None, gel=True)
        self.assertFalse(ink.contains((-27, 100)), 'The joined crossbar must not create a pooled lump on the stem edge.')
        self.assertTrue(ink.contains((150, 100)), 'The exposed terminal still has ink.')

    def test_script_oval_entries_do_not_spike_into_counters(self):
        for record, font, _ in self.faces:
            if record['id'] in ('sans', 'mono'):
                continue
            nominal = {'0.5': 40, '0.7': 52, '1.0': 78}[record['profile']]
            width = nominal * (1.4 if record['weight'] == 700 else 1)
            glyphs = font.getGlyphSet()
            for name in ['a', 'd']:
                probe = PointInsidePen(glyphs, (125 + width * .35, 270))
                glyphs[name].draw(probe)
                self.assertFalse(probe.getResult(), f'{record["file"]} {name}: entry stroke intrudes into the open bowl')

    def test_deterministic_regeneration(self):
        first = build.generated_files()
        second = build.generated_files()
        self.assertEqual(first.keys(), second.keys())
        self.assertEqual({name: hashlib.sha256(data).digest() for name, data in first.items()}, {name: hashlib.sha256(data).digest() for name, data in second.items()})
        self.assertEqual(first['catalog.json'], (build.OUT / 'catalog.json').read_bytes())


if __name__ == '__main__':
    unittest.main(verbosity=2)
