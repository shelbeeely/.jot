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

test('check: problems as file:line:col, exit 1 on an error; warnings fail only with --strict; .jotz is read too', async () => {
  const d = tmp(), ok = path.join(d, 'ok.jot'), bad = path.join(d, 'bad.jot'), warn = path.join(d, 'warn.jot'); fs.writeFileSync(ok, J);
  fs.writeFileSync(bad, '### 2026-10-25 | Sunday\n\nCafé — notes\n\n:::record measurement #x\nmetric: sleep\n'); fs.writeFileSync(warn, '### 2026-02-30 | Monday\n\nHi\n');
  let r = await run(['check', ok]); assert.equal(r.code, 0); assert.equal(r.stdout, ''); assert.match(r.stderr, /1 file: 0 errors, 0 warnings/);
  r = await run(['check', ok, bad]); assert.equal(r.code, 1); assert.equal(r.stdout, `${bad}:5:1 error unclosed-record Record consumes through end of file. Add ::: to close it.\n`);
  r = await run(['check', warn]); assert.equal(r.code, 0); assert.match(r.stdout, /warn\.jot:1:1 warning invalid-date /);
  r = await run(['check', warn, '--strict', '--json']); assert.equal(r.code, 1); assert.deepEqual(JSON.parse(r.stdout).map((x) => [x.line, x.column, x.severity, x.code]), [[1, 1, 'warning', 'invalid-date']]);
  assert.equal((await run(['check', new URL('../examples/packaged.jotz', import.meta.url).pathname])).code, 0);
  const cr = path.join(d, 'cr.jot'), bom = path.join(d, 'bom.jot'); fs.writeFileSync(cr, '### 2026-10-25 | Sunday\r\rHi\r\r:::record x\rmetric: a\r'); fs.writeFileSync(bom, '\uFEFF### 2026-02-30 | Monday\r\n\r\nHi\r\n');
  assert.match((await run(['check', cr])).stdout, /cr\.jot:5:1 error unclosed-record/);
  assert.match((await run(['check', bom])).stdout, /bom\.jot:1:1 warning invalid-date/, 'a byte-order mark hides nothing');
  r = await run(['check', bad, path.join(d, 'gone.jot')]); assert.equal(r.code, 1); assert.match(r.stdout, /bad\.jot:5:1 error unclosed-record[^\n]*\n.*gone\.jot:1:1 error missing No such file\.\n$/);
});

