// The book as a .jot file to fill in by hand (jotfile.mjs, render-jot.mjs, the editor's "Download .jot").
// Proves (1) the default book is a valid Jot v1 document: one entry a day, no parser diagnostics, every scale it uses declared once,
// (2) nothing for scanning or print layout gets in (no DATE / TITLE / TAGS boxes, codes, SEND TO strip, page breaks), (3) every block
// type writes something to fill in, or is named as paper-only, (4) filling it in by hand gives real data (ticked tasks, measurement
// values) that the parser reads back and the book printer accepts, (5) the book's structure is followed: hidden pages, a month's own
// pages, spread days, notes pages with their own blocks, and (6) render-jot.mjs with a calendar adds the day's events and routines.
//   node test-jotfile.mjs        (a few seconds)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse } from '../parser/jot.mjs';
import { jotFile, jotFiles, jfMonthDays, jfWeeks, JF_PAPER_ONLY, JF_INKDECK_BYTES } from './jotfile.mjs';
import { jotEntries } from './jotpage.mjs';
import { DEFAULT_BOOK } from './book.mjs';
import { TYPES, newBlock, normalize } from './daypage.mjs';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const records = (a) => a.nodes.filter((x) => x.type === 'record');

// ---- 1. the default book ----
const def = jotFile({ book: DEFAULT_BOOK, month: '2026-10', day: null, title: 'Northlight', slug: 'northlight' });
const A = parse(def.text);
ok(def.file === 'northlight-2026-10.jot' && A.metadata.some((m) => m.name === 'Jot' && m.value === '1.0') && A.metadata.some((m) => m.name === 'Title' && /Northlight · October 2026/.test(m.value)), 'a Jot 1.0 document named and titled from the book');
ok(A.diagnostics.length === 0, 'the parser finds nothing wrong: ' + JSON.stringify(A.diagnostics.slice(0, 3)));
ok(A.entries.length === 31 && A.entries.every((e, i) => e.date === `2026-10-${String(i + 1).padStart(2, '0')}`), 'one dated entry for every day of October, in order');
{
  const decl = new Set(records(A).filter((r) => r.recordType === 'scale').map((r) => r.id));
  const used = records(A).flatMap((r) => r.fields.filter((f) => f.name === 'scale').map((f) => f.value.slice(1)));
  ok(used.length > 0 && used.every((s) => decl.has(s)), `every scale a rating points to is declared (${[...decl].join(', ')})`);
  ok(records(A).filter((r) => r.recordType === 'scale').every((r) => A.source.indexOf(`#${r.id}`) < A.source.indexOf('# October 2026')), 'and declared once, at the top');
}
ok(jfWeeks(jfMonthDays('2026-10')).map((w) => w.monday).join() === '2026-09-28,2026-10-05,2026-10-12,2026-10-19,2026-10-26', 'weeks run Monday to Sunday, cut at the month');

