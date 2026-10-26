// Automation (automation.mjs) and connections (connect.mjs, with a stand-in fetch: nothing leaves this machine). Run: node --test automation-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from './jot.mjs';
import A from './automation.mjs';
import { sendWebhook, todoistAdd, weather } from './connect.mjs';

const J = `# Notebook

### 2026-10-25 | Sunday

[x] Walk
[ ] Call Sam back
[!] Pay rent
[>] Old thing
o Dinner with Ana at 7pm
o Market; all day, outdoors

:::record measurement #sleep-2026-10-25
metric: sleep
unit: h
value:
:::

### 2026-10-27 | Tuesday

[ ] Post the letter
o Dentist 09:30
`;

test('extract: tasks with their state and day, events with their time, numbers', () => {
  const { tasks, events, numbers } = A.extract(parse(J));
  assert.deepEqual(tasks.map((t) => [t.date, t.status, t.priority, t.text]), [['2026-10-25', 'completed', 'normal', 'Walk'], ['2026-10-25', 'open', 'normal', 'Call Sam back'], ['2026-10-25', 'open', 'high', 'Pay rent'], ['2026-10-25', 'migrated', 'normal', 'Old thing'], ['2026-10-27', 'open', 'normal', 'Post the letter']]);
  assert.deepEqual(events.map((e) => [e.date, e.time]), [['2026-10-25', '19:00'], ['2026-10-25', null], ['2026-10-27', '09:30']]);
  assert.deepEqual(numbers, [], 'a blank value is not a number');
  for (const [t, want] of [['at 7pm', '19:00'], ['7:30 am', '07:30'], ['12pm lunch', '12:00'], ['12am', '00:00'], ['21h15', '21:15'], ['at 19', '19:00'], ['at 7', null], ['2026-10-26', null], ['room 101', null], ['25:00', null]]) assert.equal(A.timeOf(t), want, t);
});