test('the to-jot skill: one copy for Codex and Claude Code, and its worked examples pass check --strict', async () => {
  const root = new URL('../', import.meta.url).pathname, skill = path.join(root, '.agents/skills/to-jot');
  const link = path.join(root, '.claude/skills/to-jot'); // a checkout without symlinks (Windows) writes the link as a file naming its target
  assert.equal(fs.lstatSync(link).isSymbolicLink() ? fs.readlinkSync(link) : fs.readFileSync(link, 'utf8'), '../../.agents/skills/to-jot');
  assert.match(fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8'), /^---\nname: to-jot\ndescription: \S[^\n]+\n---\n/);
  const examples = fs.readdirSync(path.join(skill, 'reference')).filter((f) => f.endsWith('.jot')).map((f) => path.join(skill, 'reference', f));
  assert.ok(examples.length >= 3); const r = await run(['check', '--strict', ...examples]); assert.equal(r.code, 0, r.stdout); assert.equal(r.stdout, '');
});

test('mistakes are said plainly, with a non-zero exit', async () => {
  for (const [args, msg] of [[['nope'], /unknown command "nope"/], [['tasks'], /which \.jot files/], [['tasks', '/no/such.jot'], /no such file/], [['check'], /which \.jot files/], [['check', '--stirct', 'x.jot'], /unknown option --stirct/], [['today', 'x.jot', '--date', 'tomorrow'], /--date must look like 2026-10-26/], [['todoist', 'x.jot'], /no such file|TODOIST_TOKEN/], [['post', 'http://example.com/x', JOT], /https:\/\//]]) {
    const r = await run(args); assert.notEqual(r.code, 0, args.join(' ')); assert.match(r.stderr, msg, args.join(' '));
  }
  assert.match((await run(['help'])).stdout, /jot import <numbers\.csv> --into <journal\.jot>/);
});

test('flatten: a copy with includes written out; nothing outside the folder is read; the journal is never overwritten', async () => {
  const d = tmp(), dir = path.join(d, 'j'); fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  const f = path.join(dir, 'main.jot'), src = '# Me\n\n![Sunday](notes/week.jot#2026-10-25)\n\n![secret](../secret.jot)\n\n![gone](gone.jot)\n';
  fs.writeFileSync(f, src); fs.writeFileSync(path.join(d, 'secret.jot'), 'Private.\n');
  fs.writeFileSync(path.join(dir, 'notes/week.jot'), '### 2026-10-25\n\nRain.\n\n![back](../main.jot)\n\n### 2026-10-26\n\nSun.\n');
  const r = await run(['flatten', f]);
  assert.equal(r.code, 0); assert.match(r.stdout, /\/\*\nincluded from notes\/week\.jot#2026-10-25\n\*\/\n### 2026-10-25\n\nRain\.\n\n!\[back\]\(\.\.\/main\.jot\)\n/);
  assert.doesNotMatch(r.stdout, /Sun\.|Private/); assert.match(r.stdout, /!\[secret\]\(\.\.\/secret\.jot\)/);
  assert.match(r.stderr, /include not repeated: \.\.\/main\.jot/); assert.match(r.stderr, /include not allowed: \.\.\/secret\.jot/); assert.match(r.stderr, /include not found: gone\.jot/);
  const o = path.join(d, 'flat.jot'), w = await run(['flatten', f, '-o', o]);
  assert.match(w.stderr, /wrote .*flat\.jot: 1 include written out, 3 left as they were/); assert.match(fs.readFileSync(o, 'utf8'), /Rain\./);
  assert.equal((await run(['--flatten', f, '--root', d])).stdout.includes('Private.'), true, '--root widens what may be read, explicitly');
  assert.match((await run(['flatten', f, '-o', f])).stderr, /writes a copy/); assert.equal(fs.readFileSync(f, 'utf8'), src);
});

test('query: runs the query records in a file, or one asked with flags; a problem is an error, never an empty answer', async () => {
  const d = tmp(), f = path.join(d, 'j.jot');
  fs.writeFileSync(f, `${J}\n:::record query #open\nlabel: Still open\nshow: tasks\nstatus: open\n:::\n`);
  const r = await run(['query', f]);
  assert.equal(r.code, 0); assert.equal(r.stdout, '# Still open\n2 open tasks.\n\nDate        State        Task\n2026-10-25  to do        Call Sam back\n2026-10-27  to do, high  Post the letter\n');
  const j = JSON.parse((await run(['query', f, '--show', 'tasks', '--text', 'sam', '--json'])).stdout);
  assert.deepEqual([j[0].total, j[0].rows[0].text, j[0].summary], [1, 'Call Sam back', '1 task containing “sam”.']);
  assert.match((await run(['query', f, '--show', 'tasks', '--period', 'week', '--date', '2026-10-28'])).stdout, /^1 task from 2026-10-26 to 2026-11-01\./);
  const bad = await run(['query', f, '--show', 'tasks', '--status', 'opne']);
  assert.equal(bad.code, 1); assert.match(bad.stderr, /status: "opne" is not one of/);
  assert.match((await run(['query', f, '--colour', 'red'])).stderr, /unknown option --colour/);
  const none = path.join(d, 'none.jot'); fs.writeFileSync(none, J);
  assert.match((await run(['query', none])).stderr, /no query records/);
  assert.equal(fs.readFileSync(none, 'utf8'), J);
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


test('skill validator runs outside the repository, rejects warnings and errors, and checks packages', async () => {
  const validator = new URL('../.agents/skills/to-jot/scripts/validate.mjs', import.meta.url).pathname;
  const d = tmp(), good = path.join(d, 'good.jot'), warning = path.join(d, 'warning.jot'), bad = path.join(d, 'bad.jot');
  fs.writeFileSync(good, J); fs.writeFileSync(warning, '### 2026-02-30\n'); fs.writeFileSync(bad, ':::record observation\nbody: unfinished\n');
  const validate = (args) => new Promise((resolve) => execFile(process.execPath, [validator, ...args], { cwd: d }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
  assert.equal((await validate([good])).code, 0);
  let r = await validate(['--json', warning]); assert.equal(r.code, 1); assert.equal(JSON.parse(r.stdout)[0].code, 'invalid-date');
  assert.equal((await validate([bad])).code, 1);
  assert.equal((await validate([path.join(d, 'missing.jot')])).code, 1);
  assert.equal((await validate(['--repo', d, good])).code, 2);
  const { pack } = await import('../parser/container.mjs');
  const packed = path.join(d, 'good.jotz'); fs.writeFileSync(packed, await pack({ source: J, assets: [] }));
  assert.equal((await validate([packed])).code, 0);
  assert.equal(fs.readFileSync(good, 'utf8'), J);
});

test('lock and unlock: an encrypted copy, the same bytes back, nothing overwritten, other commands refuse a locked file', async () => {
  const d = tmp(), f = path.join(d, 'j.jot'), env = { JOT_PASSPHRASE: 'correct horse battery staple' }; fs.writeFileSync(f, J);
  const l = await run(['lock', f, '--iterations', '100000'], env);
  assert.equal(l.code, 0, l.stderr); assert.match(l.stderr, /locked to .*j\.jotlock[\s\S]*still there[\s\S]*nobody can unlock it/);
  const locked = path.join(d, 'j.jotlock'); assert.match(fs.readFileSync(locked, 'latin1'), /^JOTLOCK 1\n/); assert.doesNotMatch(fs.readFileSync(locked, 'latin1'), /Call Sam/);
  assert.equal(fs.readFileSync(f, 'utf8'), J, 'the journal itself is left alone');
  assert.match((await run(['lock', f], env)).stderr, /exists; choose another name/);
  assert.match((await run(['tasks', locked])).stderr, /is locked; unlock it first/);
  const c = await run(['check', locked]); assert.equal(c.code, 1); assert.match(c.stdout, /error locked/);
  assert.match((await run(['unlock', locked], env)).stderr, /j\.jot exists/, 'never over the original');
  const u = await run(['unlock', locked, '-o', path.join(d, 'back.jot')], env);
  assert.equal(u.code, 0, u.stderr); assert.equal(fs.readFileSync(path.join(d, 'back.jot'), 'utf8'), J); assert.match(u.stderr, /not encrypted/);
  assert.equal((await run(['unlock', locked, '-o', '-'], env)).stdout, J);
  const wrong = await run(['unlock', locked, '-o', '-'], { JOT_PASSPHRASE: 'nope' }); assert.equal(wrong.code, 1); assert.match(wrong.stderr, /does not open this journal, or the file was changed/);
  const none = await run(['unlock', locked, '-o', '-'], { JOT_PASSPHRASE: '' }); assert.equal(none.code, 1); assert.match(none.stderr, /passphrase is needed/);
  assert.match((await run(['unlock', f, '-o', '-'], env)).stderr, /is not locked/);
  // A recovery code: shown once when locking, then it opens the journal like the passphrase.
  const r = await run(['lock', f, '-o', path.join(d, 'r.jotlock'), '--iterations', '100000', '--recovery-code'], env);
  const rc = (r.stderr.match(/Recovery code, shown this once: (\S+)/) || [])[1]; assert.match(rc, /^(\w{5}-){4}\w{5}$/, r.stderr);
  assert.equal((await run(['lock-info', path.join(d, 'r.jotlock')])).stdout, 'passphrase\nrecovery code\n');
  assert.equal((await run(['unlock', path.join(d, 'r.jotlock'), '-o', '-', '--recovery'], { JOT_RECOVERY_CODE: rc.toLowerCase() })).stdout, J);
  assert.match((await run(['unlock', path.join(d, 'r.jotlock'), '-o', '-', '--recovery'], { JOT_RECOVERY_CODE: 'AAAAA-AAAAA-AAAAA-AAAAA-AAAAA' })).stderr, /does not open this journal/);
});

test('calendar export keeps each file and entry timezone independent', async () => {
  const dir = tmp(), london = path.join(dir, 'london.jot'), tokyo = path.join(dir, 'tokyo.jot');
  fs.writeFileSync(london, '---\nTimezone: Europe/London\n---\n### 2026-10-28\no Call at 09:00\n');
  fs.writeFileSync(tokyo, '---\nTimezone: Asia/Tokyo\n---\n### 2026-10-28\no Call at 09:00\n');
  let result = await run(['ics', london, tokyo]); assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /DTSTART:20261028T090000Z/); assert.match(result.stdout, /DTSTART:20261028T000000Z/);
  assert.equal((result.stdout.match(/BEGIN:VCALENDAR/g) || []).length, 1);
  result = await run(['events', london, '--json']); assert.equal(JSON.parse(result.stdout)[0].timezone, 'Europe/London');
  fs.writeFileSync(london, '### 2026-11-01\n@timezone: America/New_York\no Call at 01:30\n');
  result = await run(['ics', london]); assert.equal(result.code, 1); assert.match(result.stderr, /ambiguous/);
  fs.writeFileSync(london, '### 2026-10-28\n@timezone: Invalid/Zone\n');
  assert.equal((await run(['check', '--strict', london])).code, 1);
});
