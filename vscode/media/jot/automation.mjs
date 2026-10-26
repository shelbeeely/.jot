/** Jot automation, draft 0.1: what a journal holds, read out and written back, for exports, imports and small chores. Pure (strings in,
 * strings out; no DOM, no network), so the workspace, the `jot` command line and the VS Code extension all do exactly the same thing.
 * Nothing here sends anything anywhere: connections (connect.mjs) are separate, and only run when someone asks for them.
 *
 *   extract(ast)                       { tasks, events, numbers }: every task, event and number, with its date
 *   toICS(ast, opts)                   events and dated tasks as an iCalendar file (RFC 5545) any calendar app imports or subscribes to
 *   numbersCSV(ast) · tasksCSV(ast)    the numbers, the tasks, as CSV
 *   readCSV(text, opts)                a CSV of numbers (a health or fitness app's export) as numbers by date
 *   addNumbers(source, numbers, opts)  those numbers written into the journal: into empty value: blanks first, else under their day
 *   todayEntry(source, date, opts)     a dated entry for today, if there is none
 *   rollover(source, date)             open tasks from earlier days carried to today (marked [>] where they were)
 *   weekReview(source, date)           a review of the week: what got done, what is open, the numbers, a chart, room to write
 *   pendingSync / markSynced           which tasks a service has not had yet, and the record that remembers it
 *   payload(ast, opts)                 what a webhook receives: tasks, events and numbers as JSON
 *
 * Dates are the journal's own (YYYY-MM-DD, spec 5.3). A task or event belongs to the dated entry it is written under.
 */
import { parse } from './jot.mjs';
import { collectNumbers, metricKey, NUMBER } from './charts.mjs';

const enc = new TextEncoder();
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s) => DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const weekday = (d) => WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];
export const mondayOf = (d) => addDays(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));
/** Today in the journal's terms: the local calendar date (not UTC). */
export const localToday = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const fieldOf = (n, k) => { const f = n.fields && n.fields.find((x) => x.name === k); return f ? String(f.value).trim() : ''; };
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }
/** A node's start and end as string indexes (the AST counts UTF-8 bytes). */
function charSpans(source) {
  const map = []; let byte = 0;
  for (let i = 0; i < source.length; i++) { map[byte] = i; const c = source.codePointAt(i); const n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; if (c > 0xffff) i++; byte += n; }
  map[byte] = source.length;
  return (b) => { while (map[b] === undefined && b > 0) b--; return map[b] ?? 0; };
}
const dateOfNode = (ast) => { const out = new Array(ast.nodes.length).fill(null); for (const e of ast.entries) for (let j = e.startNode; j < e.endNode; j++) out[j] = e.date; return out; };

// ---- reading ----
// A time written in an event: 19:00, 7:30pm, 7pm, at 19 (a bare "at 7" is not a time: morning or evening?)
const TIME = /(?:^|\s|@)(?:at\s+)?(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W|$)|(?:^|\s)(?:at\s+)?([01]?\d|2[0-3])[:.h]([0-5]\d)(?=\W|$)|(?:^|\s)at\s+(1[3-9]|2[0-3])(?=\W|$)/i;
export function timeOf(text) {
  const m = TIME.exec(String(text || '')); if (!m) return null;
  let h, min;
  if (m[1]) { h = Number(m[1]) % 12; min = Number(m[2] || 0); if (/^p/i.test(m[3])) h += 12; if (h > 23 || min > 59) return null; }
  else if (m[4]) { h = Number(m[4]); min = Number(m[5]); }
  else { h = Number(m[6]); min = 0; }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
/** Every task, event and number in the journal, with its date (and, for tasks and events, where it is in the file). */
export function extract(ast) {
  const dates = dateOfNode(ast), tasks = [], events = [];
  ast.nodes.forEach((n, i) => {
    const date = dates[i];
    if (n.type === 'task') tasks.push({ text: n.text.split('\n')[0].trim(), status: n.status, priority: n.priority, date, start: n.start, end: n.end });
    else if (n.type === 'event') events.push({ text: n.text.split('\n')[0].trim(), date, time: timeOf(n.text), start: n.start });
    else if (n.type === 'record' && n.recordType === 'event') {
      const s = fieldOf(n, 'start') || fieldOf(n, 'at') || fieldOf(n, 'date'), e = fieldOf(n, 'end'), d = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(s);
      const de = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(e);
      events.push({ text: fieldOf(n, 'label') || fieldOf(n, 'title') || fieldOf(n, 'body') || 'Event', date: d ? d[1] : date, time: d && d[2] ? d[2] : null, endDate: de ? de[1] : null, endTime: de && de[2] ? de[2] : null, start: n.start, id: n.id || null });
    }
  });
  const numbers = [];
  for (const m of collectNumbers(ast).metrics.values()) for (const [date, v] of m.byDate) numbers.push({ date, metric: m.key, value: Math.round((v.sum / v.n) * 1000) / 1000, unit: m.unit || '' });
  numbers.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric < b.metric ? -1 : 1));
  return { tasks, events, numbers };
}

