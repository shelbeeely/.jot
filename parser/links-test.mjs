// Links within a journal (spec 4.2.2): date headings and record IDs as targets, unresolved references, links to other files.
// Run: node --test links-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from './jot.mjs';

const enc = new TextEncoder(), dec = new TextDecoder();
const slice = (a, l) => dec.decode(enc.encode(a.source).slice(l.start, l.end));
const codes = (a) => a.diagnostics.map((d) => d.code);

test('a dated heading and a record ID are link targets; links resolve to their node', () => {
  const a = parse('### 2026-10-25 | Sunday\n\nRain.\n\n### 2026-10-26\n\nAfter [yesterday](#2026-10-25) came [the plan](#plan).\n\n:::record note #plan\nbody: rest\n:::\n');
  assert.deepEqual(a.nodes.filter((n) => n.anchor).map((n) => n.anchor), ['2026-10-25', '2026-10-26', 'plan']);
  assert.deepEqual(a.links.map((l) => [l.target, a.nodes[l.to].type]), [['2026-10-25', 'heading'], ['plan', 'record']]);
  assert.equal(slice(a, a.links[0]), '[yesterday](#2026-10-25)');
  assert.deepEqual(a.diagnostics, []);
  assert.equal(stringify(a), a.source);
});

test('links are found in lists, tables, quotes, footnotes, tasks, events, questions, ideas and margin notes', () => {
  const src = '### 2026-10-25\n\n- [a](#2026-10-25)\n\n| x |\n|---|\n| [b](#2026-10-25) |\n\n> [c](#2026-10-25)\n\nNote[^1].\n\n[^1]: [d](#2026-10-25)\n\n[ ] do [e](#2026-10-25)\no went [f](#2026-10-25)\n? why [g](#2026-10-25)\n! idea [h](#2026-10-25)\n[[see [i](#2026-10-25)]]\n';
  const a = parse(src);
  assert.deepEqual(a.links.map((l) => slice(a, l)[1]), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  assert.ok(a.links.every((l) => l.to === 0));
  assert.deepEqual(a.diagnostics, []);
});

test('a missing #id is an unresolved-reference warning at the link; code and escapes are not links', () => {
  const a = parse('Before [earlier](#day-am) 🌙 and `[x](#code)` and \\[y](#esc).\n');
  assert.deepEqual(codes(a), ['unresolved-reference']);
  assert.equal(slice(a, a.diagnostics[0]), '[earlier](#day-am)');
  assert.equal(a.links.length, 1); assert.equal(a.links[0].to, undefined);
});

test('links to a duplicated ID stay unresolved; a repeated date links to its first heading with a warning', () => {
  const a = parse(':::record note #a\n:::\n:::record note #a\n:::\n\nSee [a](#a).\n');
  assert.deepEqual(codes(a), ['duplicate-id', 'unresolved-reference']);
  assert.ok(!a.nodes.some((n) => n.anchor));
  const b = parse('### 2026-10-25\nMorning.\n### 2026-10-25\nEvening, after [the morning](#2026-10-25).\n');
  assert.equal(b.links[0].to, 0); assert.deepEqual(codes(b), ['ambiguous-reference']);
  assert.deepEqual(parse('### 2026-10-25\nMorning.\n### 2026-10-25\nEvening.\n').diagnostics, [], 'repeated dates alone stay valid');
});

test('a record ID named like a date takes the link; the heading is then not a target', () => {
  const a = parse('### 2026-10-25\n\n:::record note #2026-10-25\n:::\n\n[x](#2026-10-25)\n');
  assert.equal(a.nodes[a.links[0].to].type, 'record'); assert.equal(a.nodes[0].anchor, undefined);
});

test('record link fields: relation: kind #target, member and source are validated; prose values are not links', () => {
  const a = parse('### 2026-10-25\n\n:::record collection #c\nmember: #2026-10-25\nmember: #gone\nsource: A book I read\nrelation: about #c2\nrelation: continues other.jot#a\n:::\n');
  assert.deepEqual(a.links.map((l) => [l.field, l.target, l.to ?? null, l.file ?? null]), [['member', '2026-10-25', 0, null], ['member', 'gone', null, null], ['relation', 'c2', null, null], ['relation', 'a', null, 'other.jot']]);
  assert.deepEqual(codes(a), ['unresolved-reference', 'unresolved-reference']);
  assert.equal(slice(a, a.diagnostics[0]), '#gone');
  const b = parse(':::record note #ab\nrelation: continues #a\nmember: #a\n:::\n'); // a field's link is found on its own line, not in the header's #ab
  assert.deepEqual(b.links.map((l) => b.source.slice(0, l.start).split('\n').length), [2, 3]);
});

test('links to other files are kept but never checked; web links are not internal; plain Markdown mode finds none', () => {
  const a = parse('[there](notes/other.jot#a) [z](archive.jotz#2026-10-01) [w](https://example.com/#x) [m](mailto:a@b.c)\n');
  assert.deepEqual(a.links.map((l) => [l.file, l.target]), [['notes/other.jot', 'a'], ['archive.jotz', '2026-10-01']]);
  assert.deepEqual(a.diagnostics, []);
  assert.equal(parse('[x](#nope)\n', { journal: false }).links, undefined);
});
