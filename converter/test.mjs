// The diary converter on short public-domain excerpts (fixtures/README.md says where each comes from).
//   node --test converter/test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { convert, julianToGregorian, stripGutenberg, MAX_FILE_BYTES } from './convert.mjs';
import { parse } from '../parser/jot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fixture = (f) => fs.readFileSync(path.join(HERE, 'fixtures', f), 'utf8');
const headings = (text) => text.split('\n').filter((l) => /^#{2,3} /.test(l));
const clean = (text) => { const ast = parse(text); assert.deepEqual(ast.diagnostics.filter((d) => d.severity !== 'info'), [], 'the output is valid Jot'); return ast; };

test('Julian to Gregorian: 10 days in the 1600s, 11 after 1700, none at the start of the era', () => {
  assert.deepEqual(julianToGregorian(1660, 0, 1), [1660, 0, 11]);
  assert.deepEqual(julianToGregorian(1752, 8, 2), [1752, 8, 13]); // Britain's switch: 2 September (Old Style) was followed by 14 September
  assert.deepEqual(julianToGregorian(1600, 1, 29), [1600, 2, 10]);
  assert.deepEqual(julianToGregorian(200, 2, 1), [200, 2, 1]);
});

test('Pepys: Old Style dates, a dual-year heading, day-only entries and editor notes', () => {
  const r = convert(fixture('pepys-1660.txt'), { calendar: 'julian' });
  const t = r.files[0].text;
  clean(t);
  assert.deepEqual(headings(t), [
    '## JANUARY 1659-1660',
    '### 1660-01-11 | Jan. 1st (Lord’s day) (1660-01-01 Old Style)',
    '### 1660-01-12 | 2nd (1660-01-02 Old Style)',
    '### 1660-01-13 | 3rd (1660-01-03 Old Style)',
    '### 1660-01-14 | 4th (1660-01-04 Old Style)',
    '### 1660-01-15 | 5th (1660-01-05 Old Style)',
  ]);
  assert.match(t, /^Calendar: julian/m);
  assert.ok(r.stats.notes >= 5 && /^\[\[The year did not legally begin/m.test(t), 'bracketed notes become margin notes');
  assert.deepEqual(r.stats.weekday, { mentioned: 1, asWritten: 0, julian: 1 }); // 1 January 1660 (Old Style) was a Sunday
  assert.equal(r.warnings.length, 0);
  // read as written, the weekday disagrees and the converter says which calendar fits (once there are enough weekdays to judge)
  const asWritten = convert(fixture('pepys-1660.txt'));
  assert.equal(headings(asWritten.files[0].text)[1], '### 1660-01-01 | Jan. 1st (Lord’s day)');
  // keep and drop
  assert.ok(!/^\[\[/m.test(convert(fixture('pepys-1660.txt'), { notes: 'keep' }).files[0].text));
  assert.ok(!/legally begin/.test(convert(fixture('pepys-1660.txt'), { notes: 'drop' }).files[0].text));
});

test('Diary of a Nobody: no year in the text, "APRIL 3.—" dates, a weekday after the date', () => {
  const none = convert(fixture('nobody-april.txt'));
  assert.equal(none.stats.entries, 0);
  assert.ok(none.warnings.some((w) => /--year/.test(w)));
  const t = convert(fixture('nobody-april.txt'), { year: 1888 }).files[0].text;
  clean(t);
  assert.deepEqual(headings(t), ['### 1888-04-03 | APRIL 3', '### 1888-04-04 | APRIL 4', '### 1888-04-05 | APRIL 5', '### 1888-04-06 | APRIL 6',
    '### 1888-04-07 | APRIL 7', '### 1888-04-08 | APRIL 8, Sunday']);
  assert.match(t, /^### 1888-04-03 \| APRIL 3\n\nTradesmen called for custom/m, 'the text after the dash starts the entry');
});

test('Diary of a Nobody: December, then January, is the next year', () => {
  const r = convert(fixture('nobody-new-year.txt'), { year: 1888 });
  clean(r.files[0].text);
  assert.deepEqual(headings(r.files[0].text).filter((h) => h.startsWith('###')).map((h) => h.slice(4, 14)), ['1888-12-30', '1888-12-31', '1889-01-01', '1889-01-02']);
  assert.deepEqual(r.stats.weekday, { mentioned: 1, asWritten: 1, julian: 0 });
});

test('Blunt: the year comes from a chapter heading; quoted, italic dates inside a narrative', () => {
  const t = convert(fixture('blunt-1901.txt')).files[0].text;
  clean(t);
  assert.deepEqual(headings(t), ['## DEATH OF QUEEN VICTORIA, 1901', '### 1901-01-23 | 23 Jan., 1901', '### 1901-02-03 | 3rd Feb', '### 1901-02-06 | 6th Feb']);
  assert.match(t, /^### 1901-02-03 \| 3rd Feb\n\n“The Prince of Wales/m, 'the opening quote mark stays with the text');
  assert.match(t, /^Such is almost the first entry/m, 'the narrative between entries is kept, in the entry before it');
});

test('Blunt: a stated year moves the diary on, even backwards in the months', () => {
  const unknown = convert(fixture('blunt-1914.txt'));
  assert.deepEqual(headings(unknown.files[0].text).map((h) => h.slice(4, 14)), ['1914-03-28', '1914-03-31', '1914-04-05']);
  assert.equal(unknown.stats.undatedCandidates, 1, '11th June, before any year is known, stays text');
  const t = convert(fixture('blunt-1914.txt'), { year: 1913 }).files[0].text;
  clean(t);
  assert.deepEqual(headings(t).map((h) => h.slice(4, 14)), ['1913-06-11', '1914-03-28', '1914-03-31', '1914-04-05']);
});

test('lines that would read as Jot marks stay writing', () => {
  const t = convert('JANUARY 1888\n\nJan. 1st. A day.\n\no dear me, what a day\n[ ] not a task\n# not a heading\n1660. A year\n---\n    indented, not code\n:::record x\n\n[Editor: a note]] with brackets]\n').files[0].text;
  const ast = clean(t);
  assert.ok(/^\\o dear me/m.test(t) && /^\\\[ \] not a task/m.test(t) && /^\\# not a heading/m.test(t) && /^1660\\\. A year/m.test(t));
  assert.ok(/^\\---/m.test(t) && /^indented, not code/m.test(t) && /^\\:::record x/m.test(t));
  assert.ok(/^\[\[Editor: a note\] \] with brackets\]\]$/m.test(t), 'a note never closes early');
  const json = JSON.stringify(ast);
  for (const kind of ['"task"', '"event"', '"record"', '"code"']) assert.ok(!json.includes(`"type":${kind}`), `no ${kind} in the result`);
});

test('a date needs an ending: "March 18th, 1884, the monument…" is just text', () => {
  const r = convert('March 18th, 1884, the monument was unveiled.\n\nMarch 19th, 1884.—A real entry.\n');
  assert.deepEqual(headings(r.files[0].text), ['### 1884-03-19 | March 19th, 1884']);
  assert.equal(convert('2026-10-25: a modern one\n').files[0].text.includes('### 2026-10-25 | 2026-10-25'), true);
  assert.equal(convert('February 30th, 1888.—No such day.\n').stats.entries, 0);
});

test('Project Gutenberg: the header and licence are left out; title, author and source are kept', () => {
  const pg = '﻿The Project Gutenberg eBook of A Diary\r\n\r\nTitle: A Diary\r\n       of Someone\r\nAuthor: A. Writer\r\n        B. Writer\r\n\r\nRelease date: 1 January 2000 [eBook #12345]\r\n\r\n*** START OF THE PROJECT GUTENBERG EBOOK A DIARY ***\r\nJANUARY 1888\r\n\r\nJan. 1st.—Begun.\r\n\r\nEnd of the Project Gutenberg EBook of A Diary\r\n\r\n*** END OF THE PROJECT GUTENBERG EBOOK A DIARY ***\r\nThe licence.\r\n';
  const s = stripGutenberg(pg.replace(/\r\n/g, '\n'));
  assert.deepEqual(s.meta, { title: 'A Diary of Someone', author: 'A. Writer and B. Writer', source: 'https://www.gutenberg.org/ebooks/12345' });
  const r = convert(pg);
  const t = r.files[0].text;
  clean(t);
  assert.ok(t.startsWith('---\nJot: 1.0\nTitle: A Diary of Someone\nAuthor: A. Writer and B. Writer\nSource: https://www.gutenberg.org/ebooks/12345\nConverted-with: jot-convert\n---\n'));
  assert.ok(!/gutenberg ebook|licence|\r/i.test(t.replace('www.gutenberg.org', '')));
  assert.equal(r.files[0].name, 'a-diary-of-someone.jot');
});

test('splitting: one file a year when the whole would be too big for the Jot tools', () => {
  const day = 'x'.repeat(2000);
  let src = 'JANUARY 1900\n\n';
  for (let y = 1900; y <= 1902; y++) for (let m = 0; m < 12; m++) for (let d = 1; d <= 28; d += 1) src += `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]} ${d}, ${y}.—${day}\n\n`;
  const r = convert(src, { name: 'big' });
  assert.deepEqual(r.files.map((f) => f.name), ['big-1900.jot', 'big-1901.jot', 'big-1902.jot']);
  for (const f of r.files) { assert.ok(f.bytes <= MAX_FILE_BYTES); clean(f.text); }
  assert.match(r.files[1].text, /^Title: Diary · 1901$/m);
  assert.equal(convert(src, { per: 'month', name: 'big' }).files.length, 36);
  const one = convert(src, { per: 'none' });
  assert.equal(one.files.length, 1);
  assert.ok(one.warnings.some((w) => /more than the 1 MiB/.test(w)));
});

test('the command line: a file or standard input, one file or a folder', () => {
  const cli = path.join(HERE, 'jot-convert.mjs');
  const out = execFileSync(process.execPath, [cli, '-', '--year', '1888', '-q'], { input: fixture('nobody-april.txt') }).toString();
  assert.deepEqual(headings(out)[0], '### 1888-04-03 | APRIL 3');
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || '/tmp'), 'jot-convert-'));
  try {
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    let r = run(path.join(HERE, 'fixtures/pepys-1660.txt'), '--calendar', 'julian', '--name', 'pepys', '-d', dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /5 entries from 1660-01-11 to 1660-01-15/);
    assert.deepEqual(fs.readdirSync(dir), ['pepys.jot']);
    r = run(path.join(HERE, 'fixtures/pepys-1660.txt'), '--name', 'pepys', '-d', dir);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /already there/);
    r = run(path.join(HERE, 'fixtures/pepys-1660.txt'), '--per', 'year');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /give --out-dir/);
    fs.writeFileSync(path.join(dir, 'latin1.txt'), Buffer.from([0x4a, 0x61, 0x6e, 0x2e, 0x20, 0x31, 0x73, 0x74, 0x2e, 0x20, 0xe9, 0x0a]));
    r = run(path.join(dir, 'latin1.txt'));
    assert.equal(r.status, 2);
    assert.match(r.stderr, /not UTF-8/);
    assert.equal(run('--calendar', 'gregorian', 'x').status, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the browser page runs this same converter (site/dist/jot/convert.mjs is an exact copy)', () => {
  assert.equal(fs.readFileSync(path.join(HERE, '../site/dist/jot/convert.mjs'), 'utf8'), fs.readFileSync(path.join(HERE, 'convert.mjs'), 'utf8'), 'copy converter/convert.mjs to site/dist/jot/');
});
