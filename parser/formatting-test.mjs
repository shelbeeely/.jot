// Fuller formatting (spec 4.2.1): highlight, underline, superscript, footnotes, callouts and centred lines. Run: node --test formatting-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify, mediaURL } from './jot.mjs';

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

test('color spans combine validated colors, links and nested formatting without changing source', () => {
  const src = '[**ink** and [a link](https://example.com)]{ink=#AB1234 highlight=#ffe680 strike=#c0392b underline=#245ac2}';
  const [t] = tokens(src);
  assert.equal(t.type, 'colorSpan');
  assert.deepEqual(t.colors, {ink:'#ab1234', highlight:'#ffe680', strike:'#c0392b', underline:'#245ac2'});
  assert.ok(t.tokens.some(t => t.type === 'strong'));
  assert.ok(t.tokens.some(t => t.type === 'link'));
  assert.equal(stringify(parse(src)), src);
  assert.equal(tokens('[[words]{ink=#123456}]{highlight=#ffe680}')[0].tokens[0].type, 'colorSpan');
  assert.equal(tokens('[a\\]b]{ink=#123456}')[0].type, 'colorSpan');
  assert.equal(tokens('[`brackets ] [` and **ink**]{ink=#123456}')[0].type, 'colorSpan');
});

test('color syntax rejects unsafe, unknown, duplicate and multiline attributes; code stays literal', () => {
  for (const src of ['[x]{ink=red}', '[x]{ink=#fff}', '[x]{ink=url(evil)}', '[x]{ink=#123456;display:none}', '[x]{background=#123456}', '[x]{ink=#123456 ink=#654321}', '[a\nb]{ink=#123456}', '`[x]{ink=#123456}`', '\\[x]{ink=#123456}']) {
    assert.ok(!types(src).includes('colorSpan'), src);
    assert.equal(stringify(parse(src)), src);
  }
  assert.equal(parse('[ ] [colored task]{ink=#123456}\n').nodes[0].inline[0].tokens[0].type, 'colorSpan');
});

test('highlight alternatives persist in color syntax and reject unsupported styles', () => {
  for (const style of ['marker','brush','pencil']) {
    const src = `[words]{highlight=#ffe680 highlight-style=${style}}`;
    assert.equal(tokens(src)[0].colors['highlight-style'], style);
    assert.equal(stringify(parse(src)), src);
  }
  for (const attrs of ['highlight-style=evil','highlight-style=marker highlight-style=pencil','ink=#123456=evil']) assert.ok(!types(`[x]{${attrs}}`).includes('colorSpan'));
});

test('Spotify references preserve source and link collections without touching code or unknown URIs', () => {
  const id = '4aawyAB9vmqN3uQ7FjRGTy';
  for (const kind of ['track', 'album', 'playlist', 'artist', 'episode', 'show']) {
    const src = `Music: spotify: ${kind}:${id}.\n`;
    const ast = parse(src); assert.equal(stringify(ast), src); assert.deepEqual(ast.diagnostics, []);
    const link = ast.nodes[0].markdown.tokens.find((t) => t.type === 'link');
    assert.equal(link.href, `https://open.spotify.com/${kind}/${id}`); assert.equal(link.text, 'Spotify ' + kind);
  }
  for (const src of [`\`spotify:album:${id}\``, `spotify\\:album:${id}`, `spotify:album:${id}X`, `spotify:unknown:${id}`, `spotify:album:short`, `notspotify:album:${id}`]) {
    assert.ok(!types(src).includes('link'), src);
    assert.equal(stringify(parse(src)), src);
  }
  const src = `[My mix](spotify:playlist:${id})`;
  assert.equal(tokens(src)[0].text, 'My mix'); assert.equal(stringify(parse(src)), src);
});


test('IMDb and YouTube shortcodes are bounded, source-preserving external references', () => {
  const pairs = [
    ['imdb: tt0133093', 'https://www.imdb.com/title/tt0133093/'],
    ['youtube: dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['youtube:video:dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['youtube:playlist:PL1234567890abcdef', 'https://www.youtube.com/playlist?list=PL1234567890abcdef'],
  ];
  for (const [ref, href] of pairs) {
    assert.equal(mediaURL(ref), href);
    const src = 'Background: ' + ref + '.\n', ast = parse(src);
    assert.equal(stringify(ast), src); assert.deepEqual(ast.diagnostics, []);
    assert.equal(tokens(src).find((t) => t.type === 'link').href, href);
  }
  for (const ref of ['imdb:tt123', 'imdb:tt0133093evil', 'youtube:dQw4w9WgXcQevil', 'youtube:bad', 'imdb:javascript:alert(1)']) {
    assert.equal(mediaURL(ref), null); assert.ok(!types(ref).includes('link'), ref);
  }
  for (const src of ['`imdb:tt0133093`', 'imdb\\:tt0133093', 'notimdb:tt0133093', '```\nyoutube:dQw4w9WgXcQ\n```']) assert.ok(!types(src).includes('link'), src);
  assert.equal(tokens('[Film](imdb:tt0133093)')[0].text, 'Film');
});


test('MusicBrainz identities link to the database and remain source-preserving', () => {
  const uuid = '12345678-1234-4234-8234-123456789abc';
  for (const type of ['recording', 'release', 'release-group', 'work', 'artist']) {
    const ref = `musicbrainz: ${type}:${uuid}`, src = 'Reference: ' + ref;
    assert.equal(mediaURL(ref), `https://musicbrainz.org/${type}/${uuid}`);
    assert.equal(tokens(src).find((t) => t.type === 'link').href, mediaURL(ref));
    assert.equal(stringify(parse(src)), src); assert.deepEqual(parse(src).diagnostics, []);
  }
  for (const ref of ['musicbrainz:recording:bad', `musicbrainz:unknown:${uuid}`, `musicbrainz:recording:${uuid}evil`]) {
    assert.equal(mediaURL(ref), null); assert.ok(!types(ref).includes('link'));
  }
  assert.ok(!types('`musicbrainz:recording:' + uuid + '`').includes('link'));
});
