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
