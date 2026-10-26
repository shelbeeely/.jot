// The Jot template editor's model and generator (dist/editor/template.mjs). Run: node --test test-editor.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, BLOCK_ORDER, ZONES, STARTERS, INKDECK_BYTES, allowedIn, newBlock, normalizeTemplate, fromStarter, renderJot, renderFiles, monthDays, monthWeeks, templateFromJot, templateComment } from './dist/editor/template.mjs';
import { importDayLayout } from './dist/editor/import.mjs';
import { parse } from './dist/jot/jot.mjs';

const records = (a) => a.nodes.filter((n) => n.type === 'record');
const every = () => normalizeTemplate({ title: 'Every block', month: '2026-10', zones: Object.fromEntries(ZONES.map((z) => [z.id, BLOCK_ORDER.filter((t) => allowedIn(t, z.id)).map((t) => newBlock(t, z.id))])) });

test('every starter, as a month and a file a week: valid Jot, a dated entry a day, small enough for InkDeck by the week', () => {
  for (const s of STARTERS) {
    const t = fromStarter(s.id, { month: '2026-10' }), [m] = renderFiles({ ...t, per: 'month' }), a = parse(m.text);
    assert.equal(a.diagnostics.length, 0, `${s.id}: ${JSON.stringify(a.diagnostics)}`);
    assert.deepEqual(a.entries.map((e) => e.date), monthDays('2026-10').map((d) => d.date), s.id);
    for (const f of renderFiles({ ...t, per: 'week' })) assert.ok(f.bytes <= INKDECK_BYTES && parse(f.text).diagnostics.length === 0, `${s.id} ${f.file}`);
  }
});

test('every block type in every zone it is allowed in: clean, unique record ids, every scale declared once at the top', () => {
  const { text } = renderJot(every()), a = parse(text);
  assert.equal(a.diagnostics.length, 0, JSON.stringify(a.diagnostics.slice(0, 3)));
  const ids = records(a).map((r) => r.id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length);
  const decl = records(a).filter((r) => r.recordType === 'scale'), used = records(a).flatMap((r) => r.fields.filter((f) => f.name === 'scale').map((f) => f.value.slice(1)));
  assert.ok(decl.length >= 2 && used.every((s) => decl.some((d) => d.id === s)));
  assert.ok(decl.every((d) => text.indexOf(`#${d.id}`) < text.indexOf('# October 2026')));
  assert.ok(!/DATE:|TAGS:|SEND TO|<[a-z]|^===$|@layout/m.test(text), 'nothing for scanning, no HTML, no page breaks');
});

