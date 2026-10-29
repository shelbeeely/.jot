// Data exports to Jot (archive.mjs, jot-archive.mjs), on the made-up archives in fixtures/archives. Run: node --test converter/archive-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import '../parser/vendor/jszip.mjs';
import { parse } from '../parser/jot.mjs';
import { readDocument } from '../parser/container.mjs';
import { readArchives, detect, toJot, fromZip, fixMojibake, htmlToText, readCSV, localParts, wallClock } from './archive.mjs';

const DIR = new URL('./fixtures/archives/', import.meta.url).pathname;
const walk = (d, pre = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), pre + e.name + '/') : [pre + e.name]));
const folder = (sub = '') => { const d = path.join(DIR, sub); return { name: sub || 'all', list: () => walk(d), read: async (p) => new Uint8Array(fs.readFileSync(path.join(d, p))) }; };
const TZ = { timeZone: 'Europe/London' };
const journal = async (o = {}) => { const r = await readArchives([folder()], { ...TZ, ...o }); return { r, text: toJot(r.items, { ...TZ, per: 'none', ...o }).files[0].text }; };

test('every service in the samples is recognized, each from its own files', () => {
  const found = detect(['twitter', 'mastodon', 'facebook', 'instagram', 'tumblr', 'tumblr-html', 'reddit', 'takeout'].map(folder));
  assert.deepEqual(found.map((f) => `${f.source}:${f.service}`), ['twitter:twitter', 'mastodon:mastodon', 'facebook:facebook', 'instagram:instagram', 'tumblr:tumblr', 'tumblr-html:tumblr', 'reddit:reddit', 'takeout:keep', 'takeout:blogger']);
  assert.deepEqual(detect([{ name: 'other', list: () => ['notes.txt', 'photo.jpg'] }]), []);
});

test('by default: your own words; no reposts, messages, deleted notes, IP addresses, coordinates or counts', async () => {
  const { r, text } = await journal();
  assert.equal(r.left.reposts, 3, 'a retweet, a boost and a reblog');
  for (const never of ['Their words, not mine', 'Someone else', 'never imported', 'Never imported', 'Private message', '203.0.113.7', '51.5', 'Riverside Park', 'Story from the bus', 'Congratulations!', 'Loved that one', 'updated their profile picture'])
    assert.ok(!text.includes(never), `left out: ${never}`);
  assert.match(text, /^---\nJot: 1\.0\nTitle: My life online\nTimezone: Europe\/London\nPrivacy: private\n/);
  assert.deepEqual(parse(text).diagnostics, [], 'valid Jot');
  assert.deepEqual(r.warnings, ['a post without a readable time was left out'], 'nothing is given a guessed date');
});

