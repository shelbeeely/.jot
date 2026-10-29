import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectSource, applySourceEdit } from './dist/live-model.mjs';

function checked(source) {
  const blocks = projectSource(source);
  let cursor = 0;
  for (const block of blocks) {
    assert.equal(block.from, cursor, 'block source ranges are contiguous');
    assert.equal(block.raw, source.slice(block.from, block.to));
    assert.ok(block.contentFrom >= block.from && block.contentTo <= block.to && block.contentFrom <= block.contentTo);
    for (const leaf of block.leaves) {
      assert.ok(leaf.from >= block.contentFrom && leaf.to <= block.contentTo && leaf.from <= leaf.to);
      if (leaf.map) {
        assert.equal(leaf.map.length, leaf.text.length + 1);
        assert.equal(leaf.map[0], leaf.from); assert.equal(leaf.map.at(-1), leaf.to);
        assert.ok(leaf.map.every((offset, i) => i === 0 || offset >= leaf.map[i - 1]));
      }
    }
    cursor = block.to;
  }
  assert.equal(cursor, source.length); assert.equal(blocks.map(block => block.raw).join(''), source);
  return blocks;
}
const textOf = block => block.leaves.map(leaf => leaf.text).join('');

test('projection preserves exact UTF-16 coverage through BOM, Unicode, CRLF, headings and paragraph boundaries', () => {
  const source = '\uFEFF# A 🌻 heading\r\n\r\nCafé words **bold**.\r\n';
  const blocks = checked(source);
  assert.equal(blocks[0].kind, 'heading'); assert.equal(blocks[0].level, 1);
  assert.equal(blocks[0].contentFrom, source.indexOf('A 🌻')); assert.equal(textOf(blocks[0]), 'A 🌻 heading');
  assert.equal(blocks[1].kind, 'paragraph'); assert.equal(textOf(blocks[1]), 'Café words bold.');
  const bold = blocks[1].leaves.find(leaf => leaf.marks.includes('strong'));
  assert.equal(source.slice(bold.from, bold.to), 'bold'); assert.equal(source.slice(blocks[1].parts[1].from, blocks[1].parts[1].to), '**bold**');
  assert.equal(blocks.at(-1).virtual, true); assert.equal(blocks.at(-1).from, source.length);
});
test('inline descriptors retain nested mark boundaries and hide only supported syntax', () => {
  const source = 'A **bold *and italic***, ~~gone~~, ==bright==, ++under++, `code`, `` `ticks` ``.';
  const [block] = checked(source);
  assert.equal(textOf(block), 'A bold and italic, gone, bright, under, code, `ticks`.');
  const nested = block.leaves.find(leaf => leaf.text === 'and italic'); assert.deepEqual(nested.marks, ['strong', 'em']);
  assert.ok(block.leaves.some(leaf => leaf.marks.includes('strike')));
  assert.ok(block.leaves.some(leaf => leaf.marks.includes('highlight')));
  assert.ok(block.leaves.some(leaf => leaf.marks.includes('underline')));
  const code = block.parts.find(part => part.kind === 'code');
  assert.equal(source.slice(code.from, code.to), '`code`'); assert.equal(source.slice(code.contentFrom, code.contentTo), 'code');
});
test('escaped punctuation, known entities and soft line breaks supply absolute visible-character maps', () => {
  const source = 'A \\*literal\\* &amp; &lt; &unknown;\r\nnext';
  const [block] = checked(source);
  assert.equal(textOf(block), 'A *literal* & < &unknown;\nnext');
  const escape = block.parts.find(part => part.text === '*');
  assert.equal(escape.from, source.indexOf('\\*')); assert.equal(escape.map[0], source.indexOf('\\*') + 1);
  const entity = block.leaves.find(leaf => leaf.text.includes('&unknown;'));
  assert.ok(entity.map); assert.equal(entity.map.at(-1), source.length);
  assert.equal(source.slice(entity.map[entity.text.indexOf('&')], entity.map[entity.text.indexOf('&') + 1]), '&amp;');
});
test('named links retain labelled children and safe hrefs; unsupported or unsafe forms stay harmless source data', () => {
  const source = '[**A [label]**](https://example.org/path) and [bad](javascript:alert(1)) and <b>raw</b> and [ink]{ink=#aabbcc}';
  const [block] = checked(source), links = block.parts.filter(part => part.kind === 'link');
  assert.equal(links[0].href, 'https://example.org/path'); assert.equal(links[0].children[0].kind, 'strong');
  assert.equal(links[1].href, undefined); assert.equal(textOf(block).includes('<b>raw</b>'), true);
  assert.equal(textOf(block).includes('[ink]{ink=#aabbcc}'), true, 'unsupported color descriptors remain literal and intact');
  const codeLabel = checked('[`a]b`](https://example.org)')[0];
  assert.equal(textOf(codeLabel), 'a]b');
  const book = checked('[River](places.jot#river)')[0].parts[0]; assert.equal(book.href, 'places.jot#river');
});
test('flat list lines, Jot tasks, quotes and newly typed empty markers have editable content cells', () => {
  const source = '- first\r\n- **second**\r\n\r\n[<] Scheduled\r\n\r\n> A *quote*\r\n';
  const blocks = checked(source);
  assert.deepEqual(blocks.filter(block => block.kind === 'list').map(textOf), ['first', 'second']);
  const task = blocks.find(block => block.kind === 'task'); assert.equal(task.state, '<'); assert.equal(task.prefix, '[<] ');
  assert.equal(textOf(blocks.find(block => block.kind === 'quote')), 'A quote');
  for (const [source, kind] of [['# ', 'heading'], ['- ', 'list'], ['1. ', 'list'], ['[ ] ', 'task'], ['- [ ] ', 'task'], ['> ', 'quote']]) {
    const block = checked(source)[0]; assert.equal(block.kind, kind, source); assert.equal(block.contentFrom, source.length); assert.equal(block.contentTo, source.length);
  }
  const tail = checked('- first\n- '); assert.equal(tail[1].kind, 'list'); assert.equal(tail[1].contentFrom, '- first\n- '.length);
});
test('records, fences, hidden comments, tables, metadata and nested constructs remain exact opaque source', () => {
  for (const source of [
    ':::record future #stable\r\nunknown: keep this\r\nrepeat: a\r\nrepeat: b\r\n:::\r\n',
    '```jot\n# Not a heading\n**Literal**\n```', '/*\n- hidden\n*/\n',
    '| A | B |\n| - | - |\n| x | y |\n', '---\nTitle: Example\nTimezone: UTC\n---\n',
    '- parent\n  - child\n', 'Heading\n=======\n'
  ]) {
    const blocks = checked(source); assert.equal(blocks[0].kind, 'opaque', source);
    assert.equal(blocks[0].raw, source.slice(0, blocks[0].to)); assert.deepEqual(blocks[0].leaves, []);
  }
});
test('unterminated opaque blocks and raw HTML are never repaired or evaluated by projection', () => {
  for (const source of [':::record future\nx: unclosed', '```js\nalert(1)', '/*\nnot closed', '<script>alert(1)</script>\n']) {
    const blocks = checked(source); assert.equal(blocks[0].kind, 'opaque'); assert.ok(blocks[0].raw.includes(source.trimEnd()));
  }
});
test('empty and trailing paragraphs provide caret ranges without changing bytes or inventing content', () => {
  for (const source of ['', '\uFEFF', '\n', '\r\n\r\n', '# Heading\n\n']) {
    const blocks = checked(source); assert.ok(blocks.length); assert.equal(blocks.at(-1).kind, 'paragraph'); assert.equal(blocks.at(-1).contentTo, source.length);
  }
  const source = ':::record future\nfield: unchanged\n:::';
  const last = checked(source).at(-1); assert.equal(last.raw, ''); assert.equal(last.insertPrefix, '\n\n');
  assert.equal(checked(source + '\r\n').at(-1).insertPrefix, '\r\n');
});
test('source edits clamp only the edit boundaries, preserve surrounding unknown bytes and return source selection', () => {
  const source = '\uFEFF:::record future\r\nfield: exact\r\n:::\r\n\r\nA 🌻 word';
  const from = source.indexOf('word'), result = applySourceEdit(source, { from, to: source.length, text: '**word**' });
  assert.equal(result.source.slice(0, from), source.slice(0, from)); assert.equal(result.source.slice(from), '**word**');
  assert.deepEqual(result.selection, { anchor: from + 8, focus: from + 8 });
  assert.equal(applySourceEdit('abc', { from: -5, to: 999, text: 'x' }).source, 'x');
  assert.throws(() => applySourceEdit('abc', { from: NaN, text: 'x' }), /finite/);
});
