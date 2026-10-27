// Includes (include.mjs): which paths are allowed, what a fragment names, gathering for a host, and flatten. Run: node --test parser/include-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { includeTarget, includesOf, excerpt, gather, flatten, notice, MAX_DEPTH } from './include.mjs';

test('only relative .jot paths inside the root; never a scheme, an absolute path or a climb above it', () => {
  assert.deepEqual(includeTarget('week.jot#2026-10-25'), { path: 'week.jot', fragment: '2026-10-25' });
  assert.deepEqual(includeTarget('notes/a.jot', 'journal.jot'), { path: 'notes/a.jot', fragment: '' });
  assert.deepEqual(includeTarget('b.jot#x', 'notes/a.jot'), { path: 'notes/b.jot', fragment: 'x' }, 'relative to the including file');
  assert.deepEqual(includeTarget('../c.jot', 'notes/a.jot'), { path: 'c.jot', fragment: '' }, 'up is fine while it stays inside');
  assert.deepEqual(includeTarget('./my%20week.jot'), { path: 'my week.jot', fragment: '' });
  for (const bad of ['../x.jot', 'notes/../../x.jot', '/etc/x.jot', '\\\\server\\x.jot', 'C:/x.jot', 'c:x.jot', 'https://example.com/x.jot', 'file:///x.jot', 'data:text/plain,x.jot', '~/x.jot', '//host/x.jot', 'a\\b.jot', 'a%2F..%2F..%2Fx.jot', '%zz.jot', 'a.jot#bad id'])
    assert.ok(includeTarget(bad).error, bad);
  assert.equal(includeTarget('photo.png').error, 'not-jot');
  assert.equal(includeTarget('x.jot#', 'a/b.jot').path, 'a/x.jot');
});

test('an include is a line of its own; a .jot image inside other words is not', () => {
  const ast = parse('Hi\n\n![My week](week.jot#2026-10-25)\n\n![a](a.jot)\n![b](b.jot)\n\nWords ![c](c.jot) here.\n\n![pic](p.png)\n');
  assert.deepEqual(includesOf(ast).map((i) => [i.label, i.path, i.fragment]), [['My week', 'week.jot', '2026-10-25'], ['a', 'a.jot', ''], ['b', 'b.jot', '']]);
  assert.equal(includesOf(parse('![x](https://e.com/x.jot)\n'))[0].error, 'unsafe-path');
});

test('a fragment names a record, every entry with a date, or nothing (the whole file)', () => {
  const ast = parse('# Month\n\n### 2026-10-25\n\nRain.\n\n:::record measurement #sleep-25\nmetric: sleep\nvalue: 7\n:::\n\n### 2026-10-26\n\nSun.\n');
  assert.equal(excerpt(ast, 'sleep-25').length, 1);
  assert.match(excerpt(ast, '2026-10-25').map((n) => n.raw).join(''), /^### 2026-10-25[\s\S]*value: 7\n:::\n\n$/);
  assert.equal(excerpt(ast, '').length, ast.nodes.length);
  assert.equal(excerpt(ast, 'nope'), null); assert.equal(excerpt(ast, '2026-10-27'), null);
});

const files = { 'a.jot': '### 2026-10-25\n\nFrom a.\n\n![b](b.jot)\n', 'b.jot': 'From b.\n\n![loop](a.jot)\n', 'deep/1.jot': '![](2.jot)\n', 'deep/2.jot': '![](3.jot)\n', 'deep/3.jot': '![](4.jot)\n', 'deep/4.jot': 'Bottom.\n' };
const read = (p) => (p in files ? files[p] : null);

test('gather reads each include once, recursively, and lists what it could not show', async () => {
  const g = await gather('![a](a.jot)\n\n![gone](gone.jot)\n\n![web](https://example.com/x.jot)\n', { from: 'main.jot', read: async (p) => read(p) });
  assert.deepEqual(Object.keys(g.files).sort(), ['a.jot', 'b.jot']);
  assert.deepEqual(g.problems.map((p) => p.kind).sort(), ['loop', 'not-found', 'unsafe-path']);
  const d = await gather('![](deep/1.jot)\n', { read });
  assert.deepEqual(Object.keys(d.files).sort(), ['deep/1.jot', 'deep/2.jot', 'deep/3.jot']);
  assert.deepEqual(d.problems.map((p) => p.kind), ['too-deep']);
  assert.equal(MAX_DEPTH, 3);
  let calls = 0; await gather('![](x.jot)\n', { read: () => { calls++; return 'x'.repeat(1024 * 1024 + 1); } });
  assert.equal(calls, 1);
});

test('flatten writes includes out between comments that say where from; problems keep their line', async () => {
  const src = '# Me\n\n![a](a.jot#2026-10-25)\n\n![gone](gone.jot)\n\nEnd.\n';
  const f = await flatten(src, { from: 'main.jot', read });
  assert.equal(f.expanded, 2);
  assert.equal(f.text, '# Me\n\n/*\nincluded from a.jot#2026-10-25\n*/\n### 2026-10-25\n\nFrom a.\n\n/*\nincluded from b.jot\n*/\nFrom b.\n\n![loop](a.jot)\n/*\nend of b.jot\n*/\n/*\nend of a.jot#2026-10-25\n*/\n\n![gone](gone.jot)\n\nEnd.\n');
  assert.deepEqual(f.problems.map((p) => p.kind), ['loop', 'not-found']);
  assert.equal(parse(f.text).diagnostics.length, 0);
  assert.equal(parse(f.text).entries.length, 1);
  assert.equal((await flatten('No includes.\n', { read })).text, 'No includes.\n');
  assert.match(notice('too-deep', 'x.jot'), /^too deep: x\.jot/);
});

test('flatten copies only what the preview shows, and leaves includes it cannot write out byte for byte', async () => {
  const w = '### 2026-10-25\n\nA.\n\n### 2026-10-26\n\nSECRET.\n\n### 2026-10-25\n\nB.\n';
  const f = await flatten('![w](w.jot#2026-10-25)\n', { read: (p) => (p === 'w.jot' ? w : null) });
  assert.match(f.text, /A\.[\s\S]*B\./); assert.doesNotMatch(f.text, /SECRET/, 'other days between two entries with the date stay out');
  for (const src of ['![x](a.jot)\n![y](b.jot)\n', '![a\\]b](x.jot "t")\n', '![x](../up.jot)']) assert.equal((await flatten(src, { read: () => null })).text, src);
  const big = await gather('![](big.jot)\n', { read: () => 'x'.repeat(1024 * 1024 + 1) });
  assert.deepEqual(big.problems.map((p) => p.kind), ['too-large']); assert.match(notice('too-large', 'big.jot'), /over 1 MiB/);
});

test('gather walks a file again when it is reached nearer the top, so the page gets everything it will show', async () => {
  const fs = { 'a.jot': '![](b.jot)\n', 'b.jot': '![](c.jot)\n', 'c.jot': '![](d.jot)\n', 'd.jot': 'D.\n' };
  const g = await gather('![](a.jot)\n\n![](c.jot)\n', { read: (p) => fs[p] ?? null });
  assert.deepEqual(Object.keys(g.files).sort(), ['a.jot', 'b.jot', 'c.jot', 'd.jot']);
});
