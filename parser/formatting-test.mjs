// Fuller formatting (spec 4.2.1): highlight, underline, superscript, footnotes, callouts and centred lines. Run: node --test formatting-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from './jot.mjs';

const tokens = (src) => parse(src).nodes.flatMap((n) => (n.markdown ? n.markdown.tokens || [] : n.inline || []));
const types = (src) => tokens(src).map((t) => t.type);

test('==highlight==, ++underline++ and ^superscript^ inside a paragraph, with formatting inside them', () => {
  const t = tokens('Some ==bright **bold**== and ++under++ text, x^2^.');
  assert.deepEqual(t.map((x) => x.type), ['text', 'mark', 'text', 'ins', 'text', 'sup', 'text']);
  assert.deepEqual(t[1].tokens.map((x) => x.type), ['text', 'strong']);
  assert.equal(t[3].text, 'under'); assert.equal(t[5].text, '2');
});

test('prose that only looks like the marks stays prose', () => {
  for (const s of ['a == b and c == d', 'C++ and C++ again', '2 ^ 3 and 4^ 5', '== ==', '++ ++', 'x^^y', '=== not a heading under nothing']) assert.ok(!types(s).some((t) => ['mark', 'ins', 'sup'].includes(t)), s);
  assert.deepEqual(types('`==code==` and ==real=='), ['codespan', 'text', 'mark'], 'nothing starts inside code');
});

test('footnotes: a reference and its note, the note may continue on indented lines', () => {
  const a = parse('A claim[^src] and another[^2].\n\n[^src]: Where it came from,\n  on two lines.\n[^2]: Second.\n');
  const ref = a.nodes[0].markdown.tokens.filter((t) => t.type === 'footnoteRef').map((t) => t.id);
  assert.deepEqual(ref, ['src', '2']);
  const notes = a.nodes.filter((n) => n.type === 'footnote');
  assert.deepEqual(notes.map((n) => [n.markdown.id, n.markdown.text]), [['src', 'Where it came from,\non two lines.'], ['2', 'Second.']]);
  assert.equal(a.diagnostics.length, 0);
});

test('callouts: GitHub alerts on a blockquote\'s first line', () => {
  for (const kind of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']) {
    const [n] = parse(`> [!${kind}]\n> Mind the step.\n`).nodes;
    assert.equal(n.callout, kind.toLowerCase());
    assert.equal(n.markdown.tokens[0].text, 'Mind the step.', 'the marker leaves the text');
  }
  assert.equal(parse('> [!NOTE] on the same line\n').nodes[0].callout, undefined, 'as on GitHub, the marker is alone on its line');
  assert.equal(parse('> [!SOMETHING]\n> x\n').nodes[0].callout, undefined);
  assert.equal(parse('> A plain quote\n').nodes[0].callout, undefined);
});

test('a centred line, and things that are not one', () => {
  const [n] = parse('-> A small beginning is still a beginning. <-\n').nodes;
  assert.equal(n.type, 'center'); assert.equal(n.markdown.text, 'A small beginning is still a beginning.');
  assert.notEqual(parse('-> no closing arrow\n').nodes[0].type, 'center');
  assert.notEqual(parse('a -> b <- c\n').nodes[0].type, 'center');
});

test('rapid tasks get the same inline formatting', () => {
  const [n] = parse('[ ] Buy ==milk== and ++eggs++\n').nodes;
  assert.equal(n.type, 'task'); assert.deepEqual(n.inline[0].tokens.map((t) => t.type), ['text', 'mark', 'text', 'ins']);
});

test('the source is kept exactly', () => {
  const src = 'Some ==bright== ++under++ x^2^[^1]\r\n\r\n-> mid <-\r\n> [!TIP]\r\n> ok\r\n\r\n[^1]: note\r\n';
  assert.equal(stringify(parse(src)), src);
  const a = parse(src); let end = 0; for (const n of a.nodes) { assert.equal(n.start, end); end = n.end; }
  assert.equal(end, new TextEncoder().encode(src).length, 'byte offsets cover the whole file, in order');
});
