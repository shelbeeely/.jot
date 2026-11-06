// Book covers (book-covers.mjs) against saved real Open Library replies (site/fixtures/covers/): what is sent, what comes back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findCovers, downloadCover, coverTarget } from './dist/book-covers.mjs';

const read = (name) => fs.readFileSync(new URL(`./fixtures/covers/${name}`, import.meta.url));
function recorder() {
  const sent = [];
  const fetcher = async (url, init = {}) => {
    sent.push(url); assert.equal(init.credentials, 'omit');
    if (url === 'https://openlibrary.org/works/OL66554W.json') return new Response(read('work-OL66554W.json'), { status: 200 });
    if (url === 'https://openlibrary.org/books/OL7353617M.json') return new Response(read('edition-OL7353617M.json'), { status: 200 });
    if (/^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-L\.jpg$/.test(url)) return new Response(read('cover-small.jpg'), { status: 200 });
    return new Response('{}', { status: 404 });
  };
  return { sent, fetcher };
}

test('references that can be looked up: Open Library works and editions, and ISBNs', () => {
  assert.deepEqual(coverTarget('https://openlibrary.org/works/OL66554W'), { work: 'OL66554W' });
  assert.deepEqual(coverTarget('https://openlibrary.org/works/OL66554W/Pride_and_Prejudice'), { work: 'OL66554W' });
  assert.deepEqual(coverTarget('https://openlibrary.org/books/OL7353617M'), { edition: 'OL7353617M' });
  assert.deepEqual(coverTarget('isbn:978-0-14-143951-8'), { isbn: '9780141439518' });
  assert.equal(coverTarget('imdb:tt0133093'), null); assert.equal(coverTarget('Reading Pride and Prejudice'), null);
});
test('a work: only its identifier goes out; its covers come back, the -1 placeholders left out', async () => {
  const { sent, fetcher } = recorder(), found = await findCovers('https://openlibrary.org/works/OL66554W', { fetcher });
  assert.equal(found.title, 'Pride and Prejudice'); assert.deepEqual(sent, ['https://openlibrary.org/works/OL66554W.json']);
  const listed = JSON.parse(read('work-OL66554W.json')).covers.filter((c) => c > 0);
  assert.deepEqual(found.covers.map((c) => c.id), listed.slice(0, 12));
  assert.equal(found.covers[0].thumb, `https://covers.openlibrary.org/b/id/${listed[0]}-M.jpg`);
  const edition = await findCovers('https://openlibrary.org/books/OL7353617M', { fetcher });
  assert.ok(edition.covers.every((c) => c.id > 0), 'an edition list with -1 keeps only real covers');
});
test('downloading a chosen cover: only a real cover id, only JPEG or PNG', async () => {
  const { fetcher } = recorder(), got = await downloadCover({ id: 14348537 }, { fetcher });
  assert.equal(got.mediaType, 'image/jpeg'); assert.ok(got.bytes.length > 100);
  await assert.rejects(downloadCover({ id: -1 }, { fetcher }), /not an Open Library cover/);
  await assert.rejects(downloadCover({ id: 5 }, { fetcher: async () => new Response('<html>', { status: 200 }) }), /not a JPEG or PNG/);
  await assert.rejects(findCovers('https://openlibrary.org/works/OL1W', { fetcher }), /HTTP 404/);
});
