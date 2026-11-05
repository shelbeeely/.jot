// Flip cards (spec 8.1.7): a front and a back, kept as written; the parser says what is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { cardOf, cardProblems } from './card.mjs';

const record = (src) => parse(src).nodes.find((n) => n.type === 'record');
const at = (src, d) => Buffer.from(src).subarray(d.start, d.end).toString();

test('reads a card, a multiline back included', () => {
  const c = cardOf(record(':::record card #leaf\nlabel: Biology\nfront: What does a leaf make?\nback: |\n  Sugar,\n  and oxygen.\nbox: 2\n:::\n'));
  assert.deepEqual(c, { front: 'What does a leaf make?', back: 'Sugar,\nand oxygen.', label: 'Biology', rest: [{ name: 'box', value: '2' }] });
});
test('a second front or back is kept, not used', () => {
  const c = cardOf(record(':::record card\nfront: A\nfront: B\nback: C\n:::\n'));
  assert.equal(c.front, 'A'); assert.deepEqual(c.rest, [{ name: 'front', value: 'B' }]);
});
test('warns on the record when the front or back is missing; source kept byte for byte', () => {
  const src = ':::record card\nlabel: Unfinished\n:::\n', ast = parse(src);
  assert.deepEqual(ast.diagnostics.map((d) => [d.code, at(src, d)]), [['card-without-front', ':::record card\n'], ['card-without-back', ':::record card\n']]);
  assert.equal(ast.nodes.map((n) => n.raw).join(''), src);
  assert.deepEqual(cardProblems(record(':::record card\nfront: Q\nback: A\n:::\n')), []);
});
