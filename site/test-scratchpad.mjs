// Entry scratchpads (spec 4.2.7): the source edits Writer makes. Run: node --test site/test-scratchpad.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratchpadAt, setScratchpad, appendToScratchpad, addToEntry } from './dist/scratchpad-core.mjs';
import { parse } from './dist/jot/jot.mjs';

const SRC = '### 2026-11-03 | Tue\n\nOld.\n\n### 2026-11-04 | Wed\n\nThe heron.\n\n### 2026-11-05 | Thu\n\nLater.\n';
const run = (source, edit) => source.slice(0, edit.start) + edit.text + source.slice(edit.end);
const at = (source, words) => source.indexOf(words);

test('a scratchpad goes under the entry heading, and only that entry changes', () => {
  const out = run(SRC, setScratchpad(SRC, at(SRC, 'heron'), 'rough [ ] notes #tag'));
  assert.equal(out, SRC.replace('### 2026-11-04 | Wed\n\n', '### 2026-11-04 | Wed\n\n~~~draft\nrough [ ] notes #tag\n~~~\n\n'));
  const ast = parse(out), draft = ast.nodes.find(n => n.draft);
  assert.equal(draft.text, 'rough [ ] notes #tag');
  assert.equal(ast.nodes.filter(n => n.type === 'task').length, 0, 'scratchpad lines are literal, never tasks');
  assert.deepEqual(scratchpadAt(out, at(out, 'heron')), { date: '2026-11-04', text: 'rough [ ] notes #tag', exists: true });
  assert.deepEqual(scratchpadAt(out, at(out, 'Old')), { date: '2026-11-03', text: '', exists: false });
  assert.equal(scratchpadAt('No dates.', 2), null);
});

test('editing replaces it; emptying removes it and the blank line after it', () => {
  const one = run(SRC, setScratchpad(SRC, at(SRC, 'heron'), 'first'));
  const two = run(one, setScratchpad(one, at(one, 'heron'), 'second\nline'));
  assert.ok(two.includes('~~~draft\nsecond\nline\n~~~\n\nThe heron.'));
  assert.equal((two.match(/~~~draft/g) || []).length, 1);
  assert.equal(run(two, setScratchpad(two, at(two, 'heron'), '  ')), SRC);
  assert.equal(setScratchpad(SRC, at(SRC, 'heron'), ''), null);
});

test('the fence outgrows tildes inside the draft; CRLF stays CRLF', () => {
  const out = run(SRC, setScratchpad(SRC, at(SRC, 'heron'), 'a\n~~~\nb'));
  assert.ok(out.includes('~~~~draft\na\n~~~\nb\n~~~~\n'));
  assert.equal(parse(out).nodes.find(n => n.draft).text, 'a\n~~~\nb');
  const crlf = SRC.replace(/\n/g, '\r\n'), w = run(crlf, setScratchpad(crlf, at(crlf, 'heron'), 'x\ny'));
  assert.ok(!/[^\r]\n/.test(w)); assert.ok(w.includes('~~~draft\r\nx\r\ny\r\n~~~\r\n'));
});

test('moving words into the entry adds paragraphs after its writing; the scratchpad stays', () => {
  const pad = run(SRC, setScratchpad(SRC, at(SRC, 'heron'), 'rough'));
  const out = run(pad, addToEntry(pad, at(pad, 'heron'), 'The heron stood in the rain.\nIt did not move.'));
  assert.ok(out.includes('The heron.\n\nThe heron stood in the rain.\nIt did not move.\n\n### 2026-11-05'));
  assert.ok(out.includes('~~~draft\nrough\n~~~'));
  assert.equal(addToEntry(pad, at(pad, 'heron'), '   '), null);
  assert.ok(out.startsWith('### 2026-11-03 | Tue\n\nOld.\n\n'));
});

test('the scribe can talk into the scratchpad', () => {
  let out = run(SRC, appendToScratchpad(SRC, '2026-11-04', 'I went out.'));
  out = run(out, appendToScratchpad(out, '2026-11-04', 'It rained.'));
  out = run(out, appendToScratchpad(out, '2026-11-04', '[ ] call Sam', '\n'));
  assert.equal(parse(out).nodes.find(n => n.draft).text, 'I went out. It rained.\n[ ] call Sam');
  assert.equal(appendToScratchpad(SRC, '2026-12-01', 'x'), null);
});