// ---- 2. nothing for scanning or page layout ----
ok(!/DATE:|TITLE:|TAGS:|SEND TO|data-zone|<[a-z]|\{\{P_|^===$|@layout|@paper/m.test(def.text), 'no scan header, codes, send-to strip, HTML, page references or page breaks');
ok(!A.nodes.some((x) => x.type === 'pagebreak' || x.type === 'directive'), 'one flat file: no page breaks or layout directives');

// ---- 3. every block type ----
const types = Object.keys(TYPES);
const all = normalize({ v: 2, blocks: types.map((t) => ({ ...newBlock(t, {}, t), on: true })) });
const one = jotFile({ book: DEFAULT_BOOK, month: '2026-10', day: all, title: 'All' });
const B = parse(one.text);
ok(B.diagnostics.length === 0, `all ${types.length} block types on one day: still no diagnostics ` + JSON.stringify(B.diagnostics.slice(0, 3)));
ok(JSON.stringify(one.skipped.sort()) === JSON.stringify(JF_PAPER_ONLY.filter((t) => TYPES[t]).map((t) => TYPES[t].name).sort()), `paper-only blocks are left out and named: ${one.skipped.join(', ')}`);
{
  const day = one.text.split('### 2026-10-14 | Wednesday')[1].split('### 2026-10-15')[0];
  const titled = types.filter((t) => !JF_PAPER_ONLY.includes(t) && !['sky', 'notes', 'fact', 'events', 'body', 'review', 'care', 'actions'].includes(t));
  const missing = titled.filter((t) => { const b = all.blocks.find((x) => x.type === t), want = b.title || b.label || (t === 'split' ? b.left : ''); return want && !day.includes(want); });
  ok(missing.length === 0, 'every block with a title writes it on the day' + (missing.length ? ': missing ' + missing.join(', ') : ''));
  ok(/#### Writing/.test(day) && /#### Action items/.test(day) && /#### Went well/.test(day) && /\[ \] Meds: morning/.test(day), 'the default blocks: writing space, action items, the review, care ticks');
  ok(/\[\[calm · tired · anxious/.test(day) && /^Feeling: $/m.test(day), 'words to circle: the choices as marginalia, then a line to write the ones that fit');
  ok(/:::record measurement #energy-2026-10-14\nmetric: energy\nscale: #scale-energy\nvalue:\n:::/.test(day), 'a scale is a measurement record with an empty value to fill in');
  ok(/\| Term \| Answer \|/.test(day) && /\| What \| How much \|/.test(day), 'flash cards and spending are tables to fill in');
  ok(/^- 08:00 $/m.test(day) && /^- 20:00 $/m.test(day), 'time blocks list the hours');
}
{ const RES = ['method', 'privacy', 'author', 'created', 'modified', 'date', 'at', 'start', 'end', 'body', 'source', 'relation'];
  const e = jotFile({ book: DEFAULT_BOOK, month: '2026-10', day: { v: 2, blocks: [newBlock('energy', { labels: ['Body', 'Date', 'Mind'] }, 'e1')] } }).text;
  ok(/^x-body:$/m.test(e) && /^x-date:$/m.test(e) && /^mind:$/m.test(e) && records(parse(e)).every((r) => r.fields.filter((f) => RES.includes(f.name)).length === 0), 'a label that is a reserved Jot field ("Body", "Date") gets the x- prefix'); }
ok(new Set(records(B).map((r) => r.id).filter(Boolean)).size === records(B).filter((r) => r.id).length, 'every record id is unique (no duplicate-id errors)');

// ---- 4. filled in by hand ----
{
  let t = def.text.replace(/^\[ \] Meal 1$/gm, '[x] Meal 1').replace(/(#mood-2026-10-0[1-3]\nmetric: mood\nscale: #scale-mood\n)value:/g, '$1value: 2');
  t = t.replace('### 2026-10-02 | Friday\n', '### 2026-10-02 | Friday\n\nA slow morning, then a walk.\n').replace(/(### 2026-10-02 \| Friday[^]*?#### Action items\n\n)\[ \] \n/, '$1[ ] Call the pharmacy\n');
  const F = parse(t);
  ok(F.diagnostics.length === 0, 'a filled-in file still parses clean');
  ok(F.nodes.filter((x) => x.type === 'task' && x.status === 'completed' && x.text === 'Meal 1').length === 31, 'ticking "[x]" gives completed tasks');
  ok(records(F).filter((r) => r.recordType === 'measurement' && r.fields.some((f) => f.name === 'value' && f.value === '2')).length === 3, 'typing a value gives a measurement');
  ok(F.nodes.some((x) => x.type === 'task' && x.status === 'open' && x.text === 'Call the pharmacy'), 'writing after "[ ] " gives an open task');
  const E = jotEntries(F, 'northlight-2026-10.jot');
  ok(E.filter((e) => e.date).length === 31 && E.find((e) => e.date === '2026-10-02').nodes.some((x) => x.type === 'paragraph' && /slow morning/.test(x.raw)), 'the book printer (Jot pages) reads it back day by day');
}

// ---- 5. the book's structure ----
{
  const b = clone(DEFAULT_BOOK), wk = b.default.find((e) => e.type === 'weeks').options.week;
  wk.find((e) => e.type === 'week_review').on = false;
  b.default.find((e) => e.type === 'theme').on = false;
  b.default.push({ id: 'notes_1', type: 'notes', on: true, options: { title: 'Reading list' }, layout: { v: 2, kind: 'notes', blocks: [newBlock('checks', { title: 'Finished', labels: ['Book one'] }, 'c1')] } });
  wk.find((e) => e.type === 'days').options = { weekdays: { sat: 'spread' } };
  const spread = { v: 2, blocks: [newBlock('body', {}, 'body'), newBlock('lines', { title: 'Weekend plans', n: 3 }, 'wp')] };
  const day = normalize(null); day.spread = spread;
  const r = jotFile({ book: b, month: '2026-10', day, title: 'T' });
  ok(!/Week review/.test(r.text) && !/Season theme/.test(r.text), 'hidden pages are left out (week review, season theme)');
  ok(/## Reading list\n\n#### Finished\n\n\[ \] Book one/.test(r.text), 'a notes page writes its own blocks under its title');
  const sat = r.text.split('### 2026-10-03 | Saturday')[1].split('\n### ')[0], fri = r.text.split('### 2026-10-02 | Friday')[1].split('### 2026-10-03')[0];
  ok(/Weekend plans/.test(sat) && !/Weekend plans/.test(fri) && /Care/.test(fri), 'a spread day (Saturdays here) writes the spread layout; other days the day layout');
  const m = clone(DEFAULT_BOOK); m.months = { '2026-11': { pages: m.default.filter((e) => e.type !== 'closing') } };
  ok(/## Closing October 2026/.test(jotFile({ book: m, month: '2026-10', day: null }).text) && !/## Closing/.test(jotFile({ book: m, month: '2026-11', day: null }).text), "a month with its own page list follows it");
  ok(/5\. Professionals and crisis lines: my therapist, my prescriber; 988/.test(jotFile({ book: DEFAULT_BOOK, month: '2026-10', day: null, crisis: ['988 call or text'] }).text), 'the safety plan is there to fill in, with the profile\'s crisis lines');
}

// ---- 5b. a file a week or a day (InkDeck opens 16 KB a file) ----
{
  const o = { book: DEFAULT_BOOK, month: '2026-10', day: null, title: 'Northlight', slug: 'northlight' };
  const wk = jotFiles(o, 'week'), dy = jotFiles(o, 'day'), dates = (fs_) => fs_.flatMap((f) => parse(f.text).entries.map((e) => e.date));
  ok(wk.map((f) => f.file).join() === 'northlight-2026-10-01.jot,northlight-2026-10-05.jot,northlight-2026-10-12.jot,northlight-2026-10-19.jot,northlight-2026-10-26.jot', 'a file a week, named by its first day');
  ok(JSON.stringify(dates(wk)) === JSON.stringify(A.entries.map((e) => e.date)) && dy.length === 31 && JSON.stringify(dates(dy)) === JSON.stringify(A.entries.map((e) => e.date)), 'split by week or by day, every day is in exactly one file');
  ok(wk.every((f) => parse(f.text).diagnostics.length === 0 && Buffer.byteLength(f.text) <= JF_INKDECK_BYTES), 'each week file is clean Jot and fits InkDeck');
  const has = (t, re) => re.test(t);
  ok(has(wk[0].text, /## Season theme/) && !wk.slice(1).some((f) => has(f.text, /## Season theme/)) && has(wk[4].text, /## Closing October 2026/) && !wk.slice(0, 4).some((f) => has(f.text, /## Closing/)), "the book's front pages go in the first file, the back pages in the last");
  ok(dy.filter((f) => /## Week review/.test(f.text)).map((f) => parse(f.text).entries[0].date).join() === '2026-10-04,2026-10-11,2026-10-18,2026-10-25,2026-10-31', 'a day at a time, the week review comes with the week\'s last day');
  ok(/Title: Northlight · 2026-10-05 to 2026-10-11/.test(wk[1].text) && /Date: 2026-10-05/.test(wk[1].text), 'each file is titled and dated by its own days');
}

// ---- 6. the command line, with a calendar ----
{
  const out = execFileSync('node', ['render-jot.mjs', 'month', '2026-10', 'test.ics'], { env: { ...process.env, KW_OUT: 'out/jotfile-test' } }).toString();
  const f = 'out/jotfile-test/jot/' + fs.readdirSync('out/jotfile-test/jot')[0], t = fs.readFileSync(f, 'utf8');
  ok(/lines/.test(out) && parse(t).diagnostics.length === 0, `render-jot.mjs writes ${f}`);
  ok(/### 2026-10-05 \| Monday\n\no 4:00p Test appointment/.test(t), "the calendar's events open their day as Jot events (o)");
  fs.rmSync('out/jotfile-test', { recursive: true, force: true });
  const w = execFileSync('node', ['render-jot.mjs', 'month', '2026-10', '--per', 'week'], { env: { ...process.env, KW_OUT: 'out/jotfile-test' } }).toString();
  ok(fs.readdirSync('out/jotfile-test/jot').length === 5 && !/over InkDeck/.test(w), 'render-jot.mjs --per week writes five files, each small enough for InkDeck');
  fs.rmSync('out/jotfile-test', { recursive: true, force: true });
}
console.log(`\n${n} checks passed`);
