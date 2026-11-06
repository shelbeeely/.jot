// TMDb stills (tmdb-stills.mjs) against saved real replies (site/fixtures/tmdb/): what is sent, how the token travels, what comes back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findStills, downloadStill, stillsTarget, TMDB_HOSTS } from './dist/tmdb-stills.mjs';

const dir = new URL('./fixtures/tmdb/', import.meta.url), read = (name) => fs.readFileSync(new URL(name, dir), 'utf8');
const ROUTES = [
  [/^https:\/\/api\.themoviedb\.org\/3\/find\/tt0133093\?external_source=imdb_id/, 'find-tt0133093.json'],
  [/^https:\/\/api\.themoviedb\.org\/3\/movie\/603\/images/, 'movie-603-images.json'],
  [/^https:\/\/api\.themoviedb\.org\/3\/find\/tt11280740\?external_source=imdb_id/, 'find-tt11280740.json'],
  [/^https:\/\/api\.themoviedb\.org\/3\/tv\/95396\/season\/1\/episode\/1\/images/, 'tv-95396-s1e1-images.json'],
  [/^https:\/\/api\.themoviedb\.org\/3\/tv\/95396\/images/, 'tv-95396-images.json'],
  [/^https:\/\/api\.tvmaze\.com\/shows\/44933$/, 'tvmaze-show-44933.json'],
  [/^https:\/\/api\.tvmaze\.com\/episodes\/2238231\?embed=show$/, 'tvmaze-episode-2238231.json'],
];
function recorder() {
  const sent = [];
  const fetcher = async (url, init = {}) => {
    sent.push({ url, init });
    assert.ok(TMDB_HOSTS.some((h) => url.startsWith(h + '/')), `only the fixed hosts: ${url}`); assert.equal(init.credentials, 'omit');
    const route = ROUTES.find(([re]) => re.test(url)); if (!route) return new Response('{}', { status: 404 });
    return new Response(read(route[1]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { sent, fetcher };
}
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.test-token.signature', KEY = '0123456789abcdef0123456789abcdef';

test('references that can be looked up: IMDb titles and TVmaze shows and episodes', () => {
  assert.deepEqual(stillsTarget('imdb:tt0133093'), { imdb: 'tt0133093' });
  assert.deepEqual(stillsTarget('https://www.tvmaze.com/shows/44933/severance'), { tvmazeShow: '44933' });
  assert.deepEqual(stillsTarget('https://www.tvmaze.com/episodes/2238231/severance-1x01-good-news-about-hell'), { tvmazeEpisode: '2238231' });
  assert.equal(stillsTarget('https://openlibrary.org/works/OL66554W'), null); assert.equal(stillsTarget('Watched The Matrix'), null);
});
test('a film: found by its IMDb id with the read access token in the header, backdrops as stills', async () => {
  const { sent, fetcher } = recorder(), found = await findStills('imdb:tt0133093', { token: TOKEN, fetcher });
  assert.equal(found.title, 'The Matrix'); assert.equal(found.kind, 'movie'); assert.equal(found.stills.length, 24);
  assert.match(found.stills[0].thumb, /^https:\/\/image\.tmdb\.org\/t\/p\/w300\/[A-Za-z0-9_-]+\.jpg$/); assert.match(found.stills[0].full, /\/w780\//);
  assert.ok(sent.every((s) => s.init.headers?.Authorization === `Bearer ${TOKEN}` && !s.url.includes('api_key')));
  assert.deepEqual(sent.map((s) => new URL(s.url).pathname), ['/3/find/tt0133093', '/3/movie/603/images'], 'only the id goes out');
});
test('an episode: TVmaze gives the IMDb id, episode stills come first, then the show; the short API key goes in the query', async () => {
  const { sent, fetcher } = recorder(), found = await findStills('https://www.tvmaze.com/episodes/2238231/severance-1x01-good-news-about-hell', { token: KEY, fetcher });
  assert.equal(found.title, 'Severance S1E1'); assert.equal(found.kind, 'episode');
  const episode = JSON.parse(read('tv-95396-s1e1-images.json')).stills.map((s) => s.file_path);
  assert.deepEqual(found.stills.slice(0, episode.length).map((s) => s.path), episode); assert.equal(new Set(found.stills.map((s) => s.path)).size, found.stills.length);
  const tmdb = sent.filter((s) => s.url.startsWith('https://api.themoviedb.org'));
  assert.ok(tmdb.every((s) => new URL(s.url).searchParams.get('api_key') === KEY && !s.init.headers.Authorization));
  assert.equal(sent.find((s) => s.url.startsWith('https://api.tvmaze.com')).init.headers, undefined, 'TVmaze never sees the token');
});
test('a show, and refusals: no token, a strange token, an unknown title, a path that is not a still', async () => {
  const { fetcher } = recorder();
  assert.equal((await findStills('https://www.tvmaze.com/shows/44933/severance', { token: TOKEN, fetcher })).kind, 'tv');
  await assert.rejects(findStills('imdb:tt0133093', { token: '', fetcher }), /token is needed/);
  await assert.rejects(findStills('imdb:tt0133093', { token: 'not a token!', fetcher }), /does not look like/);
  await assert.rejects(findStills('imdb:tt9999999', { token: TOKEN, fetcher }), /HTTP 404/);
  const unauthorized = async () => new Response('{}', { status: 401 });
  await assert.rejects(findStills('imdb:tt0133093', { token: TOKEN, fetcher: unauthorized }), /did not accept that token/);
  await assert.rejects(downloadStill({ path: '/../../etc/passwd' }, { fetcher }), /not a TMDb still/);
});
test('downloading a chosen still: only from the image host, only JPEG or PNG', async () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const fetcher = async (url) => { assert.match(url, /^https:\/\/image\.tmdb\.org\/t\/p\/w780\/abc123\.jpg$/); return new Response(jpeg, { status: 200 }); };
  assert.deepEqual(await downloadStill({ path: '/abc123.jpg' }, { fetcher }), { bytes: jpeg, mediaType: 'image/jpeg' });
  await assert.rejects(downloadStill({ path: '/abc123.jpg' }, { fetcher: async () => new Response('<html>', { status: 200 }) }), /not a JPEG or PNG/);
});
