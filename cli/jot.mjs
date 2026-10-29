#!/usr/bin/env node
// jot: a journal's tasks, events and numbers on the command line, for scripts, cron, Shortcuts and automation services.
// Reading never changes a file; the commands that write (import, import-health, today, rollover, review, todoist) say what they changed, and --dry-run
// prints the result instead. Only `post`, `todoist` and `today --weather` reach the internet, and only when you run them.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../parser/jot.mjs';
import { readDocument } from '../parser/container.mjs';
import A from '../parser/automation.mjs';
import Q from '../parser/query.mjs';

import H from '../parser/health.mjs';
import { sendWebhook, todoistAdd, weather } from '../parser/connect.mjs';
import { flatten, notice } from '../parser/include.mjs';
import { createLock, lock, unlock, isLocked, kindOf, waysIn, LOCK_EXTENSION, DEFAULT_ITERATIONS } from '../parser/lock.mjs';

const HELP = `jot: tasks, events and numbers from .jot journals

Reading (any number of files; nothing is changed):
  jot tasks <files…> [--status open|completed|migrated|scheduled|cancelled] [--since DATE] [--json]
  jot events <files…> [--since DATE] [--json]
  jot numbers <files…> [--metric NAME] [--json]          numbers as CSV (date,metric,value,unit), or JSON
  jot ics <files…> [-o out.ics] [--name NAME] [--done] [--tasks-as-events]
                                                         events and dated tasks for any calendar app
  jot json <files…>                                      everything above, as one JSON document
  jot flatten <journal.jot> [-o copy.jot] [--root DIR]   a copy with every ![label](other.jot#id) include written out (to
                                                         stdout, or -o; never over the journal). Only .jot files inside DIR
                                                         (default: the journal's folder) are read
  jot query <files…> [--json]                            run the query records (:::record query) written in the files
  jot query <files…> --show tasks|events|entries|numbers [--status S] [--priority high|normal] [--tag T] [--context C]
            [--text WORDS] [--metric M] [--start DATE] [--end DATE | --period day|week|month [--date DATE]]
            [--stat count|sum|average|min|max] [--limit N] [--json]
                                                         or ask one here, of each file (same fields as the record)

  jot check <files…> [--strict] [--json]                 problems as file:line:col severity code message; exit 1 on an
                                                         error (or, with --strict, a warning); reads .jotz too

Writing (one journal; --dry-run prints the new text instead):
  jot import <numbers.csv> --into <journal.jot> [--combine sum|mean|last] [--day-first] [--source NAME] [--metric NAME…]
                                                         numbers from a health or fitness app's CSV, into their days
  jot import-health <export.xml|export.csv> --into <journal.jot> [--metric NAME…] [--since DATE] [--until DATE]
                    [--list] [--day-first] [--source NAME]
                                                         daily numbers from Apple Health's export.xml, or a Health Connect,
                                                         Google Fit, Fitbit, Garmin or Oura CSV; --list shows what is in it
  jot today <journal.jot> [--date DATE] [--weather LAT,LON]   today's entry, if there is none (and the day's weather, from Open-Meteo)
  jot rollover <journal.jot> [--date DATE]               open tasks from earlier days carried to today ([>] where they were)
  jot review <journal.jot> [--date DATE]                 a review of the week: done, open, the numbers, a chart

Locking (a passphrase, from a hidden prompt or JOT_PASSPHRASE; never on the command line):
  jot lock <journal.jot|.jotz> [-o out.jotlock] [--iterations N] [--recovery-code]
                                                         an encrypted copy that unlocks to the same bytes; the journal itself is
                                                         left as it is. --recovery-code also makes a code that opens it, shown
                                                         once. Without one of them nobody can unlock it, you included
  jot unlock <journal.jotlock> [-o out | -o -] [--recovery]
                                                         the journal back (.jot or .jotz, by content); never over an existing file.
                                                         --recovery: with the recovery code (hidden prompt or JOT_RECOVERY_CODE)
  jot lock-info <journal.jotlock>                        its ways in: passphrase, recovery code, passkeys (which open it only on
                                                         the site they were added on)

Connections (only when you run them):
  jot post <url> <files…> [--open] [--since DATE]        POST the tasks, events and numbers as JSON to a webhook (Zapier, Make, n8n …)
  jot todoist <journal.jot>                              open tasks not sent before, to Todoist (token in TODOIST_TOKEN);
                                                         remembered in the journal's #sync-todoist record

DATE is YYYY-MM-DD; "today" is your computer's date.`;

