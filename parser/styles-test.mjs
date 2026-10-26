// Page styles (styles.mjs) and how the preview writes dates (preview.mjs dateWords). Run: node --test styles-test.mjs
// (the styles on a page, Download page and the exported file are tested in a browser: site/test-editor-ui.cjs, vscode/test-preview.cjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLES, styleCSS, pageCSS, isStyle } from './styles.mjs';
import { dateWords } from './preview.mjs';

test('three styles, each scoped to its own doubled class, nothing left unscoped', () => {
  assert.deepEqual(Object.keys(STYLES), ['journal', 'notes', 'plain']);
  const css = styleCSS();
  for (const id of Object.keys(STYLES)) assert.ok(css.includes(`.jot-style-${id}.jot-style-${id}`), id);
  assert.ok(!/(^|[\s,{}])\.S\b/.test(css), 'no bare .S left');
  assert.ok(isStyle('notes') && !isStyle('toString') && !isStyle('fancy'));
});

test('the styles name only fonts the reader already has, and fetch nothing', () => {
  const css = styleCSS();
  assert.ok(!/url\(|@import|https?:/.test(css));
  assert.match(css, /Iowan Old Style[^;]*Georgia,serif/, 'journal: book serifs, then Georgia, then serif');
  assert.match(css, /system-ui[^;]*sans-serif/, 'notes: the system sans');
});

test('printing: the paper size, book margins, page numbers in journal and notes but not plain', () => {
  assert.equal(pageCSS('journal', [148, 210]).startsWith('@page { size: 148mm 210mm; margin: 20mm 18mm 24mm 18mm;'), true);
  assert.match(pageCSS('notes', [210, 297]), /margin: 16mm 16mm 20mm 16mm; @bottom-center \{ content: counter\(page\);/);
  assert.doesNotMatch(pageCSS('plain', [215.9, 279.4]), /bottom-center/);
  assert.match(pageCSS('journal', [88.9, 139.7]), /margin: 12mm 11mm 15mm 11mm/, 'a pocket page gets narrower margins');
  assert.match(styleCSS(), /@media print\{\.jot-style-journal\.jot-style-journal\{font-size:10\.5pt/);
});

test('dates in words; the rest of a dated heading kept when it says more than the weekday', () => {
  assert.deepEqual(dateWords('2026-10-26', 'Monday'), { words: 'Monday, 26 October 2026', note: '' });
  assert.deepEqual(dateWords('2026-10-26', ''), { words: 'Monday, 26 October 2026', note: '' });
  assert.deepEqual(dateWords('1888-04-07', 'APRIL 7'), { words: 'Saturday, 7 April 1888', note: 'APRIL 7' });
  assert.equal(dateWords('2026-10-26', '', 'en-US').words, 'Monday, October 26, 2026');
});
