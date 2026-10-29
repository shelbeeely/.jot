import test from 'node:test';
import assert from 'node:assert/strict';
import { findMatches, replaceAllMatches } from './dist/writer-search.mjs';

test('literal search escapes patterns and preserves exact UTF-16 offsets', () => {
  assert.deepEqual(findMatches('😀 a.b [x] a.b', 'a.b'), [{ start: 3, end: 6 }, { start: 11, end: 14 }]);
  assert.deepEqual(findMatches('[x] .* $ ^ \\', '[x]'), [{ start: 0, end: 3 }]);
  assert.deepEqual(findMatches('😀😀', '😀'), [{ start: 0, end: 2 }, { start: 2, end: 4 }]);
  assert.deepEqual(findMatches('anything', ''), []);
  assert.deepEqual(findMatches('aaaaa', 'aa'), [{ start: 0, end: 2 }, { start: 2, end: 4 }]);
});

test('case matching does not change Unicode source offsets', () => {
  assert.deepEqual(findMatches('Tea TEA tea', 'tea'), [{ start: 0, end: 3 }, { start: 4, end: 7 }, { start: 8, end: 11 }]);
  assert.deepEqual(findMatches('Tea TEA tea', 'tea', { caseSensitive: true }), [{ start: 8, end: 11 }]);
  // Lowercasing the full source would expand İ and corrupt the position of the following match.
  assert.deepEqual(findMatches('İ café CAFÉ', 'café'), [{ start: 2, end: 6 }, { start: 7, end: 11 }]);
});

test('whole words respect Unicode letters, marks, numbers and supplementary characters', () => {
  const options = { wholeWord: true };
  assert.deepEqual(findMatches('cat cats cat_ cat2 (cat) écat 猫cat cat😀', 'cat', options), [{ start: 0, end: 3 }, { start: 20, end: 23 }, { start: 35, end: 38 }]);
  assert.deepEqual(findMatches('café caféine', 'café', options), [{ start: 0, end: 4 }]);
  assert.deepEqual(findMatches('𐐀cat cat𐐀 cat', 'cat', options), [{ start: 12, end: 15 }]);
  assert.deepEqual(findMatches('e\u0301 e', 'e', options), [{ start: 3, end: 4 }]);
});

test('replace all keeps replacements literal and preserves surrounding source', () => {
  assert.deepEqual(replaceAllMatches('\ufeffOne\r\none\r\n', 'one', '$&😀$1'), { text: '\ufeff$&😀$1\r\n$&😀$1\r\n', count: 2 });
  assert.deepEqual(replaceAllMatches('x x xx', 'x', '', { wholeWord: true }), { text: '  xx', count: 2 });
  assert.deepEqual(replaceAllMatches('x', '', 'bad'), { text: 'x', count: 0 });
  assert.deepEqual(replaceAllMatches('before', 'missing', 'after'), { text: 'before', count: 0 });
  assert.deepEqual(replaceAllMatches('a a', 'a', 'aa'), { text: 'aa aa', count: 2 });
});
