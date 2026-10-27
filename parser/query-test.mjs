// Query records (query.mjs): views computed from the journal, checked field by field. Run: node --test query-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { marks, runQuery, queries, queryDiagnostics, queryText } from './query.mjs';
import { collectNumbers } from './charts.mjs';

const J = `[ ] Undated chore #home

### 2026-10-26 | Monday #work

[ ] Call the dentist @phone #health
  bring the #insurance card
[x] Walk #health
[!] Post the letter
o Choir at 19:00 #music
Some \`#notatag\` code and a [link](#notatag-either).

:::record measurement #s1
metric: sleep
unit: h
value: 7.5
:::

### 2026-10-27 | Tuesday

[ ] Book #Health appointment
:::record measurement #s2
metric: sleep
unit: h
value: 6
:::

:::record query #open-health
label: Open health tasks
show: tasks
status: open
tag: #health
limit: 20
:::

### 2026-11-02 | Monday

:::record query #sleep-week
show: numbers
metric: sleep
period: week
stat: average
:::
`;
const F = (o) => Object.entries(o).map(([name, value]) => ({ name, value: String(value) }));
const ast = parse(J);

test('marks finds #tags and @contexts at a word start, not in code or link targets', () => {
  assert.deepEqual(marks('Call @Phone about #health, (#x) a@b.c #'), { tags: ['health', 'x'], contexts: ['phone'] });
  assert.deepEqual(marks('`#code` [see](#target) [#real](https://e.org)'), { tags: ['real'], contexts: [] });
});

test('tasks filter by status, tag (all lines, any case), context, priority, text and dates', () => {
  const m = runQuery(ast, F({ show: 'tasks', status: 'open', tag: 'health' }));
  assert.deepEqual(m.rows.map((r) => r.text), ['Call the dentist @phone #health', 'Book #Health appointment']);
  assert.equal(m.summary, '2 open tasks tagged #health.');
  assert.deepEqual(m.head, ['Date', 'State', 'Task']);
  assert.deepEqual(m.cells[0], ['2026-10-26', 'to do', 'Call the dentist @phone #health']);
  assert.equal(runQuery(ast, F({ show: 'tasks', tag: 'insurance' })).total, 1, 'a continuation line belongs to its task');
  assert.equal(runQuery(ast, F({ show: 'tasks', context: '@phone', tag: 'health, insurance' })).total, 1);
  assert.equal(runQuery(ast, F({ show: 'tasks', tag: 'health, home' })).total, 0, 'several tags: all of them');
  assert.deepEqual(runQuery(ast, F({ show: 'tasks', priority: 'high' })).rows.map((r) => r.text), ['Post the letter']);
  assert.deepEqual(runQuery(ast, F({ show: 'tasks', text: 'LETTER' })).rows.map((r) => r.text), ['Post the letter']);
  assert.equal(runQuery(ast, F({ show: 'tasks' })).total, 5, 'no dates: undated items too');
  assert.equal(runQuery(ast, F({ show: 'tasks', start: '2026-10-27' })).total, 1, 'a date range leaves undated items out');
  assert.equal(runQuery(ast, F({ show: 'tasks', status: 'open, completed', end: '2026-10-26' })).total, 3);
});

test('events, entries and numbers; limit shows fewer rows but counts them all', () => {
  assert.deepEqual(runQuery(ast, F({ show: 'events', tag: 'music' })).cells, [['2026-10-26', '19:00', 'Choir at 19:00 #music']]);
  const e = runQuery(ast, F({ show: 'entries', tag: 'work' }));
  assert.deepEqual(e.rows.map((r) => [r.date, r.heading]), [['2026-10-26', 'Monday #work']]);
  assert.ok(!e.rows[0].tags.includes('notatag') && !e.rows[0].tags.includes('notatag-either'), 'code and link targets are not tags');
  assert.equal(runQuery(ast, F({ show: 'entries', tag: 'health' })).total, 2, 'tags anywhere in the entry, records aside');
  const n = runQuery(ast, F({ show: 'numbers', metric: 'Sleep', stat: 'max' }));
  assert.deepEqual(n.stats, [{ metric: 'sleep', unit: 'h', stat: 'max', n: 2, value: 7.5 }]);
  assert.equal(n.summary, 'Sleep: max 7.5 h over 2 days.');
  const l = runQuery(ast, F({ show: 'tasks', limit: 2 }));
  assert.equal(l.rows.length, 2); assert.equal(l.total, 5); assert.match(l.summary, /^5 tasks\. Showing the first 2\.$/);
  assert.equal(runQuery(ast, F({ show: 'events', text: 'nothing like this' })).summary, 'No events containing “nothing like this” yet.', 'an empty view says so');
});

