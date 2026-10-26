// Jot pages test: .jot writing (InkDeck notes and any other Jot v1 document, plain or ZIP-packaged) printed after its week.
// Proves (1) a book with no .jot files is the book it always was, (2) entries are found by dated heading, Date: line or file name, and
// undated ones are named and left out, (3) nothing in a .jot runs: raw HTML prints as text, (4) long writing is cut into pages that fit
// (paragraphs, code, lists and tables; large print too), and (5) a real build: render.mjs, check.mjs ("[] 0"), no Type 3 fonts.
//   node test-jots.mjs        (about a minute: five book builds, into out/jots-test/)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parse } from '../parser/jot.mjs';
import { jotEntries, entryPages, entryIds, JOT_FIT } from './jotpage.mjs';
import { loadJots } from './jots.mjs';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jots-'));
const SAMPLE = new URL('./jots-sample', import.meta.url).pathname;

// ---- 2. finding entries ----
{
  const e = jotEntries(parse('---\nJot: 1.0\nTitle: Notes\nTags: a, #b\n---\n\n### 2026-10-05 | Monday\n\nOne.\n\n### 2026-10-05\n\nTwo.\n'), 'x.jot');
  ok(e.length === 2 && e.every((x) => x.date === '2026-10-05') && e[0].title === 'Notes' && e[0].tags.join() === 'a,b', 'dated headings make entries; a repeated date stays two entries; Title and Tags come from the metadata');
  const f = jotEntries(parse('Just writing.\n'), '/card/notes/2026-10-09.jot');
  ok(f.length === 1 && f[0].date === '2026-10-09' && f[0].title === '2026-10-09', 'a document with no dated heading takes its date from the file name');
  const g = jotEntries(parse('---\nDate: 2026-10-11\n---\n\nText\n'), 'note.jot');
  ok(g[0].date === '2026-10-11', 'or from a Date: line');
  ok(jotEntries(parse('Nothing to date this by.\n'), 'thoughts.jot')[0].date === null, 'otherwise it is undated');
  const J = await loadJots([SAMPLE]);
  ok(J.entries.some((x) => x.date === '2026-10-25' && /packaged/.test(x.file)), 'a packaged .jotz is read through the container');
  ok(J.entries.filter((x) => !x.date).length === 1, 'the undated sample is found (and the build leaves it out)');
  ok(J.entries.filter((x) => x.date).every((x, i, a) => !i || a[i - 1].date <= x.date), 'entries are oldest first');
  const ids = entryIds(J.entries.filter((x) => x.date)), more = entryIds([{ date: '2026-10-01', file: 'a-new-note.jot' }, ...J.entries.filter((x) => x.date)]).slice(1);
  ok(new Set(ids).size === ids.length && JSON.stringify(ids) === JSON.stringify(more) && ids.includes('jot.2026-10-06.2026-10-06') && ids.includes('jot.2026-10-14.ideas'), 'page ids come from date and file name: a new .jot file renumbers nothing');
}

// ---- 3. nothing runs ----
{
  const [e] = jotEntries(parse('### 2026-10-05\n\n<script>alert(1)</script>\n\nA <b>tag</b> and ![pic](assets/p.png) and [a link](https://example.com).\n'), 'x.jot');
  const html = entryPages(e).map((p) => p.html).join('');
  ok(!/<script|<b>tag/.test(html) && /&lt;script&gt;/.test(html) && /&lt;b&gt;tag/.test(html), 'raw HTML prints as text');
  ok(!/href=|<img/.test(html) && /\[image: pic\]/.test(html) && /a link/.test(html), 'links print their words, images a placeholder; nothing is fetched');
  ok(/data-zone="date"[^]*2026-10-05/.test(html) && /data-zone="jot"/.test(html), 'the page has the fixed header and its own scan zone');
}

// ---- 4. long writing ----
const para = 'The kettle, the window, the list that keeps growing and then shrinking once the first thing is done. ';
const stress = [
  '---', 'Jot: 1.0', 'Title: Stress', 'Tags: long', '---', '', '### 2026-10-08 | Thursday', '',
  (para.repeat(70)).trim(), '', '```', ...Array.from({ length: 80 }, (_, i) => `line ${i + 1} of the code block`), '```', '',
  ...Array.from({ length: 45 }, (_, i) => `- [${i % 3 ? ' ' : 'x'}] item ${i + 1}: ${para.slice(0, 40 + (i % 5) * 20)}`), '',
  '1. one', '2. two', '',
  '| When | What |', '| --- | --- |', ...Array.from({ length: 50 }, (_, i) => `| ${i}:00 | ${para.slice(0, 30)} |`), '',
  'Lonely word: ' + 'x'.repeat(300), '',
].join('\n') + '\n';
{
  const [e] = jotEntries(parse(stress), 'stress.jot');
  const pages = entryPages(e);
  ok(pages.length >= 8 && pages.every((p, i) => p.part === i + 1 && p.of === pages.length), `long writing is cut into ${pages.length} numbered pages`);
  ok(pages.filter((p) => /<table>/.test(p.html)).every((p) => /<th>When<\/th>/.test(p.html)), 'a cut table repeats its header row');
  ok(entryPages(e, { large: true }).length > pages.length && JOT_FIT.lines > 0, 'large print takes more pages');
  fs.mkdirSync(path.join(TMP, 'jots'));
  fs.writeFileSync(path.join(TMP, 'jots', 'stress.jot'), stress);
  fs.cpSync(SAMPLE, path.join(TMP, 'jots', 'sample'), { recursive: true });
}