test('what each service gives, as Jot', async () => {
  const { text } = await journal();
  assert.match(text, /### 2018-10-10 \| Wednesday\n\n#### 21:19 · X \/ Twitter\n\nFirst frost on the allotment & the kale survived\. https:\/\/example\.org\/frost\n\n\[\[photo in the X \/ Twitter archive: twitter\/data\/tweets_media\/1050000000000000001-photo\.jpg\]\]\n\n#garden\n\n\[Original\]\(https:\/\/x\.com\/sample_writer\/status\/1050000000000000001\)/, 'X: entities, expanded links, media, tags, the original link');
  assert.match(text, /#### 08:05 · X \/ Twitter · a reply to @a_friend/);
  assert.match(text, /\\# not a heading\n\\- not a list either/, 'writing stays writing');
  assert.match(text, /#### 08:00 · Mastodon · \(followers\)\n\n\*\*Content warning:\*\* tiredness\n\nSlept badly again\./, 'Mastodon: audience and content warning');
  assert.match(text, /Second paragraph with a https:\/\/example\.org\/book and #reading/, 'links and hashtags from HTML');
  assert.match(text, /New year\. It’s snowing — café closed, so tea at home ☕/, 'Facebook text repaired');
  assert.match(text, /\*\*A long night\*\*\n\nCouldn't sleep, so I wrote this\.\n\nThen I made toast\.\n\n#insomnia #toast/, 'Tumblr XML');
  assert.match(text, /> Begin anywhere\.\n\n— John Cage/);
  assert.match(text, /#### 21:18 · Tumblr\n\n\*\*Summer list\*\*\n\nSwim, read, nap\.\n\n#summer/, 'Tumblr HTML, at its wall-clock time');
  assert.match(text, /#### 13:34 · Reddit · in r\/gardening\n\n\*\*First frost, now what\?\*\*\n\nMy kale looks fine but the beans, "not so much"\.\nAny tips\?/, 'Reddit CSV with quotes and a newline');
  assert.match(text, /\*\*Groceries\*\*\n\n\[x\] Oats\n\[ \] Lemons\n\n#home/, 'a Keep list becomes tasks');
  assert.match(text, /\*\*Moving house\*\*\n\nBoxes everywhere\.\nThe cat is unimpressed\./, 'Blogger');
  assert.match(text, /\[\[photo in the Instagram archive: instagram\/media\/posts\/202006\/a\.jpg · Plums\]\]/);
});

test('opt-ins: reposts, comments, stories, places; dates; media left out', async () => {
  const { text } = await journal({ reposts: true, comments: true, stories: true, places: true, media: 'none' });
  for (const now of ['RT @someone_else', 'Congratulations!', 'Loved that one', 'Story from the bus', 'At Riverside Park', "Someone else's photo"]) assert.ok(text.includes(now), now);
  assert.match(text, /· Mastodon · shared\n\n\[Original\]\(https:\/\/elsewhere\.example\/@them\/9\)/);
  assert.ok(!text.includes('[[photo') && !text.includes('51.5'), 'media none; still no coordinates');
  const { r } = await journal({ from: '2018-01-01', to: '2019-12-31' });
  assert.deepEqual([...new Set(r.items.map((i) => i.service))].sort(), ['reddit', 'twitter']);
});

test('dates follow the chosen time zone; the same archive twice is read once; files split by year', async () => {
  assert.deepEqual(localParts(Date.UTC(2018, 9, 11, 3, 30), 'America/New_York'), { date: '2018-10-10', time: '23:30', weekday: 'Wednesday' });
  assert.equal(new Date(wallClock('November 3rd, 2014 9:18pm', 'America/New_York')).toISOString(), '2014-11-04T02:18:00.000Z');
  assert.equal(new Date(wallClock('July 4, 2014 9:18am', 'America/New_York')).toISOString(), '2014-07-04T13:18:00.000Z', 'summer time');
  const once = (await readArchives([folder()], TZ)).items.length, twice = (await readArchives([folder(), folder()], TZ)).items.length;
  assert.equal(twice, once);
  const { files } = toJot((await readArchives([folder()], TZ)).items, TZ);
  assert.deepEqual(files.map((f) => f.name), ['2009', '2010', '2012', '2013', '2018', '2019', '2020', '2023'].map((y) => `life-online-${y}.jot`));
  assert.match(files[0].text, /Title: My life online · 2009/);
});

test('helpers: Meta text repair, HTML to lines, CSV', () => {
  assert.equal(fixMojibake('Itâ\u0080\u0099s'), 'It’s'); assert.equal(fixMojibake('plain'), 'plain'); assert.equal(fixMojibake('café'), 'café', 'real Latin-1 left alone');
  assert.equal(htmlToText('<p>One<br>two</p><ul><li>a</li><li>b</li></ul><p>A <a href="https://e.org/x">link</a> &amp; <a href="javascript:x">no</a></p>'), 'One\ntwo\n\n- a\n- b\n\nA [link](https://e.org/x) & no');
  assert.deepEqual(readCSV('a,b\n"x, ""y""","line\nbreak"\n'), [{ a: 'x, "y"', b: 'line\nbreak' }]);
});

test('ZIPs, including a ZIP inside a ZIP (as Tumblr exports)', async () => {
  const inner = new globalThis.JSZip(); inner.file('posts.xml', fs.readFileSync(path.join(DIR, 'tumblr/posts.xml')));
  const outer = new globalThis.JSZip(); outer.file('posts.zip', await inner.generateAsync({ type: 'uint8array' }));
  const src = await fromZip(globalThis.JSZip, 'tumblr.zip', await outer.generateAsync({ type: 'uint8array' }));
  assert.ok(src.list().includes('posts.xml'));
  assert.equal((await readArchives([src], TZ)).items.length, 2);
});

const CLI = new URL('./jot-archive.mjs', import.meta.url).pathname;
const run = (args) => new Promise((resolve) => execFile(process.execPath, [CLI, ...args], (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
test('the command line: --list, a journal a year, photos packed into a .jotz, never over existing files', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-archive-'));
  const l = await run([path.join(DIR, 'twitter'), path.join(DIR, 'takeout'), '--list']);
  assert.equal(l.stdout, `${path.join(DIR, 'twitter')}: X / Twitter\n${path.join(DIR, 'takeout')}: Google Keep, Blogger\n`);
  const w = await run([DIR, '--out-dir', out, '--time-zone', 'Europe/London']);
  assert.equal(w.code, 0, w.stderr); assert.match(w.stderr, /Found: X \/ Twitter \(4\)[\s\S]*Wrote 8 files[\s\S]*Left out: 3 reposts \(add --reposts\)[\s\S]*Privacy: private/);
  for (const f of fs.readdirSync(out)) assert.deepEqual(parse(fs.readFileSync(path.join(out, f), 'utf8')).diagnostics, [], f);
  assert.match((await run([DIR, '--out-dir', out])).stderr, /already there/);
  const packed = path.join(out, 'packed'), p = await run([DIR, '--out-dir', packed, '--media', 'attach', '--per', 'none', '-q', '--time-zone', 'Europe/London']);
  assert.equal(p.code, 0, p.stderr);
  const doc = await readDocument(new Uint8Array(fs.readFileSync(path.join(packed, 'life-online.jotz'))));
  assert.deepEqual(doc.assets.map((a) => a.path).sort(), ['assets/facebook/snow.jpg', 'assets/instagram/a.jpg', 'assets/instagram/b.jpg', 'assets/instagram/beach.jpg', 'assets/mastodon/sofa.png', 'assets/twitter/1050000000000000001-photo.jpg']);
  assert.match(doc.source, /!\[Plums\]\(assets\/instagram\/a\.jpg\)/); assert.deepEqual(parse(doc.source).diagnostics, []);
  assert.match((await run([DIR, '--per', 'week', '--out-dir', out])).stderr, /--per is year, month or none/);
});