test('iCalendar: events (timed, all-day), open tasks as to-dos, escaped, folded, stable UIDs', () => {
  const ics = A.toICS(parse(J), { name: 'Mine' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n') && ics.endsWith('END:VCALENDAR\r\n') && !/[^\r]\n/.test(ics), 'CRLF lines');
  assert.match(ics, /DTSTART:20261025T190000\r\nDTEND:20261025T200000\r\nSUMMARY:Dinner with Ana at 7pm/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261025\r\nDTEND;VALUE=DATE:20261026\r\nSUMMARY:Market\\; all day\\, outdoors/);
  assert.equal((ics.match(/BEGIN:VTODO/g) || []).length, 3, 'open and high tasks; not done, not moved');
  assert.match(ics, /SUMMARY:Pay rent\r\nSTATUS:NEEDS-ACTION\r\nPRIORITY:1/);
  assert.equal(A.toICS(parse(J)), A.toICS(parse(J)), 'the same journal, the same file (UIDs from the text)');
  assert.equal((A.toICS(parse(J), { includeDone: true, tasksAsEvents: true }).match(/BEGIN:VEVENT/g) || []).length, 3 + 4);
  const long = A.toICS(parse(`### 2026-10-25\n\no ${'Ä long event name '.repeat(8)}\n`));
  assert.ok(long.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75) && /\r\n [^\r]/.test(long), 'lines folded at 75 octets');
});

test('CSV out: numbers and tasks, quoted where needed, formulas defused', () => {
  const ast = parse('### 2026-10-25\n\n[ ] =HYPERLINK("x")\n[ ] Buy milk, eggs\n\n:::record measurement #s\nmetric: sleep\nvalue: 7.5\nunit: h\n:::\n');
  assert.equal(A.numbersCSV(ast), 'date,metric,value,unit\r\n2026-10-25,sleep,7.5,h\r\n');
  assert.equal(A.tasksCSV(ast), `date,status,priority,task\r\n2026-10-25,open,normal,"'=HYPERLINK(""x"")"\r\n2026-10-25,open,normal,"Buy milk, eggs"\r\n`);
});

test('CSV in: a column of dates, columns of numbers, units from the headers, rows on a day combined', () => {
  const r = A.readCSV('Date,Steps,Sleep (h),Note\n2026-10-25,8200,7.5,good\n2026-10-26 08:00,3000,,\n2026-10-26 17:00,4100,6.75,\n2026/10/28,9000,8,\n');
  assert.deepEqual(r.metrics, ['sleep', 'steps'], 'a text column is not a metric');
  assert.deepEqual(r.numbers.filter((n) => n.date === '2026-10-26').map((n) => [n.metric, n.value, n.unit]), [['sleep', 6.75, 'h'], ['steps', 7100, '']]);
  assert.equal(A.readCSV('date,hr\n2026-10-26,60\n2026-10-26,70\n', { combine: 'mean' }).numbers[0].value, 65);
  assert.equal(A.readCSV('date;kg\n2026-10-26;71,5\n').numbers[0].value, 71.5, 'semicolons and decimal commas');
  assert.equal(A.readCSV('day,steps\n13/10/2026,5\n03/04/2026,6\n').ambiguous, 1, '03/04 could be either way: left out and counted');
  assert.equal(A.readCSV('day,steps\n03/04/2026,6\n', { dayFirst: true }).numbers[0].date, '2026-04-03');
  assert.throws(() => A.readCSV('a,b\n1,2\n'), /No column of dates/);
});

test('numbers into the journal: blanks filled where they are, the rest under their day, nothing twice', () => {
  const numbers = A.readCSV('date,steps,sleep (h)\n2026-10-25,8200,7.5\n2026-10-26,7100,6.5\n').numbers;
  const w = A.addNumbers(J, numbers, { source: 'fit.csv' });
  assert.deepEqual([w.filled, w.added, w.kept], [1, 3, 0]);
  assert.match(w.text, /#sleep-2026-10-25\nmetric: sleep\nunit: h\nvalue: 7\.5\nsource: fit\.csv\n:::/, 'the template\'s blank, filled in place');
  assert.match(w.text, /### 2026-10-26 \| Monday\n\n:::record measurement #sleep-2026-10-26[\s\S]*### 2026-10-27/, 'a missing day made, in date order');
  const again = A.addNumbers(w.text, numbers, { source: 'fit.csv' });
  assert.deepEqual([again.filled, again.added, again.kept, again.text === w.text], [0, 0, 4, true]);
  const a = parse(w.text); assert.equal(a.diagnostics.length, 0); assert.equal(stringify(a), w.text);
  assert.equal(A.extract(a).numbers.length, 4);
});

test('today, rollover and the week review', () => {
  assert.equal(A.todayEntry(J, '2026-10-25').added, false);
  assert.match(A.todayEntry(J, '2026-10-28').text, /### 2026-10-27[\s\S]*### 2026-10-28 \| Wednesday\n\n$/);
  assert.match(A.todayEntry(J, '2026-10-26').text, /\[!\] Pay rent[\s\S]*### 2026-10-26 \| Monday\n\n### 2026-10-27/, 'in date order');
  const r = A.rollover(J, '2026-10-28');
  assert.equal(r.moved, 3);
  assert.match(r.text, /\[>\] Call Sam back\n\[>\] Pay rent\n\[>\] Old thing/);
  assert.match(r.text, /### 2026-10-28 \| Wednesday\n\n\[ \] Call Sam back\n\[!\] Pay rent\n\[ \] Post the letter\n$/);
  assert.equal(A.rollover(r.text, '2026-10-28').moved, 0, 'nothing left to carry');
  const v = A.weekReview(A.addNumbers(J, [{ date: '2026-10-27', metric: 'sleep', value: 7, unit: 'h' }]).text, '2026-10-27');
  assert.deepEqual(v.week, { start: '2026-10-26', end: '2026-11-01', done: 0, open: 1, numbers: { sleep: 7 } });
  assert.match(v.text, /## Week review · 2026-10-26 to 2026-11-01\n\n0 done, 1 still open\.[\s\S]*- Post the letter[\s\S]*:::record chart #review-2026-10-26\nmetrics: sleep/);
  assert.equal(parse(v.text).diagnostics.length, 0);
});

test('sync: which open tasks a service has had, remembered in the journal', () => {
  const p0 = A.pendingSync(parse(J), 'todoist'); assert.deepEqual(p0.map((t) => t.text), ['Call Sam back', 'Pay rent', 'Post the letter']);
  const s1 = A.markSynced(J, 'todoist', p0.slice(0, 2), { at: '2026-10-26T10:00' });
  assert.deepEqual(A.pendingSync(parse(s1), 'todoist').map((t) => t.text), ['Post the letter']);
  const s2 = A.markSynced(s1, 'todoist', A.pendingSync(parse(s1), 'todoist'), { at: '2026-10-27T09:00' });
  assert.equal(A.pendingSync(parse(s2), 'todoist').length, 0);
  assert.equal((s2.match(/:::record sync #sync-todoist/g) || []).length, 1); assert.equal((s2.match(/^last:/gm) || []).length, 1, 'one record, the last time updated');
  assert.equal(parse(s2).diagnostics.length, 0);
  assert.throws(() => A.markSynced(J, 'Bad Name', p0), /Not a service name/);
});

test('the webhook payload: tasks, events, numbers and nothing else', () => {
  const p = A.payload(parse(`${J}\nA private thought about Sam.\n`), { file: 'j.jot', open: true, since: '2026-10-26' });
  assert.deepEqual(Object.keys(p), ['format', 'version', 'file', 'tasks', 'events', 'numbers']);
  assert.deepEqual(p.tasks.map((t) => t.text), ['Post the letter']); assert.deepEqual(p.events.map((e) => e.time), ['09:30']);
  assert.ok(!JSON.stringify(p).includes('private thought'));
});

const fakeFetch = (reply) => { const calls = []; const f = async (url, init = {}) => { calls.push({ url, ...init }); const r = reply(url, init); return { ok: r.status < 400, status: r.status, json: async () => r.body, text: async () => JSON.stringify(r.body) }; }; f.calls = calls; return f; };
test('connections, with a stand-in for the internet: webhook, Todoist, weather', async () => {
  const f = fakeFetch(() => ({ status: 200, body: {} }));
  assert.deepEqual(await sendWebhook('https://hooks.example/abc', { a: 1 }, { fetchImpl: f }), { status: 200 });
  assert.equal(f.calls[0].method, 'POST'); assert.equal(f.calls[0].body, '{"a":1}');
  await assert.rejects(sendWebhook('http://hooks.example/abc', {}, { fetchImpl: f }), /must start with https/);
  await assert.rejects(sendWebhook('https://hooks.example', {}, { fetchImpl: fakeFetch(() => ({ status: 410, body: 'gone' })) }), /answered 410/);
  const t = fakeFetch((url, init) => ({ status: 200, body: { id: `t${JSON.parse(init.body).content.length}` } }));
  const sent = await todoistAdd([{ text: 'Call Sam', date: '2026-10-26', key: 'k1' }, { text: 'Pay rent', priority: 'high', key: 'k2' }], 'secret', { fetchImpl: t });
  assert.deepEqual(sent, [{ key: 'k1', id: 't8' }, { key: 'k2', id: 't8' }]);
  assert.equal(t.calls[0].headers.authorization, 'Bearer secret'); assert.deepEqual(JSON.parse(t.calls[0].body), { content: 'Call Sam', due_date: '2026-10-26' }); assert.equal(JSON.parse(t.calls[1].body).priority, 4);
  await assert.rejects(todoistAdd([{ text: 'x' }], '', { fetchImpl: t }), /token is needed/);
  const w = fakeFetch(() => ({ status: 200, body: { daily: { weather_code: [61], temperature_2m_max: [14.27], temperature_2m_min: [6.1], precipitation_sum: [2.3] } } }));
  const r = await weather(51.5, -0.12, '2026-10-26', { fetchImpl: w });
  assert.match(w.calls[0].url, /latitude=51\.50&longitude=-0\.12&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=2026-10-26&end_date=2026-10-26/);
  assert.equal(r.record, ':::record observation #weather-2026-10-26\nlabel: weather\nsky: light rain\ntemperature-high: 14.3\ntemperature-low: 6.1\nrain: 2.3\nsource: open-meteo.com\n:::');
  assert.deepEqual(A.extract(parse(`### 2026-10-26\n\n${r.record}\n`)).numbers.map((n) => n.metric), ['rain', 'temperature-high', 'temperature-low'], 'the weather charts like any number');
  await assert.rejects(weather(200, 0, '2026-10-26', { fetchImpl: w }), /Latitude and longitude/);
});
