#!/usr/bin/env node
// jot: a journal's tasks, events and numbers on the command line, for scripts, cron, Shortcuts and automation services.
// Reading never changes a file; the commands that write (import, today, rollover, review, todoist) say what they changed, and --dry-run
// prints the result instead. Only `post`, `todoist` and `today --weather` reach the internet, and only when you run them.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../parser/jot.mjs';
import A from '../parser/automation.mjs';
import { sendWebhook, todoistAdd, weather } from '../parser/connect.mjs';
import { flatten, notice } from '../parser/include.mjs';

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

Writing (one journal; --dry-run prints the new text instead):
  jot import <numbers.csv> --into <journal.jot> [--combine sum|mean|last] [--day-first] [--source NAME] [--metric NAME…]
                                                         numbers from a health or fitness app's CSV, into their days
  jot today <journal.jot> [--date DATE] [--weather LAT,LON]   today's entry, if there is none (and the day's weather, from Open-Meteo)
  jot rollover <journal.jot> [--date DATE]               open tasks from earlier days carried to today ([>] where they were)
  jot review <journal.jot> [--date DATE]                 a review of the week: done, open, the numbers, a chart

Connections (only when you run them):
  jot post <url> <files…> [--open] [--since DATE]        POST the tasks, events and numbers as JSON to a webhook (Zapier, Make, n8n …)
  jot todoist <journal.jot>                              open tasks not sent before, to Todoist (token in TODOIST_TOKEN);
                                                         remembered in the journal's #sync-todoist record

DATE is YYYY-MM-DD; "today" is your computer's date.`;

const args = process.argv.slice(2), cmd = ((c) => (c === '--flatten' ? 'flatten' : c))(args.shift());
const opt = (name, def = null) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const fail = (msg) => { process.stderr.write(`jot: ${msg}\n`); process.exit(1); };
const read = (f) => { if (!fs.existsSync(f)) fail(`no such file: ${f}`); const b = fs.readFileSync(f); if (b[0] === 0x50 && b[1] === 0x4b) fail(`${f} is a packaged .jotz; open it in the workspace, or use its journal.txt`); return b.toString('utf8'); };
const writeBack = (file, text, said, dry) => { if (dry) { process.stdout.write(text); return; } fs.writeFileSync(file, text); process.stderr.write(`${said}\n`); };
const date = (v, what = '--date') => { const d = v || A.localToday(); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) fail(`${what} must look like 2026-10-26`); return d; };
const out = (s) => process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { out(HELP); return; }
  if (cmd === 'flatten') return flattenCmd();
  if (!['tasks', 'events', 'numbers', 'ics', 'json', 'post', 'import', 'today', 'rollover', 'review', 'todoist'].includes(cmd)) fail(`unknown command "${cmd}" (jot help lists them)`);
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
main().catch((e) => fail(e.message));
