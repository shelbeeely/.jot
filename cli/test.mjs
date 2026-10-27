// The jot command line, run as a person would (a child process on temporary files). The webhook goes to a server on this machine;
// nothing else reaches out (no --weather, no todoist token). Run: node --test cli/test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';

const JOT = new URL('./jot.mjs', import.meta.url).pathname;
const run = (args, env = {}) => new Promise((resolve) => execFile(process.execPath, [JOT, ...args], { env: { ...process.env, TODOIST_TOKEN: '', ...env } }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jot-cli-'));
const J = '### 2026-10-25 | Sunday\n\n[x] Walk\n[ ] Call Sam back\no Dinner with Ana at 7pm\n\n:::record measurement #sleep-2026-10-25\nmetric: sleep\nunit: h\nvalue:\n:::\n\n### 2026-10-27 | Tuesday\n\n[!] Post the letter\n';

test('reading: tasks, events, numbers, ics and json; the file is never changed', async () => {
  const d = tmp(), f = path.join(d, 'j.jot'); fs.writeFileSync(f, J);
  assert.equal((await run(['tasks', f])).stdout, '2026-10-25  [x] Walk\n2026-10-25  [ ] Call Sam back\n2026-10-27  [!] Post the letter\n');
  assert.deepEqual(JSON.parse((await run(['tasks', f, '--status', 'open', '--json'])).stdout).map((t) => t.text), ['Call Sam back', 'Post the letter']);
  assert.equal((await run(['events', f])).stdout, '2026-10-25 19:00  Dinner with Ana at 7pm\n');
  assert.equal((await run(['numbers', f])).stdout, 'date,metric,value,unit\n');
  const ics = (await run(['ics', f, '--name', 'Mine'])).stdout; assert.match(ics, /X-WR-CALNAME:Mine[\s\S]*DTSTART:20261025T190000[\s\S]*BEGIN:VTODO/);
  const o = path.join(d, 'cal.ics'); await run(['ics', f, '-o', o]); assert.match(fs.readFileSync(o, 'utf8'), /^BEGIN:VCALENDAR/);
  assert.equal(JSON.parse((await run(['json', f])).stdout).files[0].tasks.length, 3);
  assert.equal(fs.readFileSync(f, 'utf8'), J);
});

test('writing: import, today, rollover and review change the journal and say so; --dry-run prints instead', async () => {
  const d = tmp(), f = path.join(d, 'j.jot'), csv = path.join(d, 'fit.csv'); fs.writeFileSync(f, J); fs.writeFileSync(csv, 'Date,Steps,Sleep (h)\n2026-10-25,8200,7.5\n2026-10-26,7100,6.5\n');
  const dry = await run(['import', csv, '--into', f, '--dry-run']); assert.match(dry.stdout, /value: 7\.5/); assert.equal(fs.readFileSync(f, 'utf8'), J, '--dry-run leaves the file');
  const r = await run(['import', csv, '--into', f]); assert.match(r.stderr, /1 blanks filled, 3 numbers added, 0 already there \(sleep, steps; 2 rows\)/);
  assert.match((await run(['import', csv, '--into', f])).stderr, /0 blanks filled, 0 numbers added, 4 already there/);
  assert.match((await run(['numbers', f])).stdout, /2026-10-26,steps,7100,/);
  assert.match((await run(['today', f, '--date', '2026-10-28'])).stderr, /added 2026-10-28/);
  assert.match((await run(['today', f, '--date', '2026-10-28'])).stderr, /already has 2026-10-28/);
  assert.match((await run(['rollover', f, '--date', '2026-10-28'])).stderr, /2 open tasks carried to 2026-10-28/);
  assert.match(fs.readFileSync(f, 'utf8'), /### 2026-10-28 \| Wednesday\n\n\[ \] Call Sam back\n\[!\] Post the letter\n/);
  assert.match((await run(['review', f, '--date', '2026-10-28'])).stderr, /review of 2026-10-26 to 2026-11-01/);
  assert.match((await run(['todoist', f, '--dry-run'])).stdout, /Call Sam back\n.*Post the letter/);
});

test('the webhook: tasks, events and numbers posted as JSON; the writing is not', async () => {
  const d = tmp(), f = path.join(d, 'j.jot'); fs.writeFileSync(f, `${J}\nA private thought.\n`);
  const got = []; const srv = http.createServer((q, r) => { let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => { got.push({ type: q.headers['content-type'], body: JSON.parse(b) }); r.end('ok'); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  try {
    const r = await run(['post', `http://127.0.0.1:${srv.address().port}/hook`, f, '--open']);
    assert.match(r.stderr, /sent 2 tasks, 1 events and 0 numbers \(200\)/);
    assert.equal(got[0].type, 'application/json'); assert.deepEqual(got[0].body.files[0].tasks.map((t) => t.text), ['Call Sam back', 'Post the letter']);
    assert.ok(!JSON.stringify(got[0].body).includes('private thought'));
  } finally { srv.close(); }
});

test('mistakes are said plainly, with a non-zero exit', async () => {
  for (const [args, msg] of [[['nope'], /unknown command "nope"/], [['tasks'], /which \.jot files/], [['tasks', '/no/such.jot'], /no such file/], [['today', 'x.jot', '--date', 'tomorrow'], /--date must look like 2026-10-26/], [['todoist', 'x.jot'], /no such file|TODOIST_TOKEN/], [['post', 'http://example.com/x', JOT], /https:\/\//]]) {
    const r = await run(args); assert.notEqual(r.code, 0, args.join(' ')); assert.match(r.stderr, msg, args.join(' '));
  }
  assert.match((await run(['help'])).stdout, /jot import <numbers\.csv> --into <journal\.jot>/);
});

test('import-health: Apple Health export.xml, chosen metrics and dates, --list, --dry-run; ZIP refused; a Fitbit CSV', async () => {
  const d = tmp(), f = path.join(d, 'j.jot'), xml = path.join(d, 'export.xml'), zip = path.join(d, 'export.zip'); fs.writeFileSync(f, J);
  const r = (type, day, value, unit = 'count') => `<Record type="HKQuantityTypeIdentifier${type}" sourceName="Phone" unit="${unit}" startDate="${day} 08:00:00 +0000" endDate="${day} 09:00:00 +0000" value="${value}"/>\n`;
  fs.writeFileSync(xml, `<?xml version="1.0"?>\n<HealthData>\n${r('StepCount', '2026-10-25', 4000)}${r('StepCount', '2026-10-25', 1000)}${r('StepCount', '2026-10-26', 300)}${r('HeartRate', '2026-10-25', 64, 'count/min')}${r('BloodGlucose', '2026-10-25', 90, 'mg/dL')}</HealthData>\n`);
  const list = await run(['import-health', xml, '--list']); assert.match(list.stdout, /Apple Health: 2026-10-25 to 2026-10-26\n {2}heart-rate\s+1 days/); assert.match(list.stdout, /never read: medications/); assert.doesNotMatch(list.stdout, /glucose/i);
  const dry = await run(['import-health', xml, '--into', f, '--metric', 'steps', '--until', '2026-10-25', '--dry-run']);
  assert.match(dry.stdout, /#steps-2026-10-25\nmetric: steps\nvalue: 5000\naggregation: sum\nsource: Apple Health export\.xml\n:::/); assert.doesNotMatch(dry.stdout, /heart-rate|2026-10-26/); assert.equal(fs.readFileSync(f, 'utf8'), J);
  assert.match((await run(['import-health', xml, '--into', f])).stderr, /0 blanks filled, 3 numbers added, 0 already there \(heart-rate, steps\)/);
  assert.match((await run(['import-health', xml, '--into', f])).stderr, /3 already there/);
  assert.match((await run(['import-health', xml, '--into', f, '--metric', 'glucose'])).stderr, /not in this file: glucose/);
  fs.writeFileSync(zip, 'PK\u0003\u0004rest'); assert.match((await run(['import-health', zip, '--into', f])).stderr, /Unzip export\.zip first/);
  const csv = path.join(d, 'fitbit.csv'); fs.writeFileSync(csv, 'Date,Steps,Minutes Asleep,Minutes Sedentary\n2026-10-27,"9,000",420,600\n');
  assert.match((await run(['import-health', csv, '--into', f, '--metric', 'Sleep Minutes', '--metric', 'steps'])).stderr, /2 numbers added.*\(sleep-minutes, steps\)/);
  assert.match(fs.readFileSync(f, 'utf8'), /#sleep-minutes-2026-10-27\nmetric: sleep-minutes\nvalue: 420\nunit: min\naggregation: sum\nsource: Fitbit fitbit\.csv/);
});
