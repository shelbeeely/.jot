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