// ---- iCalendar ----
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) { // RFC 5545 3.1: lines of at most 75 octets, continued with a space
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; } cur += ch; bytes += b; }
  out.push(cur); return out.join('\r\n ');
}
const ymd = (d) => d.replace(/-/g, '');
/** Events and dated tasks as an iCalendar file. Events with a time are an hour long (or to their end); without, all day. Open tasks
 *  (and scheduled, high) are to-dos due on their day; done tasks only with includeDone. tasksAsEvents: tasks as all-day events too
 *  (Google Calendar shows events only). UIDs come from the text and date, so importing again updates instead of duplicating. */
export function toICS(ast, { name = 'Jot journal', includeDone = false, tasksAsEvents = false, stamp = '20260101T000000Z' } = {}) {
  const { tasks, events } = extract(ast), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jot//Jot journal 0.1//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsText(name)}`];
  const seen = new Map(), uid = (kind, date, text) => { const k = `${kind}|${date}|${text}`, n = (seen.get(k) || 0) + 1; seen.set(k, n); return `${kind}-${date}-${hash(k)}${n > 1 ? `-${n}` : ''}@jot`; };
  for (const e of events) {
    if (!e.date) continue;
    L.push('BEGIN:VEVENT', `UID:${uid('event', e.date, e.text)}`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const [h, m] = e.time.split(':').map(Number), endD = e.endDate || e.date, end = e.endTime || `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(h + 1 > 23 ? 59 : m).padStart(2, '0')}`;
      L.push(`DTSTART:${ymd(e.date)}T${e.time.replace(':', '')}00`, `DTEND:${ymd(endD)}T${end.replace(':', '')}00`);
    } else L.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.endDate || e.date, 1))}`);
    L.push(`SUMMARY:${icsText(e.text)}`, 'END:VEVENT');
  }
  for (const t of tasks) {
    if (!t.date || t.status === 'cancelled' || t.status === 'migrated' || (t.status === 'completed' && !includeDone)) continue;
    const done = t.status === 'completed';
    L.push('BEGIN:VTODO', `UID:${uid('task', t.date, t.text)}`, `DTSTAMP:${stamp}`, `DUE;VALUE=DATE:${ymd(t.date)}`, `SUMMARY:${icsText(t.text)}`, `STATUS:${done ? 'COMPLETED' : 'NEEDS-ACTION'}`);
    if (t.priority === 'high') L.push('PRIORITY:1');
    L.push('END:VTODO');
    if (tasksAsEvents) L.push('BEGIN:VEVENT', `UID:${uid('taskday', t.date, t.text)}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(t.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(t.date, 1))}`, `SUMMARY:${icsText(`${done ? '☑' : '☐'} ${t.text}`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return `${L.map(fold).join('\r\n')}\r\n`;
}

// ---- CSV ----
const csvCell = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s; }; // quoted; a formula-like cell is defused
const csvOf = (rows) => `${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
export const numbersCSV = (ast) => csvOf([['date', 'metric', 'value', 'unit'], ...extract(ast).numbers.map((n) => [n.date, n.metric, n.value, n.unit])]);
export const tasksCSV = (ast) => csvOf([['date', 'status', 'priority', 'task'], ...extract(ast).tasks.map((t) => [t.date || '', t.status, t.priority, t.text])]);

export function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false, i = 0; const s = String(text).replace(/^\uFEFF/, '');
  const sep = (() => { const first = s.split(/\r?\n/, 1)[0]; const c = (ch) => first.split(ch).length; return c(';') > c(',') && c(';') > c('\t') ? ';' : c('\t') > c(',') ? '\t' : ','; })();
  for (; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
/** A date in a CSV cell: 2026-10-26, 2026/10/26, 2026-10-26 07:30 or 2026-10-26T07:30:00Z (the date part), 26/10/2026 with dayFirst,
 *  10/26/2026 otherwise (only when the numbers can't be read the other way). */
export function csvDate(v, { dayFirst = null } = {}) {
  const s = String(v || '').trim(); let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/.exec(s);
  if (m) { const d = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; return validDate(d) ? d : null; }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:$|[T\s])/.exec(s); if (!m) return null;
  let [a, b] = [Number(m[1]), Number(m[2])], day, mon;
  if (dayFirst === true || (dayFirst === null && a > 12)) [day, mon] = [a, b]; else if (dayFirst === false || (dayFirst === null && b > 12)) [mon, day] = [a, b]; else return null; // 03/04/2026: ask which
  const d = `${m[3]}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return validDate(d) ? d : null;
}
/** A CSV of numbers: one column of dates, the others numbers. Headers name the metrics ("Steps", "Sleep (h)": metric sleep, unit h).
 *  Several rows on one date are combined: sum (steps by the hour), mean (heart rate) or last. -> { numbers, metrics, rows, skipped, ambiguous } */
