// Pen and ink for one entry: the source edit Writer makes. Run: node --test site/test-entry-pen.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setEntryPen, entryPenAt, penLabel } from './dist/entry-pen.mjs';
import { parse } from './dist/jot/jot.mjs';
import { entryPens } from './dist/jot/handwriting.mjs';

const SOURCE = '### 2026-11-01 | Sun\n\nOne\n\n### 2026-11-02 | Mon\n\nTwo\n\n### 2026-11-03 | Tue\n\nThree\n';
const looks = source => { const ast = parse(source); const pens = entryPens(ast); return ast.entries.map(e => pens[e.startNode]); };

test('only this entry: earlier entries are untouched and later ones look as they did', () => {
  const result = setEntryPen(SOURCE, SOURCE.indexOf('Two'), { hand: 'script10', ink: 'green' });
  assert.ok(result.source.startsWith(SOURCE.slice(0, SOURCE.indexOf('### 2026-11-02'))), 'earlier source is byte for byte the same');
  assert.match(result.source, /### 2026-11-02 \| Mon\n\n@hand: script10\n@ink: green\n\nTwo/);
  assert.deepEqual(looks(result.source), [{ hand: null, ink: null }, { hand: 'script10', ink: 'green' }, { hand: null, ink: null }]);
  assert.equal(result.date, '2026-11-02'); assert.equal(result.next, '2026-11-03');
});

test('this entry and after: later entries follow until one chooses its own', () => {
  const once = setEntryPen(SOURCE, SOURCE.indexOf('Three'), { ink: '#8a2d1a', scope: 'entry' }).source;
  const result = setEntryPen(once, once.indexOf('One'), { hand: 'pen', scope: 'onward' });
  assert.deepEqual(looks(result.source).map(p => p.hand), ['pen', 'pen', 'pen']);
  assert.deepEqual(looks(result.source).map(p => p.ink), [null, null, '#8a2d1a'], 'ink was left alone');
  assert.equal(result.until, null, 'no later entry sets its own pen');
});

test('changing an entry again replaces its own lines, and the reader\'s choice removes them', () => {
  const first = setEntryPen(SOURCE, SOURCE.indexOf('Three'), { hand: 'marker', ink: 'purple' }).source;
  const second = setEntryPen(first, first.indexOf('Three'), { hand: 'print', ink: 'purple' }).source;
  assert.equal((second.match(/@hand:/g) || []).length, 1); assert.match(second, /@hand: print/);
  assert.equal(setEntryPen(second, second.indexOf('Three'), { hand: null, ink: null }).source.trimEnd(), SOURCE.trimEnd());
});

test('restores a later entry that followed this one', () => {
  const onward = setEntryPen(SOURCE, SOURCE.indexOf('One'), { hand: 'script10', scope: 'onward' }).source;
  const only = setEntryPen(onward, onward.indexOf('Two'), { hand: 'marker' }).source;
  assert.deepEqual(looks(only).map(p => p.hand), ['script10', 'marker', 'script10']);
});

test('rejects unknown values and undated writing; reports what an entry uses', () => {
  assert.throws(() => setEntryPen(SOURCE, SOURCE.indexOf('Two'), { hand: 'quill' }), /listed pens/);
  assert.throws(() => setEntryPen(SOURCE, SOURCE.indexOf('Two'), { ink: 'red' }), /listed inks/);
  assert.throws(() => setEntryPen('No dates here.', 3, { hand: 'pen' }), /dated entry/);
  const set = setEntryPen(SOURCE, SOURCE.indexOf('Two'), { hand: 'pen', scope: 'onward' }).source;
  assert.deepEqual(entryPenAt(set, set.indexOf('Three')), { date: '2026-11-03', hand: 'pen', ink: null, ownHand: false, ownInk: false });
  assert.equal(penLabel('hand', 'script10'), 'Jot Script · 1.0'); assert.equal(penLabel('ink', null), 'page setting');
});

test('keeps Windows line endings', () => {
  const crlf = SOURCE.replace(/\n/g, '\r\n'), out = setEntryPen(crlf, crlf.indexOf('Two'), { ink: 'black' }).source;
  assert.ok(!/[^\r]\n/.test(out)); assert.match(out, /@ink: black\r\n/);
});