const args = process.argv.slice(2), cmd = ((c) => (c === '--flatten' ? 'flatten' : c))(args.shift());
const opt = (name, def = null) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const fail = (msg) => { process.stderr.write(`jot: ${msg}\n`); process.exit(1); };
const read = (f) => { if (!fs.existsSync(f)) fail(`no such file: ${f}`); const b = fs.readFileSync(f); if (isLocked(b)) fail(`${f} is locked; unlock it first (jot unlock)`); if (b[0] === 0x50 && b[1] === 0x4b) fail(`${f} is a packaged .jotz; open it in the workspace, or use its journal.txt`); return b.toString('utf8'); };
const writeBack = (file, text, said, dry) => { if (dry) { process.stdout.write(text); return; } fs.writeFileSync(file, text); process.stderr.write(`${said}\n`); };
const date = (v, what = '--date') => { const d = v || A.localToday(); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) fail(`${what} must look like 2026-10-26`); return d; };
const out = (s) => process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { out(HELP); return; }
  if (cmd === 'flatten') return flattenCmd();
  if (cmd === 'query') return query();

  if (cmd === 'check') return check();
  if (cmd === 'lock' || cmd === 'unlock' || cmd === 'lock-info') return lockCmd();
  if (!['tasks', 'events', 'numbers', 'ics', 'json', 'post', 'import', 'import-health', 'today', 'rollover', 'review', 'todoist'].includes(cmd)) fail(`unknown command "${cmd}" (jot help lists them)`);
  if (['tasks', 'events', 'numbers', 'ics', 'json', 'post'].includes(cmd)) {
    const url = cmd === 'post' ? args.shift() : null;
    const status = opt('--status'), since = opt('--since'), metric = opt('--metric'), o = opt('-o'), name = opt('--name');
    const json = flag('--json'), done = flag('--done'), asEvents = flag('--tasks-as-events'), open = flag('--open');
    if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) fail('--since must look like 2026-10-26');
    const files = args.filter((a) => !a.startsWith('--')); if (!files.length) fail(`${cmd}: which .jot files?`);
    const docs = files.map((f) => ({ file: f, ast: parse(read(f)) }));
    const all = (key) => docs.flatMap(({ file, ast }) => A.extract(ast)[key].map((x) => ({ ...x, file })));
    const keep = (d) => !since || (d && d >= since);
    if (cmd === 'tasks') {
      const t = all('tasks').filter((x) => (!status || x.status === status) && keep(x.date)).map(({ text, status: s, priority, date: d, file }) => ({ date: d, status: s, priority, text, file }));
      if (json) return out(JSON.stringify(t, null, 2));
      const sign = { open: '[ ]', completed: '[x]', migrated: '[>]', scheduled: '[<]', cancelled: '[-]' };
      return out(t.map((x) => `${x.date || '          '}  ${x.priority === 'high' ? '[!]' : sign[x.status]} ${x.text}${files.length > 1 ? `  (${path.basename(x.file)})` : ''}`).join('\n') || '(no tasks)');
    }
    if (cmd === 'events') {
      const e = all('events').filter((x) => keep(x.date)).map(({ text, date: d, time, file }) => ({ date: d, time, text, file }));
      if (json) return out(JSON.stringify(e, null, 2));
      return out(e.map((x) => `${x.date || '          '} ${x.time || '     '}  ${x.text}`).join('\n') || '(no events)');
    }
    if (cmd === 'numbers') {
      const n = all('numbers').filter((x) => !metric || x.metric === metric).map(({ date: d, metric: m, value, unit }) => ({ date: d, metric: m, value, unit }));
      if (json) return out(JSON.stringify(n, null, 2));
      return out(`date,metric,value,unit\n${n.map((x) => [x.date, x.metric, x.value, x.unit].join(',')).join('\n')}`);
    }
    if (cmd === 'ics') {
      const ast = parse(docs.map((d) => read(d.file)).join('\n\n'));
      const ics = A.toICS(ast, { name: name || (files.length === 1 ? path.basename(files[0], '.jot') : 'Jot journal'), includeDone: done, tasksAsEvents: asEvents, stamp: new Date().toISOString().replace(/[-:]|\.\d+/g, '') });
      if (o) { fs.writeFileSync(o, ics); process.stderr.write(`wrote ${o}\n`); } else process.stdout.write(ics);
      return;
    }
    const body = { format: 'jot-automation', version: 1, files: docs.map(({ file, ast }) => A.payload(ast, { file: path.basename(file), open, since })) };
    if (cmd === 'json') return out(JSON.stringify(body, null, 2));
    if (!url) fail('post: which webhook address?');
    const r = await sendWebhook(url, body); process.stderr.write(`sent ${body.files.reduce((k, f) => k + f.tasks.length, 0)} tasks, ${body.files.reduce((k, f) => k + f.events.length, 0)} events and ${body.files.reduce((k, f) => k + f.numbers.length, 0)} numbers (${r.status})\n`);
    return;
  }
  const dry = flag('--dry-run');
  if (cmd === 'import') {
    const csv = args.shift(), into = opt('--into'), combine = opt('--combine', 'sum'), from = opt('--source'), dayFirst = flag('--day-first'), only = [];
    for (let m; (m = opt('--metric'));) only.push(m);
    if (!csv || !into) fail('import <numbers.csv> --into <journal.jot>');
    if (!['sum', 'mean', 'last'].includes(combine)) fail('--combine is sum, mean or last');
    const r = A.readCSV(read(csv), { combine, dayFirst: dayFirst || null, only: only.length ? only : null });
    if (r.ambiguous) process.stderr.write(`${r.ambiguous} rows have dates like 03/04/2026 that could be either way round: add --day-first if the day comes first\n`);
    const w = A.addNumbers(fs.existsSync(into) ? read(into) : '', r.numbers, { source: from || path.basename(csv) });
    return writeBack(into, w.text, `${into}: ${w.filled} blanks filled, ${w.added} numbers added, ${w.kept} already there (${r.metrics.join(', ') || 'no numbers'}; ${r.rows} rows${r.skipped ? `, ${r.skipped} without a date` : ''})`, dry);
  }
  if (cmd === 'import-health') {
    const input = args.shift(), into = opt('--into'), from = opt('--source'), since = opt('--since'), until = opt('--until'), dayFirst = flag('--day-first'), list = flag('--list'), only = [];
    for (let m; (m = opt('--metric'));) only.push(m.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    if (!input || (!into && !list)) fail('import-health <export.xml|file.csv> --into <journal.jot> (or --list)');
    for (const [v, n] of [[since, '--since'], [until, '--until']]) if (v) date(v, n);
    if (!fs.existsSync(input)) fail(`no such file: ${input}`);
    const fd = fs.openSync(input, 'r'), start = Buffer.alloc(512); fs.readSync(fd, start, 0, 512, 0); fs.closeSync(fd);
    const kind = H.healthKind(input, start.toString('utf8')); if (kind instanceof Error) fail(kind.message);
    let s;
    if (kind === 'apple') { if (fs.statSync(input).size > H.LIMITS.xmlBytes) fail(`${input} is larger than ${H.LIMITS.xmlBytes / 1024 ** 3} GB, more than Jot reads at once`); const sc = H.appleHealthScanner(); for await (const chunk of fs.createReadStream(input, { encoding: 'utf8', highWaterMark: 1 << 20 })) sc.push(chunk); s = sc.end(); }
    else { if (fs.statSync(input).size > H.LIMITS.csvBytes) fail(`${input} is larger than ${H.LIMITS.csvBytes / 1024 ** 2} MB; export a shorter date range`); s = H.readHealthCSV(read(input), { dayFirst: dayFirst || null }); }
    if (list || !s.metrics.length) {
      out(`${s.name}${s.preset === 'generic' ? ' (columns read as they are)' : ''}: ${s.metrics.length ? `${s.first} to ${s.last}` : 'no numbers Jot reads'}`);
      for (const m of s.metrics) out(`  ${m.metric.padEnd(24)} ${String(m.days).padStart(5)} days  ${m.first} to ${m.last}  ${m.aggregation}${m.unit ? `, ${m.unit}` : ''}${m.optional ? '  (only with --metric)' : ''}`);
      if (s.leftOut?.length) out(`  left out: ${s.leftOut.join(', ')}`);
      out(`  never read: ${H.LEFT_OUT}`);
      if (!s.metrics.length && !list) process.exitCode = 1;
      return;
    }
    const unknown = only.filter((m) => !s.metrics.some((x) => x.metric === m)); if (unknown.length) fail(`not in this file: ${unknown.join(', ')} (--list shows what is)`);
    if (s.ambiguous) process.stderr.write(`${s.ambiguous} rows have dates like 03/04/2026 that could be either way round: add --day-first if the day comes first\n`);
    const numbers = s.numbers({ metrics: only.length ? only : null, since, until });
    const w = A.addNumbers(fs.existsSync(into) ? read(into) : '', numbers, { source: from || (kind === 'apple' ? `Apple Health ${path.basename(input)}` : `${s.name} ${path.basename(input)}`.replace(/^(CSV|Health app) /, '')) });
    return writeBack(into, w.text, `${into}: ${w.filled} blanks filled, ${w.added} numbers added, ${w.kept} already there${w.skipped ? `, ${w.skipped} blanks left empty (a different unit)` : ''} (${[...new Set(numbers.map((n) => n.metric))].join(', ') || 'no numbers in that range'})`, dry);
  }
  const file = args.shift(); if (!file) fail(`${cmd}: which journal?`);
  const d = date(opt('--date'));
  if (cmd === 'today') {
    const at = opt('--weather'); let extra = '';
    if (at) { const [lat, lon] = at.split(',').map(Number); extra = (await weather(lat, lon, d)).record; }
    const src = fs.existsSync(file) ? read(file) : '', r = A.todayEntry(src, d, { extra });
    if (!r.added) { process.stderr.write(`${file} already has ${d}\n`); return; }
    return writeBack(file, r.text, `${file}: added ${d}${extra ? ' with its weather' : ''}`, dry);
  }
  if (cmd === 'rollover') { const r = A.rollover(read(file), d); return r.moved ? writeBack(file, r.text, `${file}: ${r.moved} open ${r.moved === 1 ? 'task' : 'tasks'} carried to ${d}`, dry) : process.stderr.write('no open tasks from earlier days\n'); }
  if (cmd === 'review') { const r = A.weekReview(read(file), d); return writeBack(file, r.text, `${file}: review of ${r.week.start} to ${r.week.end} (${r.week.done} done, ${r.week.open} open)`, dry); }
  if (cmd === 'todoist') {
    const token = process.env.TODOIST_TOKEN; if (!token && !dry) fail('set TODOIST_TOKEN to your Todoist API token (Todoist: Settings → Integrations → Developer)');
    const src = read(file), todo = A.pendingSync(parse(src), 'todoist').map((t) => ({ ...t, key: A.taskKey(t) }));
    if (!todo.length) { process.stderr.write('nothing new to send\n'); return; }
    if (dry) { out(todo.map((t) => `${t.date || ''} ${t.text}`).join('\n')); return; }
    const sent = await todoistAdd(todo, token);
    return writeBack(file, A.markSynced(src, 'todoist', todo.filter((t) => sent.some((s) => s.key === t.key)), { at: new Date().toISOString().slice(0, 16) }), `sent ${sent.length} ${sent.length === 1 ? 'task' : 'tasks'} to Todoist`, false);
  }
  fail(`unknown command "${cmd}" (jot help lists them)`);
}
// An include's file, read only inside the root: the path is already checked (include.mjs), and a symlink may not lead out either.
function readInside(root, rel) {
  const inside = (r, a) => { const d = path.relative(r, a); return !!d && !d.startsWith('..') && !path.isAbsolute(d); };
  try {
    const abs = path.resolve(root, ...rel.split('/')); if (!inside(root, abs) || !/\.jot$/i.test(abs)) return null;
    const real = fs.realpathSync(abs); if (!inside(fs.realpathSync(root), real) || !fs.statSync(real).isFile() || fs.statSync(real).size > 1024 * 1024) return null;
    const b = fs.readFileSync(real); return b[0] === 0x50 && b[1] === 0x4b ? null : b.toString('utf8');
  } catch { return null; }
}
async function flattenCmd() {
  const o = opt('-o'), rootOpt = opt('--root'), file = args.find((a) => !a.startsWith('--')); if (!file) fail('flatten: which journal?');
  const src = read(file), root = path.resolve(rootOpt || path.dirname(file)), from = path.relative(root, path.resolve(file)).split(path.sep).join('/');
  if (!from || from.startsWith('..') || path.isAbsolute(from)) fail('flatten: the journal must be inside --root');
  if (o && path.resolve(o) === path.resolve(file)) fail('flatten writes a copy: give -o another name than the journal');
  const r = await flatten(src, { from, read: (rel) => readInside(root, rel) });
  for (const p of r.problems) process.stderr.write(`${p.from}: include ${notice(p.kind, p.href)}\n`);
  if (o) { fs.writeFileSync(o, r.text); process.stderr.write(`wrote ${o}: ${r.expanded} ${r.expanded === 1 ? 'include' : 'includes'} written out${r.problems.length ? `, ${r.problems.length} left as they were` : ''}\n`); } else process.stdout.write(r.text);
}
// A query is the same whether written in a journal or typed here (query.mjs); a problem with it is an error, never an empty answer.
function query() {
  const json = flag('--json'), anchor = opt('--date'), fields = [];
  for (const name of ['show', 'status', 'priority', 'tag', 'context', 'text', 'metric', 'period', 'start', 'end', 'stat', 'limit']) {
    const v = opt(`--${name}`); if (v === null) continue;
    if (v === undefined || v.startsWith('--')) fail(`query: --${name} needs a value`);
    fields.push({ name, value: v });
  }
  if (anchor !== null && (anchor === undefined || anchor.startsWith('--'))) fail('query: --date needs a value');
  const stray = args.find((a) => a.startsWith('--')); if (stray) fail(`query: unknown option ${stray} (jot help lists them)`);
  const files = args; if (!files.length) fail('query: which .jot files?');
  let results;
  if (fields.length) {
    if (!fields.some((f) => f.name === 'show')) fail('query: say what to show (--show tasks, events, entries or numbers)');
    const d = date(anchor); // each file on its own, so one file's dates and open blocks never run into the next
    results = files.map((file) => ({ file, model: Q.runQuery(parse(read(file)), fields, { date: d }) }));
  } else {
    if (anchor) fail('query: --date anchors --period; a query record counts from its own entry');
    results = files.flatMap((file) => Q.queries(parse(read(file))).map(({ model }) => ({ file, model })));
    if (!results.length) fail(`query: no query records in ${files.join(', ')} (write :::record query, or ask with --show)`);
  }
  const problems = results.filter((r) => r.model.problems.length);
  for (const { file, model } of problems) for (const p of model.problems) process.stderr.write(`jot: ${file ? `${file}: ` : ''}query${model.id ? ` #${model.id}` : ''}: ${p.message}\n`);
  if (json) out(JSON.stringify(results.map(({ file, model }) => ({ file, id: model.id, label: model.label, show: model.show, start: model.start || null, end: model.end || null, total: model.total, summary: model.summary, stats: model.stats, rows: model.rows, problems: model.problems })), null, 2));
  else out(results.map(({ file, model }) => (fields.length ? (files.length > 1 ? `# ${path.basename(file)}\n` : '') : `# ${model.label || (model.id ? `#${model.id}` : 'Query')}${files.length > 1 ? ` (${path.basename(file)})` : ''}\n`) + Q.queryText(model)).join('\n\n'));
  if (problems.length) process.exitCode = 1;
}
// Byte offsets (the parser's) become 1-based line and column (in characters), as editors and CI annotations expect. Lines end at
// \n, \r\n or \r, as the parser counts them. A missing or unreadable file is reported as an error and the others are still checked.
async function check() {
  const json = flag('--json'), strict = flag('--strict'), unknown = args.find((a) => a.startsWith('--')); if (unknown) fail(`check: unknown option ${unknown}`);
  const files = args; if (!files.length) fail('check: which .jot files?');
  const found = [], problem = (file, code, message) => found.push({ file, line: 1, column: 1, severity: 'error', code, message });
  for (const file of files) {
    if (!fs.existsSync(file)) { problem(file, 'missing', 'No such file.'); continue; }
    const raw = fs.readFileSync(file); let source = raw.toString('utf8');
    if (isLocked(raw)) { problem(file, 'locked', 'Locked: unlock it first (jot unlock), then check the copy.'); continue; }
    if (raw[0] === 0x50 && raw[1] === 0x4b) try { ({ source } = await readDocument(new Uint8Array(raw))); } catch (e) { problem(file, 'unreadable', e.message); continue; }
    source = source.replace(/^\uFEFF/, '');
    const bytes = Buffer.from(source, 'utf8'), starts = [0];
    for (let i = 0; i < bytes.length; i++) if (bytes[i] === 0x0a || (bytes[i] === 0x0d && bytes[i + 1] !== 0x0a)) starts.push(i + 1);
    for (const d of parse(source).diagnostics) {
      let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= d.start) lo = mid; else hi = mid - 1; }
      found.push({ file, line: lo + 1, column: [...bytes.subarray(starts[lo], d.start).toString('utf8')].length + 1, severity: d.severity, code: d.code, message: d.message });
    }
  }
  const errors = found.filter((d) => d.severity === 'error').length, warnings = found.filter((d) => d.severity === 'warning').length;
  if (json) out(JSON.stringify(found, null, 2)); else if (found.length) out(found.map((d) => `${d.file}:${d.line}:${d.column} ${d.severity} ${d.code} ${d.message}`).join('\n'));
  process.stderr.write(`${files.length} ${files.length === 1 ? 'file' : 'files'}: ${errors} ${errors === 1 ? 'error' : 'errors'}, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}\n`);
  if (errors || (strict && warnings)) process.exitCode = 1;
}
// A passphrase from JOT_PASSPHRASE (scripts, tests), else typed at a terminal without echo; twice when locking, so a typo can't
// lock a journal for good.
function hidden(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin; let typed = '';
    process.stderr.write(prompt); input.setRawMode(true); input.resume(); input.setEncoding('utf8');
    const done = (err) => { input.setRawMode(false); input.pause(); input.removeListener('data', onData); process.stderr.write('\n'); err ? reject(err) : resolve(typed); };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done();
        if (ch === '\u0003' || ch === '\u0004') return done(new Error('cancelled'));
        if (ch === '\u007f' || ch === '\b') typed = [...typed].slice(0, -1).join(''); else if (ch >= ' ') typed += ch;
      }
    };
    input.on('data', onData);
  });
}
async function passphrase(twice, what = 'Passphrase', env = 'JOT_PASSPHRASE') {
  if (process.env[env]) return process.env[env];
  if (!process.stdin.isTTY) fail(`a ${what.toLowerCase()} is needed: run this at a terminal, or set ${env}`);
  const first = await hidden(`${what}: `);
  if (!first) fail('no passphrase given; nothing was changed');
  if (twice && first !== await hidden('Same passphrase again: ')) fail('the two passphrases differ; nothing was changed');
  return first;
}

