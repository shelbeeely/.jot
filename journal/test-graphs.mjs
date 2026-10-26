// Graph grids on the week plan's right page (week_right options.graphs): numbers to plot by hand, sleep hours or steps, in place of the
// mood line. Proves (1) no option prints the very same book, (2) the rules say what is wrong in plain words, (3) the rows follow the range,
// (4) books with one and with two grids build and every page fits, in both trims.
//   node test-graphs.mjs            (about a minute: one month in two trims, into out/graph-test/)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEFAULT_BOOK, validateBook, assemble } from './book.mjs';
import { graphRows, graphProblems, GRAPH_MAX, GRAPH_ROWS } from './bookrules.mjs';
import { fresh } from './samples.mjs';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };
const MONTH = '2026-10';
const withRight = (options, book = DEFAULT_BOOK) => { const b = structuredClone(book); b.default.find((e) => e.type === 'weeks').options.week.find((e) => e.type === 'week_right').options = options; return b; };
const right = (pages) => pages.filter((p) => p.type === 'week_right');

// ---- 1. nothing drifts ----
{
  const a = assemble(await fresh(MONTH), DEFAULT_BOOK.default), b = assemble(await fresh(MONTH), withRight({}).default), c = assemble(await fresh(MONTH), withRight({ graphs: [] }).default);
  ok([b, c].every((x) => x.pages.length === a.pages.length && x.pages.every((p, i) => p.html === a.pages[i].html)), 'no graphs (none, {} or []) prints the very same book, mood line and all');
}
// ---- 2. the rules ----
{
  ok(validateBook(withRight({ graphs: [{ title: 'Sleep', unit: 'h', min: 4, max: 10 }, { title: 'Steps', min: 0, max: 15000 }] })).length === 0, 'two graphs with a title, a unit and a range are a valid book');
  const errs = validateBook(withRight({ graphs: [{ title: 'Sleep', min: 0, max: 7.3 }, { title: '', min: 3, max: 1 }, { title: 'X', min: 0, max: 5, colour: 'red' }] }));
  ok(errs.some((e) => /at most 2 graph grids/.test(e)) && errs.some((e) => /0 to 7\.3 can't be split into 9 rows/.test(e)) && errs.some((e) => /"title" must be text/.test(e)) && errs.some((e) => /"max" must be more than "min"/.test(e)) && errs.some((e) => /unknown key "colour"/.test(e)), 'too many grids, an awkward range, no title, max under min and an unknown key are each named');
  ok(errs.every((e) => /^default\[\d+\]/.test(e) || /week_right/.test(e)), 'and each problem says where it is');
  ok(graphProblems('Sleep').length === 1 && GRAPH_MAX === 2, 'graphs must be a list');
}
// ---- 3. rows ----
{
  ok(graphRows({ min: 4, max: 10 }).join(' ') === '10 9 8 7 6 5 4', 'sleep 4 to 10 h: a row an hour');
  ok(graphRows({ min: 0, max: 15000 }).join(' ') === '15000 12500 10000 7500 5000 2500 0', 'steps to 15000: a row every 2500');
  ok(graphRows({ min: 1, max: 5 }).join(' ') === '5 4 3 2 1' && graphRows({ min: 0, max: 3.5 }).length === 8, 'whole steps first; halves only when the range needs them');
  ok([[0, 8], [0, 12], [0, 20000], [-3, 3], [0, 100]].every(([min, max]) => { const r = graphRows({ min, max }); return r.length >= 2 && r.length <= GRAPH_ROWS && r[0] === max && r[r.length - 1] === min; }), `common ranges fit in ${GRAPH_ROWS} rows, top to bottom`);
  const html = right(assemble(await fresh(MONTH), withRight({ graphs: [{ title: 'Sleep', unit: 'h', min: 4, max: 10 }] }).default).pages)[0].html;
  ok(/<h3>Sleep <span class="dim" style="text-transform:none">\(h\)<\/span><\/h3>/.test(html) && /data-zone="graph_1"/.test(html) && !/Mood line/.test(html) && /class="pio"/.test(html), 'one grid takes the mood line\'s place, the pioneer card stays');
  const two = right(assemble(await fresh(MONTH), withRight({ graphs: [{ title: 'Sleep', min: 4, max: 10 }, { title: 'Work <hours>', min: 0, max: 12 }] }).default).pages)[0].html;
  ok(/data-zone="graph_2"/.test(two) && /Work &lt;hours&gt;/.test(two) && !/class="pio"/.test(two) && !/data-zone="notes"/.test(two), 'two grids: the pioneer card and notes make room, titles are escaped');
}
// ---- 4. it builds, and every page fits ----
{
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-graphs-')), bf = path.join(TMP, 'book.json');
  fs.writeFileSync(bf, JSON.stringify(withRight({ graphs: [{ title: 'Sleep', unit: 'h', min: 4, max: 10 }, { title: 'Steps', min: 0, max: 15000 }] })));
  const ROOT = 'out/graph-test'; fs.rmSync(ROOT, { recursive: true, force: true });
  const run = (s, a, env = {}) => execFileSync('node', [s, ...a], { env: { ...process.env, KW_OUT: ROOT, KW_BOOKFILE: bf, KW_JOTS: '', ...env }, stdio: 'pipe' }).toString();
  for (const size of ['small', 'letter']) {
    const env = size === 'letter' ? { SIZE: 'letter' } : {}, dir = `m${MONTH}${size === 'letter' ? '-letter' : ''}`;
    run('render.mjs', ['month', MONTH, 'test.ics'], env);
    ok(/\[\] 0/.test(run('check.mjs', [dir], env)), `${size === 'letter' ? '8.5x11' : '5.5x8.5'}: two graph grids a week, and check.mjs finds every page fits ("[] 0")`);
    const lay = JSON.parse(fs.readFileSync(`${ROOT}/${dir}/layout.json`, 'utf8'));
    ok(lay.pages.filter((p) => p.type === 'week_right').every((p) => ['graph_1', 'graph_2'].every((z) => p.zones.some((q) => q.zone === z))), `${size}: each week's right page has both graph zones in layout.json`);
  }
}
console.log(`\n${n} checks passed`);