export function readCSV(text, { combine = 'sum', dayFirst = null, only = null } = {}) {
  const rows = parseCSV(text); if (rows.length < 2) return { numbers: [], metrics: [], rows: 0, skipped: 0, ambiguous: 0 };
  const head = rows[0].map((h) => h.trim()), body = rows.slice(1);
  const dateCol = (() => { const named = head.findIndex((h) => /^(date|day|datum|fecha|start(\s*date|\s*time)?|time(stamp)?|when)$/i.test(h)); if (named >= 0) return named; return head.findIndex((_, c) => body.slice(0, 20).filter((r) => csvDate(r[c], { dayFirst })).length >= Math.min(3, body.length)); })();
  if (dateCol < 0) throw new Error('No column of dates found (a column named date, or one with dates like 2026-10-26)');
  const cols = head.map((h, c) => { const m = /^(.*?)\s*[([]([^()[\]]{1,12})[)\]]\s*$/.exec(h); return { c, metric: metricKey(m ? m[1] : h), unit: m ? m[2].trim() : '' }; })
    .filter((x) => x.c !== dateCol && x.metric && (!only || only.map(metricKey).includes(x.metric)) && body.some((r) => NUMBER.test(String(r[x.c] || '').trim().replace(',', '.'))));
  const acc = new Map(); let skipped = 0, ambiguous = 0;
  for (const r of body) {
    const d = csvDate(r[dateCol], { dayFirst }); if (!d) { if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/.test(String(r[dateCol]).trim())) ambiguous++; else skipped++; continue; }
    for (const { c, metric, unit } of cols) {
      const v = String(r[c] ?? '').trim().replace(/(\d),(\d{1,2})$/, '$1.$2'); if (!NUMBER.test(v)) continue;
      const k = `${d}|${metric}`, a = acc.get(k) || { date: d, metric, unit, sum: 0, n: 0, last: 0 }; a.sum += Number(v); a.n++; a.last = Number(v); acc.set(k, a);
    }
  }
  const round = (x) => Math.round(x * 100) / 100;
  const numbers = [...acc.values()].map((a) => ({ date: a.date, metric: a.metric, unit: a.unit, value: round(combine === 'mean' ? a.sum / a.n : combine === 'last' ? a.last : a.sum) })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric < b.metric ? -1 : 1));
  return { numbers, metrics: [...new Set(numbers.map((n) => n.metric))], rows: body.length, skipped, ambiguous };
}

// ---- writing back ----
const one = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
const fmtNum = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));
const heading = (date) => `### ${date} | ${weekday(date)}`;
/** Puts text at the end of the entry for date (making the entry, in date order, if there is none). */
function intoEntry(source, date, text) {
  const ast = parse(source), at = charSpans(source), e = ast.entries.find((x) => x.date === date);
  if (e) {
    const end = e.endNode < ast.nodes.length ? at(ast.nodes[e.endNode].start) : source.length;
    if (!text.trim()) return source;
    let before = source.slice(0, end), after = source.slice(end);
    const trimmed = before.replace(/\s+$/, ''); before = `${trimmed}\n\n${text.replace(/\s+$/, '')}\n${after ? '\n' : ''}`;
    return before + after.replace(/^\s+/, '');
  }
  const later = ast.entries.find((x) => x.date > date), body = text.replace(/\s+$/, ''), block = body ? `${heading(date)}\n\n${body}\n` : `${heading(date)}\n`;
  if (later) { const pos = at(ast.nodes[later.startNode].start); return `${source.slice(0, pos)}${block}\n${source.slice(pos)}`; }
  return `${source.replace(/\s+$/, '')}${source.trim() ? '\n\n' : ''}${block}`;
}
/** Numbers ([{date, metric, value, unit}]) written into the journal. An empty value: blank for that metric on that day (a template's)
 *  is filled in where it is; a day that already has that number is left alone (so importing twice adds nothing); the rest go at the
 *  end of their day as measurement records, with source: when given. -> { text, filled, added, kept } */
