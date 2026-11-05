// Add media: catalog parsers (saved real responses), references, pasted links, journal matches and the client's boundaries.
// Run: node --test site/test-media-catalog.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseWikidata, parseTVmazeShows, parseTVmazeEpisodes, parseOpenLibrary, parseAniList, parseApplePodcasts, parseAppleEpisodes, parseMusicBrainz, mediaReference, escapeLabel, recognizeLink, journalMatches, createMediaCatalog, HOSTS } from './dist/media-catalog.mjs';
import { parse } from './dist/jot/jot.mjs';

const fixture = name => JSON.parse(fs.readFileSync(new URL('./fixtures/media/' + name + '.json', import.meta.url), 'utf8'));
const links = text => parse(text).nodes.flatMap(n => JSON.stringify(n.markdown || {}).match(/"href":"[^"]+"/g) || []);

test('films: Wikidata titles with year, linked by IMDb ID when there is one', () => {
  const [matrix, reloaded] = parseWikidata(fixture('wikidata-search'), fixture('wikidata-entities'), 'film');
  assert.equal(matrix.label, 'The Matrix (1999)'); assert.equal(matrix.reference, 'imdb:tt0133093');
  assert.equal(reloaded.reference, 'https://www.wikidata.org/wiki/Q189600');
  assert.equal(mediaReference(matrix, 'Watched'), 'Watched [The Matrix (1999)](imdb:tt0133093)');
});

test('TV: series from TVmaze, then its episodes with season and episode', () => {
  const shows = parseTVmazeShows(fixture('tvmaze-search'));
  assert.equal(shows[0].title, 'Severance'); assert.equal(shows[0].year, '2022'); assert.equal(shows[0].hasChildren, true);
  const episodes = parseTVmazeEpisodes(fixture('tvmaze-episodes'), shows[0]);
  assert.equal(episodes[0].label, 'Severance S1E1: “Good News About Hell”');
  assert.equal(episodes[0].reference, 'https://www.tvmaze.com/episodes/2238231');
});

test('books, anime and podcasts', () => {
  const book = parseOpenLibrary(fixture('openlibrary-search'))[0];
  assert.equal(book.label, 'The Left Hand of Darkness by Ursula K. Le Guin (1969)'); assert.equal(book.reference, 'https://openlibrary.org/works/OL59800W');
  const anime = parseAniList(fixture('anilist-search'), 'anime')[0];
  assert.equal(anime.title, 'Frieren: Beyond Journey’s End'); assert.equal(anime.reference, 'https://anilist.co/anime/154587'); assert.match(anime.detail, /28 episodes/);
  const show = parseApplePodcasts(fixture('itunes-podcasts'))[0];
  assert.equal(show.title, 'Radiolab'); assert.equal(show.reference, 'https://podcasts.apple.com/podcast/id152249110');
  const episode = parseAppleEpisodes(fixture('itunes-episodes'), show)[0];
  assert.match(episode.label, /^Radiolab: “.+”$/); assert.match(episode.reference, /^https:\/\/podcasts\.apple\.com\/podcast\/id152249110\?i=\d+$/);
});

test('music from MusicBrainz uses the existing short reference', () => {
  const [song] = parseMusicBrainz({ recordings: [{ id: 'B1A9C0E9-D987-4042-AE91-78D6A3267D69', title: 'Yesterday', 'artist-credit': [{ name: 'The Beatles' }], 'first-release-date': '1965-08-06' }] }, 'recording');
  assert.equal(song.reference, 'musicbrainz:recording:b1a9c0e9-d987-4042-ae91-78d6a3267d69'); assert.equal(song.label, 'Yesterday by The Beatles (1965)');
});

test('references are safe, readable links that Jot parses', () => {
  assert.equal(escapeLabel('A [bracket] *star* and `code`'), 'A \\[bracket\\] \\*star\\* and \\`code\\`');
  const text = mediaReference({ label: 'Evil ](javascript:alert(1)) [x', reference: 'https://www.tvmaze.com/shows/1' });
  assert.equal(links(text).length, 1); assert.ok(links(text)[0].includes('https://www.tvmaze.com/shows/1'));
  assert.throws(() => mediaReference({ label: 'x', reference: 'https://a.example/with space' }));
  for (const ref of ['imdb:tt0133093', 'musicbrainz:recording:b1a9c0e9-d987-4042-ae91-78d6a3267d69']) assert.ok(links('[x](' + ref + ')').length === 1, ref);
});

test('pasted links from known catalogs are recognised; others stay ordinary links', () => {
  assert.deepEqual(recognizeLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(recognizeLink('https://youtu.be/dQw4w9WgXcQ'), { provider: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(recognizeLink('https://open.spotify.com/intl-de/album/4aawyAB9vmqN3uQ7FjRGTy?si=x'), { provider: 'spotify', type: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' });
  assert.deepEqual(recognizeLink('https://www.imdb.com/title/tt0133093/?ref_=x'), { provider: 'imdb', id: 'tt0133093' });
  assert.deepEqual(recognizeLink('https://www.tvmaze.com/episodes/2238231/severance-1x01'), { provider: 'tvmaze', type: 'episode', id: '2238231' });
  assert.deepEqual(recognizeLink('https://podcasts.apple.com/us/podcast/radiolab/id152249110?i=1000798906962'), { provider: 'apple', id: '152249110', episode: '1000798906962' });
  assert.deepEqual(recognizeLink('https://openlibrary.org/works/OL59800W/The_Left_Hand'), { provider: 'openlibrary', id: 'OL59800W' });
  assert.deepEqual(recognizeLink('https://anilist.co/anime/154587/Frieren/'), { provider: 'anilist', type: 'anime', id: '154587' });
  for (const other of ['https://example.com/watch?v=dQw4w9WgXcQ', 'http://www.imdb.com/title/tt0133093/', 'javascript:alert(1)', 'not a link']) assert.equal(recognizeLink(other), null, other);
});

test('matches already in this journal come first and need no network', () => {
  const source = 'Watched [The Matrix (1999)](imdb:tt0133093) again.\nRead [The Left Hand of Darkness by Ursula K. Le Guin](https://openlibrary.org/works/OL59800W).\n[Matrix fan site](https://example.com/matrix)';
  const found = journalMatches(source, 'matrix');
  assert.deepEqual(found.map(f => f.reference), ['imdb:tt0133093']);
  assert.equal(journalMatches(source, 'x').length, 0, 'too short');
});

test('the client sends only the typed words to fixed hosts, without credentials or referrer, and spaces requests', async () => {
  const calls = []; let clock = 0;
  const catalog = createMediaCatalog({ now: () => clock, fetchImpl: async (url, options) => { calls.push({ url, options }); clock += 1000; return { ok: true, status: 200, json: async () => fixture('tvmaze-search') }; } });
  const shows = await catalog.search({ kind: 'tv', query: '  severance  ' });
  assert.equal(shows[0].title, 'Severance');
  assert.equal(calls[0].url, 'https://api.tvmaze.com/search/shows?q=severance');
  assert.equal(calls[0].options.credentials, 'omit'); assert.equal(calls[0].options.referrerPolicy, 'no-referrer');
  await catalog.search({ kind: 'tv', query: 'severance' }); assert.equal(calls.length, 1, 'cached');
  assert.deepEqual(await catalog.search({ kind: 'tv', query: 'a' }), [], 'too short to search');
  for (const call of calls) assert.ok(HOSTS.some(h => call.url.startsWith(h + '/')));
  assert.equal(await catalog.resolve({ text: 'https://example.com/x' }), null, 'unknown links are not fetched');
  assert.equal(calls.length, 1);
});

test('busy and failing catalogs give plain messages', async () => {
  const busy = createMediaCatalog({ fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  await assert.rejects(busy.search({ kind: 'book', query: 'dune' }), /Open Library is busy/);
  const down = createMediaCatalog({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(down.search({ kind: 'anime', query: 'frieren' }), /AniList could not be reached/);
});

test('an IMDb link still becomes an imdb: reference when Wikidata is busy', async () => {
  const busy = createMediaCatalog({ fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  const [item] = await busy.resolve({ text: 'https://www.imdb.com/title/tt0133093/' });
  assert.equal(item.reference, 'imdb:tt0133093'); assert.equal(mediaReference(item), '[IMDb title](imdb:tt0133093)');
});