async function lockCmd() {
  const o = opt('-o'), iterations = Number(opt('--iterations', DEFAULT_ITERATIONS)), withCode = flag('--recovery-code'), byCode = flag('--recovery');
  const unknown = args.find((a) => a.startsWith('--')); if (unknown) fail(`${cmd}: unknown option ${unknown}`);
  const file = args.shift(); if (!file || args.length) fail(`${cmd}: one journal, please`);
  if (!fs.existsSync(file)) fail(`no such file: ${file}`);
  const raw = new Uint8Array(fs.readFileSync(file)), base = path.join(path.dirname(file), path.basename(file).replace(/\.[^.]*$/, ''));
  if (cmd === 'lock-info') {
    if (!isLocked(raw)) fail(`${file} is not locked`);
    const names = { passphrase: 'passphrase', 'recovery-code': 'recovery code', 'webauthn-prf': 'passkey or security key' };
    out(waysIn(raw).map((w) => `${names[w.type]}${w.label ? ` (${w.label})` : ''}${w.rp ? `, on ${w.rp} only (not from here)` : ''}`).join('\n'));
    return;
  }
  if (cmd === 'lock') {
    if (isLocked(raw)) fail(`${file} is already locked`);
    const target = o || base + LOCK_EXTENSION; if (fs.existsSync(target)) fail(`${target} exists; choose another name with -o`);
    const { session, recoveryCode } = await createLock(await passphrase(true), { iterations, recoveryCode: withCode });
    const locked = await lock(raw, session);
    fs.writeFileSync(target, locked, { flag: 'wx' });
    if (recoveryCode) process.stderr.write(`Recovery code, shown this once: ${recoveryCode}\nIt opens the journal like the passphrase. Keep it apart from the journal (a password manager, or on paper somewhere safe).\n`);
    process.stderr.write(`${file}: locked to ${target} (checked: it unlocks to the same bytes).\n` +
      `The unlocked ${path.basename(file)} is still there; delete it if you want only the locked copy (a deleted file can stay on a disk).\n` +
      (recoveryCode ? 'Without the passphrase or the recovery code' : 'Without the passphrase') + ' nobody can unlock it, you included: keep it in a password manager.\n');
    return;
  }
  if (!isLocked(raw)) fail(`${file} is not locked`);
  const plain = await unlock(raw, byCode ? { recoveryCode: await passphrase(false, 'Recovery code', 'JOT_RECOVERY_CODE') } : await passphrase(false));
  if (o === '-') { process.stdout.write(plain); return; }
  const target = o || base + '.' + kindOf(plain); if (fs.existsSync(target)) fail(`${target} exists; choose another name with -o`);
  fs.writeFileSync(target, plain, { flag: 'wx' });
  process.stderr.write(`${file}: unlocked to ${target}. That copy is not encrypted.\n`);
}

main().catch((e) => fail(e.message));