test('each block writes what it says', () => {
  const day = (blocks) => renderJot({ month: '2026-10', zones: { day: blocks } }).text.split('### 2026-10-14 | Wednesday')[1].split('\n### ')[0];
  assert.match(day([{ type: 'checks', title: 'Care', labels: ['Meds', 'Water'] }]), /#### Care\n\n\[ \] Meds\n\[ \] Water/);
  assert.match(day([{ type: 'tasks', title: 'Top 3', n: 3 }]), /#### Top 3\n\n\[ \] \n\[ \] \n\[ \] \n/);
  assert.match(day([{ type: 'scale', title: 'Energy', min: 1, max: 5 }]), /:::record measurement #energy-2026-10-14\nmetric: energy\nscale: #scale-energy\nvalue:\n:::/);
  assert.match(day([{ type: 'ratings', title: 'Feelings', labels: ['Calm', 'Body'] }]), /label: Feelings\nscale: #scale-feelings\ncalm:\nx-body:\n:::/);
  assert.match(day([{ type: 'blanks', title: 'Today', labels: ['Sleep hours', 'Date'] }]), /sleep-hours:\nx-date:/);
  assert.match(day([{ type: 'choose', title: 'Feeling', words: ['calm', 'odd]]word'] }]), /\[\[calm · odd\] \]word\]\]\nFeeling: /);
  assert.match(day([{ type: 'list', title: 'Ideas', n: 2, style: 'numbers' }]), /1\. \n2\. /);
  assert.match(day([{ type: 'times', title: 'Plan', from: 8, to: 12, every: 2 }]), /- 08:00 \n- 10:00 \n(?!- 12)/);
  assert.match(day([{ type: 'table', title: 'Spending', columns: ['What', 'a|b'], rows: 2 }]), /\| What \| a\\\|b \|\n\| --- \| --- \|\n\|  \|  \|\n\|  \|  \|/);
  assert.match(day([{ type: 'text', title: '', body: 'Breathe.\n[ ] not a task\n# not a heading' }]), /Breathe\.\n\\\[ \] not a task\n\\# not a heading/);
  assert.match(day([{ type: 'record', recordType: 'Sleep Log', title: 'Sleep', fields: ['bed', 'wake'] }]), /:::record sleep-log #sleep-2026-10-14\nlabel: Sleep\nbed:\nwake:\n:::/);
  assert.match(day([{ type: 'writing', title: 'Notes' }]), /#### Notes/);
});

test('a prompt with several questions takes turns, one a day, the same on every download', () => {
  const t = { month: '2026-10', zones: { day: [{ type: 'prompt', questions: ['A?', 'B?', 'C?'] }] } }, txt = renderJot(t).text;
  const qs = [...txt.matchAll(/^#### ([ABC])\?$/gm)].map((m) => m[1]);
  assert.equal(qs.length, 31); assert.ok(qs.every((q, i) => !i || q !== qs[i - 1]));
  assert.equal(renderJot(t).text, txt);
});

test('what a person types never breaks the file', () => {
  const nasty = 'x\n:::\n### 2026-01-01\n[ ] t\n/*';
  const t = normalizeTemplate({ title: nasty, month: '2026-10', zones: { day: [
    { type: 'checks', title: nasty, labels: [nasty, ':::record x'] }, { type: 'blanks', title: nasty, labels: [nasty, '#tag', '123'] },
    { type: 'text', title: nasty, body: nasty }, { type: 'record', recordType: ':::', title: nasty, fields: [nasty] }, { type: 'choose', title: nasty, words: [nasty] }] } });
  const a = parse(renderJot(t).text);
  assert.equal(a.diagnostics.length, 0, JSON.stringify(a.diagnostics));
  assert.equal(a.entries.length, 31, 'no extra dated entries were smuggled in');
  assert.equal(a.nodes.filter((n) => n.type === 'comment').length, 1, 'one hidden comment: the template, nothing typed opened another');
  assert.equal(templateFromJot(renderJot(t).text).title, t.title.replace(/\s+/g, ' ').trim() ? normalizeTemplate(t).title : 'My journal', 'and the template comes back intact');
});

test('weeks, splits and the zones that happen once', () => {
  assert.deepEqual(monthWeeks(monthDays('2026-10')).map((w) => w.monday), ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  const t = { title: 'My Journal', month: '2026-10', zones: { front: [{ type: 'page', title: 'Theme' }], weekStart: [{ type: 'tasks', title: 'Week', n: 1 }], day: [{ type: 'writing', title: 'Today' }], weekEnd: [{ type: 'writing', title: 'Review' }], back: [{ type: 'page', title: 'Closing' }] } };
  const wk = renderFiles({ ...t, per: 'week' }), dy = renderFiles({ ...t, per: 'day' }), all = monthDays('2026-10').map((d) => d.date);
  assert.deepEqual(wk.map((f) => f.file), ['my-journal-2026-10-01.jot', 'my-journal-2026-10-05.jot', 'my-journal-2026-10-12.jot', 'my-journal-2026-10-19.jot', 'my-journal-2026-10-26.jot']);
  assert.deepEqual(wk.flatMap((f) => parse(f.text).entries.map((e) => e.date)), all);
  assert.deepEqual(dy.flatMap((f) => parse(f.text).entries.map((e) => e.date)), all);
  assert.ok(/## Theme/.test(wk[0].text) && !wk.slice(1).some((f) => /## Theme/.test(f.text)) && /## Closing/.test(wk[4].text) && !wk.slice(0, 4).some((f) => /## Closing/.test(f.text)));
  assert.deepEqual(dy.filter((f) => /## Week review/.test(f.text)).map((f) => f.days[0]), ['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-10-31']);
  assert.match(wk[1].text, /Title: My Journal · 2026-10-05 to 2026-10-11\nDate: 2026-10-05/);
  const m = renderJot(t).text;
  assert.equal((m.match(/^## Week of/gm) || []).length, 5); assert.equal((m.match(/^## Week review/gm) || []).length, 5);
  assert.ok(!/## Week of/.test(renderJot({ month: '2026-10', zones: { day: [{ type: 'writing' }] } }).text), 'no week headings when nothing happens weekly');
});

test('a template read back is checked: unknown blocks, wrong zones, bad numbers and bad months are fixed or dropped', () => {
  const t = normalizeTemplate({ title: 5, month: '2026-13', per: 'year', zones: { day: [{ type: 'nope' }, { type: 'page' }, { type: 'scale', min: 5, max: 2, title: 'x'.repeat(500) }, { type: 'times', from: 30, to: -4 }, 'junk'] } });
  assert.equal(t.title, 'My journal'); assert.match(t.month, /^\d{4}-\d{2}$/); assert.equal(t.per, 'month');
  assert.deepEqual(t.zones.day.map((b) => b.type), ['scale', 'times']);
  assert.ok(t.zones.day[0].max > t.zones.day[0].min && t.zones.day[0].title.length <= 80);
  assert.ok(t.zones.day[1].to > t.zones.day[1].from && t.zones.day[1].from <= 23);
  assert.ok(Object.keys(BLOCKS).every((k) => BLOCK_ORDER.includes(k)));
});

test('a downloaded .jot carries its template, so opening it brings the template back', () => {
  const t = normalizeTemplate({ ...fromStarter('planner'), title: 'Notes */ and {braces}', month: '2026-10', per: 'week' });
  for (const f of renderFiles(t)) {
    const back = templateFromJot(f.text);
    assert.deepEqual(back, t, f.file);
    assert.ok(f.text.endsWith(templateComment(t)), 'at the very end, after the writing');
  }
  const filled = renderJot(t).text.replace(/^\[ \] $/m, '[x] Called the bank').replace('#### Done\n', '#### Done\n\nA long day.\n');
  assert.deepEqual(templateFromJot(filled), t, 'filling it in does not lose the template');
  assert.equal(templateFromJot('### 2026-10-01\n\nA note from somewhere else.\n'), null, 'a .jot made elsewhere has none');
  assert.equal(templateFromJot('/*\njot-template: {"zones": nope}\n*/\n'), null, 'a broken one is refused');
  assert.equal(templateFromJot('/*\njot-template: {"zones":{"day":[{"type":"evil","x":1},{"type":"writing","title":"Ok"}]},"month":"2026-10"}\n*/\n').zones.day.length, 1, 'and what it holds is checked like any template');
  assert.equal(renderJot(t).text, renderJot(JSON.parse(JSON.stringify(t))).text, 'the same template writes the same file');
});

test('a print day layout (daypage.json) imports as the Each day blocks', () => {
  const r = importDayLayout({ v: 2, blocks: [
    { type: 'sky', on: true }, { type: 'care', on: true }, { type: 'body', on: true }, { type: 'actions', on: true, count: 4 }, { type: 'review', on: true, items: { well: true, hard: false, next: true } },
    { type: 'scale', title: 'Pain', steps: 6, zero: true, lo: 'none', hi: 'bad', on: true }, { type: 'checks', title: 'Body care', labels: ['HRT', 'Stretch'], on: true },
    { type: 'sketch', on: true }, { type: 'sudoku', on: true }, { type: 'words', title: 'Feeling', words: ['calm', 'tired'], on: true }, { type: 'habits', on: false, labels: ['x'] }] });
  assert.deepEqual(r.skipped, ['Moon, sun & season', 'Sketch box', 'Sudoku']);
  const day = normalizeTemplate({ month: '2026-10', zones: { day: r.blocks } }).zones.day;
  assert.deepEqual(day.map((b) => `${b.type}:${b.title || ''}`), ['checks:Care', 'scale:Mood', 'blanks:Care numbers', 'writing:Writing', 'tasks:Action items', 'writing:Went well', 'writing:Tomorrow', 'scale:Pain', 'checks:Body care', 'choose:Feeling']);
  assert.deepEqual([day[7].min, day[7].max, day[4].n], [0, 5, 4], 'options carry over (a 6-step scale from 0, four action lines)');
  assert.equal(parse(renderJot({ month: '2026-10', zones: { day } }).text).diagnostics.length, 0);
  assert.throws(() => importDayLayout({ nope: 1 }), /not a day layout/);
});

test('every block the print library has either becomes a Jot block or is named as left out', async () => {
  const { TYPES, newBlock: printBlock, normalize } = await import('../journal/daypage.mjs'); // the print engine in this repository
  const all = normalize({ v: 2, blocks: Object.keys(TYPES).map((t) => ({ ...printBlock(t, {}, t), on: true })) });
  const r = importDayLayout(JSON.parse(JSON.stringify(all)));
  const covered = r.skipped.length + new Set(all.blocks.filter((b) => !r.skipped.includes(TYPES[b.type].name)).map((b) => b.type)).size;
  assert.equal(covered, Object.keys(TYPES).length, `skipped: ${r.skipped.join(', ')}`);
  assert.ok(r.skipped.every((n) => Object.values(TYPES).some((t) => t.name === n)), 'skipped blocks go by their print names');
  const tpl = normalizeTemplate({ month: '2026-10', zones: { day: r.blocks } });
  assert.equal(tpl.zones.day.length, r.blocks.length, 'every converted block is a valid Jot block');
  assert.equal(parse(renderJot(tpl).text).diagnostics.length, 0);
});
