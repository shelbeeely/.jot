// The handwriting module's pure parts: the grid's pitch, a printed page's geometry, the fonts and the look. Run: node --test handwriting-test.mjs
// (the drawing itself is tested in a browser: site/test-editor-ui.cjs and vscode/test-preview.cjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HANDS, INKS, PITCHES, pitchPx, snap, pageGeometry, handwritingCSS, PX_PER_MM } from './handwriting.mjs';

test('the pitch is snapped to Chromium\'s layout unit, so hundreds of lines stay on the dots', () => {
  for (const mm of PITCHES) { const p = pitchPx(mm); assert.equal(p * 64, Math.round(p * 64)); assert.ok(Math.abs(p / PX_PER_MM - mm) < 0.01, `${mm} mm`); }
  assert.equal(pitchPx(5), 18.890625); assert.equal(snap(1 / 3), 21 / 64);
});

test('a printed page holds a whole number of rows and columns, centred, at least the minimum margin', () => {
  for (const [paper, size] of [['A5', [148, 210]], ['A4', [210, 297]], ['Letter', [215.9, 279.4]], ['Pocket', [88.9, 139.7]]]) for (const mm of PITCHES) {
    const g = pageGeometry(size, mm), W = size[0] * PX_PER_MM, H = size[1] * PX_PER_MM;
    assert.equal(g.height, g.rows * g.pitch); assert.equal(g.width, g.cols * g.pitch);
    assert.ok(g.marginY >= 8 * PX_PER_MM - 0.1 && g.marginX >= 8 * PX_PER_MM - 0.1, `${paper} ${mm}`);
    assert.ok(Math.abs(2 * g.marginY + g.height - H) < 0.05 && Math.abs(2 * g.marginX + g.width - W) < 0.05, `${paper} ${mm}: the writing area is centred`);
    assert.match(g.css, new RegExp(`^@page \\{ size: ${size[0]}mm ${size[1]}mm; margin: [\\d.]+px [\\d.]+px; \\}$`));
  }
  assert.deepEqual([pageGeometry([148, 210], 5).rows, pageGeometry([148, 210], 5).cols], [38, 26], 'A5 at 5 mm: 38 rows of 26 dots');
});