export function addNumbers(source, numbers, { source: from = '' } = {}) {
  let text = String(source); let filled = 0, added = 0, kept = 0;
  const ids = new Set(parse(text).nodes.filter((n) => n.id).map((n) => n.id));
  const byDate = new Map(); for (const n of numbers) { if (!validDate(n.date) || !Number.isFinite(Number(n.value))) continue; if (!byDate.has(n.date)) byDate.set(n.date, []); byDate.get(n.date).push(n); }
  for (const [date, list] of byDate) {
    const blocks = [];
    for (const n of list) {
      const ast = parse(text), dates = dateOfNode(ast), at = charSpans(text), metric = metricKey(n.metric);
      const mine = ast.nodes.map((x, i) => [x, i]).filter(([x, i]) => x.type === 'record' && x.recordType === 'measurement' && metricKey(fieldOf(x, 'metric')) === metric && ((DATE.test((fieldOf(x, 'date') || fieldOf(x, 'at')).slice(0, 10)) ? (fieldOf(x, 'date') || fieldOf(x, 'at')).slice(0, 10) : dates[i]) === date));
      if (mine.some(([x]) => fieldOf(x, 'value') !== '')) { kept++; continue; }
      const blank = mine.find(([x]) => fieldOf(x, 'value') === '');
      if (blank) {
        const [node] = blank, s = at(node.start), e = at(node.end), raw = text.slice(s, e);
        let rec = raw.replace(/^value:[ \t]*$/m, `value: ${fmtNum(Number(n.value))}`);
        if (n.unit && !/^unit:/m.test(rec)) rec = rec.replace(/^(value: .*)$/m, `unit: ${one(n.unit)}\n$1`);
        if (from && !/^source:/m.test(rec)) rec = rec.replace(/^:::[ \t]*$/m, `source: ${one(from)}\n:::`);
        text = text.slice(0, s) + rec + text.slice(e); filled++; continue;
      }
      let id = `${metric}-${date}`, k = 1; while (ids.has(id)) id = `${metric}-${date}-${++k}`; ids.add(id);
      blocks.push([`:::record measurement #${id}`, `metric: ${metric}`, `value: ${fmtNum(Number(n.value))}`, ...(n.unit ? [`unit: ${one(n.unit)}`] : []), ...(from ? [`source: ${one(from)}`] : []), ':::'].join('\n'));
      added++;
    }
    if (blocks.length) text = intoEntry(text, date, blocks.join('\n\n'));
  }
  return { text, filled, added, kept };
}
/** A dated entry for date at the end of the journal (or in date order), unless there is one. extra: lines to start it with. */
export function todayEntry(source, date, { extra = '' } = {}) {
  if (!validDate(date)) throw new Error(`Not a date: ${date}`);
  const ast = parse(source);
  if (ast.entries.some((e) => e.date === date)) return { text: source, added: false };
  const later = ast.entries.some((x) => x.date > date);
  if (later || extra) return { text: intoEntry(source, date, extra || ''), added: true };
  return { text: `${source.replace(/\s+$/, '')}${source.trim() ? '\n\n' : ''}${heading(date)}\n\n`, added: true };
}
/** Open tasks ([ ] and [!]) from days before date: marked [>] (moved) where they were, and written again under date's entry, in order.
 *  -> { text, moved } */
export function rollover(source, date) {
  if (!validDate(date)) throw new Error(`Not a date: ${date}`);
  const ast = parse(source), dates = dateOfNode(ast), at = charSpans(source);
  const open = ast.nodes.map((n, i) => [n, dates[i]]).filter(([n, d]) => n.type === 'task' && n.status === 'open' && d && d < date);
  if (!open.length) return { text: source, moved: 0 };
  let text = source;
  for (const [n] of [...open].reverse()) { const s = at(n.start); text = `${text.slice(0, s)}[>]${text.slice(s + 3)}`; }
  const lines = open.map(([n]) => `${n.priority === 'high' ? '[!]' : '[ ]'} ${n.text.split('\n')[0].trim()}`);
  return { text: intoEntry(text, date, lines.join('\n')), moved: open.length };
}
/** A review of the week date falls in, written after its last day: done and open counts, the open tasks, each number's average and a
 *  chart of them, and two questions to answer. -> { text, week: { start, end, done, open, numbers } } */
