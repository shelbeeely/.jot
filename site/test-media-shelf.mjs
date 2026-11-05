// The media journal: mentions gathered from prose, kinds, activity words, listening notes, and the downloadable log.
// Run: node --test site/test-media-shelf.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaMentions, mediaShelf, mediaJournal, kindOf } from './dist/media-shelf-core.mjs';
import { parse } from './dist/jot/jot.mjs';

const SOURCE = `Before any date: [The Matrix (1999)](imdb:tt0133093)

### 2026-11-01 | Sun

Want to watch [The Matrix (1999)](imdb:tt0133093). Reading [The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W).

~~~draft
rough: [Not counted](imdb:tt0111161)
~~~

### 2026-11-03 | Tue

- Watched [The Matrix (1999)](imdb:tt0133093) at last
- [Severance S1E3: “In Perpetuity”](https://www.tvmaze.com/episodes/2238340)
- bare imdb:tt0111161 and a [normal link](https://example.com/x)

#### Listening

“Yesterday” — The Beatles

[Open in Spotify](spotify:track:3BQHpFgAp4l80e1XslIjNI)

### 2026-11-04 | Wed

Finished [The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W). Listened to [Radiolab: “Octomom”](https://podcasts.apple.com/podcast/id152249110?i=1000797662464) and [Frieren](https://anilist.co/anime/154587).
`;

test('kinds come from the reference target', () => {
  assert.equal(kindOf('imdb:tt0133093'), 'film'); assert.equal(kindOf('https://www.tvmaze.com/shows/1'), 'tv');
  assert.equal(kindOf('spotify:episode:4rOoJ6Egrf8K2IrywzwOMk'), 'podcast'); assert.equal(kindOf('musicbrainz:recording:x'), 'music');
  assert.equal(kindOf('https://www.wikidata.org/wiki/Q42'), 'game-or-film'); assert.equal(kindOf('https://example.com/'), null);
});

test('mentions: prose in dated entries only, never scratchpads or ordinary links, with activity words', () => {
  const m = mediaMentions(SOURCE);
  assert.ok(m.every(x => x.date), 'writing before the first date is not an entry');
  assert.ok(!m.some(x => x.target === 'imdb:tt0111161' && x.date === '2026-11-01'), 'scratchpad lines are not counted');
  assert.ok(m.some(x => x.target === 'imdb:tt0111161' && x.date === '2026-11-03'), 'bare short references count');
  assert.ok(!m.some(x => x.target.includes('example.com')));
  const matrix = m.filter(x => x.target === 'imdb:tt0133093').map(x => [x.date, x.activity, x.status]);
  assert.deepEqual(matrix, [['2026-11-01', 'Want to watch', 'want'], ['2026-11-03', 'Watched', 'done']]);
  const song = m.find(x => x.kind === 'music');
  assert.equal(song.title, 'Yesterday by The Beatles', 'a listening note names its generic link');
  const pos = m.find(x => x.kind === 'tv').position;
  assert.ok(SOURCE.slice(pos).startsWith('[Severance'), 'positions point at the mention for Open in writing');
});

test('the shelf: one item per title, latest activity, newest first', () => {
  const shelf = mediaShelf(SOURCE);
  const matrix = shelf.find(i => i.target === 'imdb:tt0133093');
  assert.equal(matrix.mentions.length, 2); assert.equal(matrix.status, 'done'); assert.equal(matrix.first, '2026-11-01'); assert.equal(matrix.last, '2026-11-03');
  const book = shelf.find(i => i.kind === 'book');
  assert.equal(book.activity, 'Finished'); assert.equal(book.status, 'done');
  assert.equal(shelf[0].last, '2026-11-04');
  assert.equal(shelf.find(i => i.target === 'imdb:tt0111161').title, 'IMDb tt0111161');
});

test('the media journal is a valid separate .jot, one entry per day, and the journal is unchanged', () => {
  const { text, days, items } = mediaJournal(SOURCE, { name: 'my-journal' });
  assert.equal(days, 3); assert.ok(items >= 7);
  const ast = parse(text);
  assert.deepEqual(ast.entries.map(e => e.date), ['2026-11-01', '2026-11-03', '2026-11-04']);
  assert.ok(!ast.diagnostics.some(d => d.severity === 'error'));
  assert.match(text, /### 2026-11-03 \| Tuesday\n\n- Watched \[The Matrix \(1999\)\]\(imdb:tt0133093\)/);
  assert.match(text, /- Listened to \[Radiolab: “Octomom”\]\(https:\/\/podcasts\.apple\.com\/podcast\/id152249110\?i=1000797662464\)/);
  assert.match(text, /\[Yesterday by The Beatles\]\(spotify:track:3BQHpFgAp4l80e1XslIjNI\)/);
});