test('the fonts the look names are all here, each with its licence', () => {
  const css = handwritingCSS('./fonts/');
  for (const h of Object.values(HANDS)) {
    assert.ok(fs.existsSync(new URL(`./fonts/${h.file}-OFL.txt`, import.meta.url)), `${h.file} licence`);
    for (const sub of ['latin', 'latin-ext']) for (const w of [400, 700]) { const f = `${h.file}-${sub}-${w}-normal.woff2`; assert.ok(css.includes(f) && fs.existsSync(new URL(`./fonts/${f}`, import.meta.url)), f); }
  }
  assert.deepEqual(HANDS.pen.alternates, ['', 'ss01', 'ss02'], 'the pen chooses among three shapes of each letter');
  assert.ok(Object.values(INKS).every((c) => /^#[0-9a-f]{6}$/.test(c)));
});

test('the look outranks a page\'s own typed styles, and asks the printer to print the dots', () => {
  const css = handwritingCSS('./fonts/');
  assert.ok(!/(^|[^.\w-])\.jot-hand(?!\.jot-hand|[\w-])/.test(css.replace(/\.jot-hand\.jot-hand/g, '')), 'every rule is .jot-hand.jot-hand');
  assert.match(css, /print-color-adjust:exact/);
  assert.match(css, /@media print\{\.jot-hand\.jot-hand \.hw-page-edge\{display:none\}\}/);
  assert.ok(!/box-shadow:inset/.test(css), 'no inset shadows: a PDF draws them as pictures that hide the dots');
});

test('hand-drawn boxes: a wobbly square and a scribbled tick, different for each seed, the same for the same seed', async () => {
  const { squarePath, tickPath, BOX_CSS, handwritingCSS: css } = await import('./handwriting.mjs');
  assert.equal(squarePath(4), squarePath(4)); assert.notEqual(squarePath(4), squarePath(5)); assert.notEqual(tickPath(4), tickPath(5));
  assert.match(squarePath(1), /^M[\d.]+,[\d.]+(Q[\d.]+,[\d.]+ [\d.]+,[\d.]+){4}L[\d.]+,[\d.]+$/, 'four bowed sides and the pencil\'s overlap');
  assert.match(tickPath(1), /^M[\d.-]+,[\d.-]+Q[\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+Q[\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+$/, 'one stroke, down then up');
  for (let s = 1; s < 50; s++) for (const n of squarePath(s).match(/-?[\d.]+/g).map(Number)) assert.ok(n > 0 && n < 24, `square ${s} stays in its box`);
  assert.match(BOX_CSS, /\.hw-tick\{[^}]*stroke-dashoffset:1/); assert.match(BOX_CSS, /\.hw-box\.done \.hw-tick\{stroke-dashoffset:0\}/, 'a done box shows its tick');
  assert.match(BOX_CSS, /@keyframes hw-draw\{from\{stroke-dashoffset:1\}to\{stroke-dashoffset:0\}\}/, 'the tick draws itself');
  assert.match(BOX_CSS, /@media \(prefers-reduced-motion:reduce\)\{[^}]*animation:none/); assert.match(BOX_CSS, /@media print\{[^}]*animation:none/);
  assert.ok(!/hw-check|input/.test(BOX_CSS), 'only drawings on handwritten pages: no form controls');
  assert.ok(css('./f/').includes(BOX_CSS));
});

test('the boxes come in several designs, chosen by seed, never the same twice in a row', async () => {
  const { BOX_KINDS, TICK_KINDS, squarePath, tickPath, boxKinds } = await import('./handwriting.mjs');
  assert.deepEqual(BOX_KINDS, ['closed', 'open', 'twice', 'round']); assert.deepEqual(TICK_KINDS, ['check', 'hook', 'flick', 'two']);
  for (const k of BOX_KINDS) for (let s = 1; s < 200; s++) for (const n of squarePath(s, k).match(/-?[\d.]+/g).map(Number)) assert.ok(n >= 0 && n <= 24, `${k} ${s} stays in its box`);
  assert.equal(new Set(BOX_KINDS.map((k) => squarePath(7, k).replace(/[\d.,-]/g, ''))).size, 4, 'four different ways to draw the square');
  assert.equal(new Set(TICK_KINDS.map((k) => tickPath(7, k))).size, 4, 'four different ticks');
  assert.ok(tickPath(7, 'hook').split('Q').length > tickPath(7, 'check').split('Q').length, 'the hook curls before the tick');
  assert.match(tickPath(7, 'two'), /^M[^M]+M/, 'the two-stroke tick lifts the pen');
  let last = null; const seen = new Set();
  for (let s = 1; s < 300; s++) { const k = boxKinds(s, last); if (last) assert.ok(k.box !== last.box && k.tick !== last.tick, `seed ${s}`); seen.add(`${k.box}/${k.tick}`); last = k; }
  assert.equal(seen.size, 16, 'every pairing turns up');
  assert.deepEqual(boxKinds(42), boxKinds(42), 'the same seed, the same box');
  assert.match((await import('./handwriting.mjs')).BOX_CSS, /\.hw-box:not\(\.done\) \.hw-tick\{visibility:hidden\}/, 'an empty box shows no stray dot');
});

test('highlight strokes have three distinct safe designs, with stable seeded variation', async () => {
  const { highlightSVG } = await import('./handwriting.mjs');
  for (const style of ['marker','brush','pencil']) {
    const a = highlightSVG('#ffe680',style,17);
    assert.equal(a, highlightSVG('#ffe680',style,17));
    assert.notEqual(a, highlightSVG('#ffe680',style,18));
    assert.ok(a.includes('#ffe680'));
    assert.ok(!/<script|onload=|url\(/i.test(a));
  }
  assert.equal(new Set(['marker','brush','pencil'].map(s=>highlightSVG('#ffe680',s,17))).size,3);
  assert.ok(!highlightSVG('red\" onload=\"evil','unknown',17).includes('evil'));
});