export function weekReview(source, date) {
  if (!validDate(date)) throw new Error(`Not a date: ${date}`);
  const start = mondayOf(date), end = addDays(start, 6), ast = parse(source), { tasks, numbers } = extract(ast);
  const inWeek = (d) => d && d >= start && d <= end, t = tasks.filter((x) => inWeek(x.date));
  const done = t.filter((x) => x.status === 'completed'), open = t.filter((x) => x.status === 'open');
  const nums = new Map(); for (const n of numbers.filter((x) => inWeek(x.date))) { const a = nums.get(n.metric) || { sum: 0, n: 0, unit: n.unit }; a.sum += n.value; a.n++; nums.set(n.metric, a); }
  const L = [`## Week review · ${start} to ${end}`, '', `${done.length} done, ${open.length} still open${t.length ? '' : ' (no tasks this week)'}.`, ''];
  if (open.length) L.push('#### Still open', '', ...open.map((x) => `- ${x.text}${x.priority === 'high' ? ' (!)' : ''}`), '');
  if (nums.size) {
    L.push('#### The numbers', '', ...[...nums].map(([m, a]) => `- ${m.replace(/-/g, ' ')}: average ${fmtNum(a.sum / a.n)}${a.unit ? ` ${a.unit}` : ''} over ${a.n} ${a.n === 1 ? 'day' : 'days'}`), '');
    L.push(`:::record chart #review-${start}`, `metrics: ${[...nums.keys()].join(', ')}`, `start: ${start}`, `end: ${end}`, ':::', '');
  }
  L.push('#### What went well', '', '#### What to change', '');
  const block = L.join('\n');
  const after = ast.entries.find((x) => x.date > end), at = charSpans(source);
  const text = after ? `${source.slice(0, at(ast.nodes[after.startNode].start))}${block}\n${source.slice(at(ast.nodes[after.startNode].start))}` : `${source.replace(/\s+$/, '')}\n\n${block}`;
  return { text, week: { start, end, done: done.length, open: open.length, numbers: Object.fromEntries([...nums].map(([m, a]) => [m, Math.round((a.sum / a.n) * 100) / 100])) } };
}

// ---- remembering what a service has had (a record in the journal, so it travels with it) ----
export const taskKey = (t) => hash(`${t.date || ''}|${t.text}`);
/** The open tasks a service has not been sent yet (by the sync record #sync-<service>). */
export function pendingSync(ast, service, { status = ['open'] } = {}) {
  const rec = ast.nodes.find((n) => n.type === 'record' && n.recordType === 'sync' && n.id === `sync-${service}`);
  const sent = new Set(rec ? rec.fields.filter((f) => f.name === 'sent').map((f) => f.value.trim()) : []);
  return extract(ast).tasks.filter((t) => status.includes(t.status) && !sent.has(taskKey(t)));
}
/** The journal with the sync record for service listing these tasks as sent (made at the end if there is none). */
export function markSynced(source, service, tasks, { at = '' } = {}) {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(service)) throw new Error(`Not a service name: ${service}`);
  const ast = parse(source), rec = ast.nodes.find((n) => n.type === 'record' && n.recordType === 'sync' && n.id === `sync-${service}`), spans = charSpans(source);
  const add = tasks.map((t) => `sent: ${taskKey(t)}`);
  if (!add.length) return source;
  if (rec) {
    const s = spans(rec.start), e = spans(rec.end), raw = source.slice(s, e).replace(/^last:.*\r?\n/m, '');
    const body = raw.replace(/^:::[ \t]*\r?\n?$/m, `${at ? `last: ${one(at)}\n` : ''}${add.join('\n')}\n:::\n`);
    return source.slice(0, s) + body + source.slice(e);
  }
  return `${source.replace(/\s+$/, '')}\n\n:::record sync #sync-${service}\nservice: ${service}\n${at ? `last: ${one(at)}\n` : ''}${add.join('\n')}\n:::\n`;
}

/** What a webhook receives: the journal's tasks, events and numbers (no other writing), with where they came from. */
export function payload(ast, { file = '', open = false, since = '' } = {}) {
  const { tasks, events, numbers } = extract(ast), keep = (d) => !since || (d && d >= since);
  return {
    format: 'jot-automation', version: 1, file,
    tasks: tasks.filter((t) => (!open || t.status === 'open') && keep(t.date)).map(({ text, status, priority, date }) => ({ text, status, priority, date, key: taskKey({ text, date }) })),
    events: events.filter((e) => keep(e.date)).map(({ text, date, time }) => ({ text, date, time })),
    numbers: numbers.filter((n) => keep(n.date)),
  };
}
export default { extract, timeOf, toICS, numbersCSV, tasksCSV, parseCSV, csvDate, readCSV, addNumbers, todayEntry, rollover, weekReview, pendingSync, markSynced, taskKey, payload, mondayOf, localToday };