// ---- 1 + 5. real builds ----
const OUTS = 'out/jots-test'; // KW_OUT is relative to journal/ (render.mjs)
fs.rmSync(OUTS, { recursive: true, force: true });
const build = (env, size = 'small') => {
  const r = spawnSync('node', ['render.mjs', 'month', '2026-10', 'test.ics'], { env: { ...process.env, SIZE: size, ...env }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r;
};
const dirOf = (out, size) => path.join(out, size === 'letter' ? 'm2026-10-letter' : 'm2026-10');
const layout = (out, size = 'small') => JSON.parse(fs.readFileSync(path.join(dirOf(out, size), 'layout.json'), 'utf8')).pages;
{
  const none = `${OUTS}/none`, empty = path.join(TMP, 'empty');
  fs.mkdirSync(empty);
  build({ KW_OUT: none, KW_JOTS: path.join(TMP, 'does-not-exist') });
  const a = layout(none);
  ok(!a.some((p) => p.type === 'jot'), 'no .jot files: no Jot pages');
  build({ KW_OUT: `${OUTS}/empty`, KW_JOTS: empty });
  ok(JSON.stringify(layout(`${OUTS}/empty`).map((p) => p.id)) === JSON.stringify(a.map((p) => p.id)), 'an empty folder builds the same pages');
  ok(fs.readFileSync(path.join(dirOf(none, 'small'), 'journal.html'), 'utf8') === fs.readFileSync(path.join(dirOf(`${OUTS}/empty`, 'small'), 'journal.html'), 'utf8'), 'and byte-identical HTML');
}
for (const size of ['small', 'letter']) {
  const out = `${OUTS}/with-${size}`;
  const r = build({ KW_OUT: out, KW_JOTS: path.join(TMP, 'jots') }, size);
  ok(/1 entry has no date/.test(r.stderr), `${size}: the build names the undated entry`);
  const L = layout(out, size), jots = L.filter((p) => p.type === 'jot');
  ok(jots.length >= 15, `${size}: ${jots.length} Jot pages`);
  ok(new Set(L.map((p) => p.id)).size === L.length, `${size}: every page id is unique`);
  const lastDay = (d) => Math.max(...L.filter((p) => p.type === 'dayp' && p.date <= d).map((p) => p.page));
  ok(jots.every((p) => p.page > lastDay(p.date)), `${size}: each Jot page comes after its day's page (after the week's day pages)`);
  const chk = execFileSync('node', ['check.mjs', path.basename(dirOf(out, size))], { env: { ...process.env, KW_OUT: out } }).toString().trim().split('\n').pop();
  ok(chk === '[] 0', `${size}: every page fits (check.mjs ${chk})`);
  const pdf = fs.readdirSync(dirOf(out, size)).find((f) => /interior.*\.pdf$/.test(f));
  const fonts = execFileSync('pdffonts', [path.join(dirOf(out, size), pdf)]).toString();
  ok(!/Type 3/.test(fonts), `${size}: no Type 3 fonts`);
}
{
  const out = `${OUTS}/large`, prof = JSON.parse(fs.readFileSync(new URL('./content/profile.json', import.meta.url), 'utf8'));
  prof.print = { ...(prof.print || {}), large_print: true };
  fs.writeFileSync(path.join(TMP, 'large.json'), JSON.stringify(prof));
  build({ KW_OUT: out, KW_JOTS: path.join(TMP, 'jots'), KW_PROFILE: path.join(TMP, 'large.json') });
  const chk = execFileSync('node', ['check.mjs', 'm2026-10'], { env: { ...process.env, KW_OUT: out, KW_PROFILE: path.join(TMP, 'large.json') } }).toString().trim().split('\n').pop();
  ok(chk === '[] 0', `large print: every Jot page fits (check.mjs ${chk})`);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${n} checks passed`);