test('query records count periods from their own entry and are never numbers themselves', () => {
  const [health, sleep] = queries(ast).map((q) => q.model);
  assert.equal(health.id, 'open-health'); assert.equal(health.label, 'Open health tasks'); assert.equal(health.total, 2);
  assert.equal(sleep.start, '2026-11-02'); assert.equal(sleep.end, '2026-11-08');
  assert.equal(sleep.summary, 'Sleep from 2026-11-02 to 2026-11-08: no numbers yet.');
  assert.ok(!collectNumbers(ast).metrics.has('limit'), 'limit: 20 in a query is not a metric');
  const month = runQuery(ast, F({ show: 'numbers', period: 'month', stat: 'average' }), { date: '2026-10-28' });
  assert.equal(month.start, '2026-10-01'); assert.equal(month.end, '2026-10-31'); assert.match(month.summary, /^Sleep from 2026-10-01 to 2026-10-31: average 6\.8 h over 2 days\.$/); assert.equal(month.stats[0].value, 6.75);
  assert.equal(runQuery(ast, F({ show: 'tasks', period: 'day' }), { date: '2026-10-27' }).total, 1);
});

test('a field that cannot be read is a visible problem and a diagnostic, never an empty or unfiltered view', () => {
  const bad = (o, re, date = null) => { const m = runQuery(ast, F(o), { date }); assert.equal(m.rows.length, 0); assert.ok(m.problems.some((p) => re.test(p.message)), `${JSON.stringify(o)}: ${JSON.stringify(m.problems)}`); assert.match(m.summary, /can't be shown/); };
  bad({}, /Say what to show/);
  bad({ show: 'taks' }, /not one of tasks/);
  bad({ show: 'tasks', status: 'opne' }, /status: "opne"/);
  bad({ show: 'tasks', colour: 'red' }, /"colour" is not a query field/);
  bad({ show: 'numbers', tag: 'x' }, /tag: applies to tasks, events or entries/);
  bad({ show: 'tasks', metric: 'sleep' }, /metric: applies to numbers/);
  bad({ show: 'tasks', stat: 'sum' }, /needs numbers/);
  bad({ show: 'numbers', stat: 'median' }, /stat: "median"/);
  bad({ show: 'numbers', metric: 'slep' }, /no "slep" \(it has sleep\)/);
  bad({ show: 'tasks', start: '2026-02-30' }, /not a date/);
  bad({ show: 'tasks', period: 'week' }, /in none/);
  bad({ show: 'tasks', period: 'week', start: '2026-10-01' }, /not both/, '2026-10-27');
  bad({ show: 'tasks', period: 'fortnight' }, /not day, week or month/, '2026-10-27');
  bad({ show: 'tasks', limit: '0' }, /limit/);
  bad({ show: 'tasks', tag: 'a b' }, /not a tag name/);
  assert.match(runQuery(ast, [{ name: 'show', value: 'tasks' }, { name: 'tag', value: 'a' }, { name: 'tag', value: 'b' }]).problems[0].message, /given twice; give it once, with commas/);
  assert.equal(runQuery(ast, F({ show: 'tasks', label: '', method: 'x' })).problems.length, 0, 'a blank label and common fields are fine');
  bad({ show: 'tasks', tag: '' }, /"tag" has no value/);
  const own = parse(':::record query\nshow: tasks\nperiod: week\ndate: 2026-10-27\n:::\n' + J);
  assert.equal(queries(own)[0].model.start, '2026-10-26', "a query's own date anchors its period");
  const ev = parse('### 2026-10-26\n\n:::record event #d\nlabel: Dentist\nbody: bring forms #health\n:::\n');
  assert.equal(runQuery(ev, F({ show: 'events', tag: 'health' })).total, 1, "an event record's body carries its tags");
  const d = queryDiagnostics(parse(':::record query #q\nshow: nope\n:::\n'));
  assert.deepEqual(d.map((x) => [x.severity, x.code, x.message, x.start]), [['warning', 'invalid-query', 'Query #q: show: "nope" is not one of tasks, events, entries or numbers.', 0]]);
});

test('queryText lays a view out in columns', () => {
  assert.equal(queryText(runQuery(ast, F({ show: 'tasks', priority: 'high' }))), '1 high-priority task.\n\nDate        State        Task\n2026-10-26  to do, high  Post the letter');
});
