/** Jot queries, draft 0.1: a `:::record query` is a view of the journal it is in, as a chart is (spec 5.2.2). It lists and counts the
 * tasks, events, entries or numbers that match, and holds nothing itself: removing it loses nothing. Nothing is executed: the fields
 * are a fixed vocabulary and every value is checked. A value this module doesn't know is a problem shown beside the query (and a
 * diagnostic), never a silently empty or silently unfiltered view. Pure (no DOM, no network), so the workspace, the VS Code preview,
 * the `jot query` command and the tests all read a query the same way.
 *
 *   :::record query #open-at-home
 *   label: Open at home                 a title (optional)
 *   show: tasks                         tasks | events | entries | numbers (required)
 *   status: open                        tasks: open, completed, migrated, scheduled, cancelled (several, with commas: any of them)
 *   priority: high                      tasks: high | normal
 *   tag: home                           #tags, with or without the #; several, with commas: all of them (tasks, events, entries)
 *   context: phone                      @contexts, the same way
 *   text: dentist                       words the item contains, in any case
 *   metric: sleep, steps                numbers: which metrics (keys as charts read them; absent: all)
 *   period: week                        day | week | month of the entry the query is in (a week is Monday to Sunday) …
 *   start: 2026-10-01 · end: 2026-10-31 … or inclusive dates (either alone leaves that side open); none: every date, undated items too
 *   stat: average                       count (the default) | sum | average | min | max (the last four for numbers, each metric alone)
 *   limit: 20                           rows shown, 1 to 500 (default 50); the summary still counts every match
 *   :::
 *
 *   marks(text)                      { tags: ['home'], contexts: ['phone'] }: #tags and @contexts in writing (spec 4.1), lowercased
 *   runQuery(ast, fields, { date })  the view fields ask for ([{ name, value }], as a record holds them); date anchors period
 *   queryModel(ast, node)            the view a query record asks for, anchored to its dated entry
 *   queries(ast)                     every query record in order: [{ node, model }]
 *   queryDiagnostics(ast)            their problems, shaped like the parser's diagnostics (code invalid-query)
 *   queryText(model)                 a view as plain text (the command line prints it)
 *
 * A model is { id, label, show, start, end, head, cells, rows, total, stats, summary, problems }: rows are the matches shown (at most
 * limit), cells the same as table text under head, summary one plain sentence that says what was asked and what was found.
 */
import { extract } from './automation.mjs';
import { collectNumbers, metricKey, metricLabel, mondayOf, fmt } from './charts.mjs';

/** #tags and @contexts at a word's start (spec 4.1). The renderer marks them with the same expression. */
export const TAGGED = /(^|[\s(\[])([#@][\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu;
const NAME = /^[\p{L}\p{N}_][\p{L}\p{N}_-]*$/u;
/** The tags and contexts written in text, lowercased, each once. Code spans and link targets are not writing. */
export function marks(text) {
  const tags = new Set(), contexts = new Set(), plain = String(text || '').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)\s]*\)/g, '] ');
  for (const m of plain.matchAll(TAGGED)) (m[2][0] === '#' ? tags : contexts).add(m[2].slice(1).toLowerCase());
  return { tags: [...tags], contexts: [...contexts] };
}

export const SHOW = ['tasks', 'events', 'entries', 'numbers'];
const STATUS = ['open', 'completed', 'migrated', 'scheduled', 'cancelled'];
const STATS = ['count', 'sum', 'average', 'min', 'max'];
const PERIODS = ['day', 'week', 'month'];
const FIELDS = ['label', 'show', 'status', 'priority', 'tag', 'context', 'text', 'metric', 'period', 'start', 'end', 'stat', 'limit'];
const COMMON = new Set(['method', 'privacy', 'author', 'created', 'modified', 'date', 'at', 'body', 'source', 'relation']); // spec 4.3: any record may carry them
const LIMIT = 50, MAX_LIMIT = 500;
const STATE = { open: 'to do', completed: 'done', migrated: 'moved', scheduled: 'scheduled', cancelled: 'cancelled' };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s) => ISO.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const monthEnd = (d) => { const [y, m] = d.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
const list = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);
const entryDates = (ast) => { const out = new Array(ast.nodes.length).fill(null); for (const e of ast.entries || []) for (let j = e.startNode; j < e.endNode && j < out.length; j++) out[j] = e.date; return out; };
const fieldOf = (n, k) => { const f = n.fields && n.fields.find((x) => x.name === k); return f ? String(f.value).trim() : ''; };
const words = (xs, last = 'and') => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${last} ${xs[xs.length - 1]}`);

/** What the fields ask for, checked: { ask, problems } (problems: [{ field, message }]; any problem and nothing is shown). */
function read(fields, date) {
  const problems = [], seen = new Set(), ask = { show: '', status: [], priority: '', tags: [], contexts: [], text: '', metrics: [], start: '', end: '', period: '', stat: 'count', limit: LIMIT, label: '' };
  const bad = (field, message) => problems.push({ field, message });
  const got = new Map();
  for (const f of fields || []) {
    const name = String(f.name), value = String(f.value ?? '').trim();
    if (COMMON.has(name)) continue;
    if (!FIELDS.includes(name)) { bad(name, `"${name}" is not a query field (query fields: ${FIELDS.join(', ')}).`); continue; }
    if (seen.has(name)) { bad(name, `"${name}" is given twice; give it once${['status', 'tag', 'context', 'metric'].includes(name) ? ', with commas between the values' : ''}.`); continue; }
    seen.add(name);
    if (value) got.set(name, value); else if (name !== 'label') bad(name, `"${name}" has no value: give one, or leave the line out.`); // a blank filter would silently match everything
  }
  ask.label = got.get('label') || '';
  const show = got.get('show');
  if (!show) bad('show', 'Say what to show: show: tasks, events, entries or numbers.');
  else if (!SHOW.includes(show.toLowerCase())) bad('show', `show: "${show}" is not one of tasks, events, entries or numbers.`);
  else ask.show = show.toLowerCase();
  const only = (field, kinds) => { if (got.has(field) && ask.show && !kinds.includes(ask.show)) bad(field, `${field}: applies to ${words(kinds, 'or')}, not ${ask.show}.`); };
  only('status', ['tasks']); only('priority', ['tasks']); only('tag', ['tasks', 'events', 'entries']); only('context', ['tasks', 'events', 'entries']); only('metric', ['numbers']);
  if (got.has('status')) for (const s of list(got.get('status'))) { if (STATUS.includes(s.toLowerCase())) ask.status.push(s.toLowerCase()); else bad('status', `status: "${s}" is not one of ${STATUS.join(', ')}.`); }
  if (got.has('priority')) { const p = got.get('priority').toLowerCase(); if (p === 'high' || p === 'normal') ask.priority = p; else bad('priority', `priority: "${got.get('priority')}" is not high or normal.`); }
  for (const [field, sign, into] of [['tag', '#', ask.tags], ['context', '@', ask.contexts]]) if (got.has(field)) for (const t of list(got.get(field))) {
    const name = t.startsWith(sign) ? t.slice(1) : t;
    if (NAME.test(name)) into.push(name.toLowerCase()); else bad(field, `${field}: "${t}" is not a ${field} name (letters, digits, _ and -, as in ${sign}home).`);
  }
  ask.text = (got.get('text') || '').toLowerCase();
  if (got.has('metric')) for (const m of list(got.get('metric'))) { const k = metricKey(m); if (k) ask.metrics.push(k); else bad('metric', `metric: "${m}" is not a metric name.`); }
  for (const field of ['start', 'end']) if (got.has(field)) { const d = got.get(field); if (validDate(d)) ask[field] = d; else bad(field, `${field}: "${d}" is not a date like 2026-10-26.`); }
  if (got.has('period')) {
    const p = got.get('period').toLowerCase();
    if (!PERIODS.includes(p)) bad('period', `period: "${got.get('period')}" is not day, week or month.`);
    else if (got.has('start') || got.has('end')) bad('period', 'Give a period or start and end dates, not both.');
    else if (!date) bad('period', `period: ${p} counts from the dated entry the query is in, and this one is in none: give start and end dates instead.`);
    else { ask.period = p; ask.start = p === 'day' ? date : p === 'week' ? mondayOf(date) : `${date.slice(0, 8)}01`; ask.end = p === 'day' ? date : p === 'week' ? addDays(ask.start, 6) : monthEnd(date); }
  }
  if (ask.start && ask.end && ask.end < ask.start) [ask.start, ask.end] = [ask.end, ask.start];
  if (got.has('stat')) {
    const s = got.get('stat').toLowerCase();
    if (!STATS.includes(s)) bad('stat', `stat: "${got.get('stat')}" is not one of ${STATS.join(', ')}.`);
    else if (s !== 'count' && ask.show && ask.show !== 'numbers') bad('stat', `stat: ${s} needs numbers; ${ask.show} can only be counted.`);
    else ask.stat = s;
  }
  if (got.has('limit')) { const l = got.get('limit'); if (/^\d+$/.test(l) && Number(l) >= 1 && Number(l) <= MAX_LIMIT) ask.limit = Number(l); else bad('limit', `limit: "${l}" is not a whole number from 1 to ${MAX_LIMIT}.`); }
  return { ask, problems };
}

/** Every item of one kind, with its date, tags and contexts and its words for text: (the journal's own order; numbers by date). */
function items(ast, show, cache) {
  const ex = cache.ex || (cache.ex = extract(ast));
  if (show === 'numbers') return ex.numbers.map((n) => ({ ...n, tags: [], contexts: [], words: n.metric }));
  if (show === 'entries') {
    return (ast.entries || []).map((e) => {
      const parts = [];
      for (let j = e.startNode; j < e.endNode && j < ast.nodes.length; j++) { const n = ast.nodes[j]; if (n.type !== 'record' && n.type !== 'comment' && !(n.markdown && n.markdown.type === 'code')) parts.push(n.raw); }
      const text = parts.join(''), heading = String(e.heading || '').replace(/^\d{4}-\d{2}-\d{2}\s*\|?\s*/, '');
      return { date: e.date, heading, ...marks(text), words: text };
    });
  }
  const at = cache.at || (cache.at = new Map(ast.nodes.map((n) => [n.start, n])));
  if (show === 'tasks') return ex.tasks.map((t) => { const n = at.get(t.start), full = n ? n.text : t.text; return { date: t.date, status: t.status, priority: t.priority, text: t.text, ...marks(full), words: full }; });
  return ex.events.map((e) => { const n = at.get(e.start), full = !n ? e.text : n.type === 'event' ? n.text : ['label', 'title', 'body'].map((k) => fieldOf(n, k)).filter(Boolean).join('\n') || e.text; return { date: e.date, time: e.time || null, text: e.text, ...marks(full), words: full }; });
}

const NOUN = { tasks: ['task', 'tasks'], events: ['event', 'events'], entries: ['entry', 'entries'], numbers: ['number', 'numbers'] };
function describe(ask) { // "open tasks tagged #home at @phone containing "post" from 2026-10-26 to 2026-11-01"
  let s = '';
  if (ask.show === 'tasks' && ask.status.length) s += `${words(ask.status.map((x) => STATE[x] === 'to do' ? 'open' : STATE[x]), 'or')} `;
  if (ask.priority) s += `${ask.priority}-priority `;
  s += NOUN[ask.show][1];
  if (ask.metrics.length) s += ` of ${words(ask.metrics.map((m) => m.replace(/-/g, ' ')))}`;
  if (ask.tags.length) s += ` tagged ${words(ask.tags.map((t) => `#${t}`))}`;
  if (ask.contexts.length) s += ` at ${words(ask.contexts.map((t) => `@${t}`))}`;
  if (ask.text) s += ` containing “${ask.text}”`;
  return s + range(ask);
}
const range = (ask) => (ask.start && ask.start === ask.end ? ` on ${ask.start}` : ask.start && ask.end ? ` from ${ask.start} to ${ask.end}` : ask.start ? ` from ${ask.start} on` : ask.end ? ` up to ${ask.end}` : '');

const COLUMNS = {
  tasks: [['Date', (r) => r.date || ''], ['State', (r) => `${STATE[r.status] || r.status}${r.priority === 'high' ? ', high' : ''}`], ['Task', (r) => r.text]],
  events: [['Date', (r) => r.date || ''], ['Time', (r) => r.time || ''], ['Event', (r) => r.text]],
  entries: [['Date', (r) => r.date], ['Entry', (r) => r.heading], ['Tags', (r) => [...r.tags.map((t) => `#${t}`), ...r.contexts.map((c) => `@${c}`)].join(' ')]],
  numbers: [['Date', (r) => r.date], ['Metric', (r) => metricLabel(r.metric)], ['Value', (r) => `${fmt(r.value)}${r.unit ? ` ${r.unit}` : ''}`]],
};

/** The view fields ask for. opts.date: the date period counts from (a query record's entry; the command line's today). */
export function runQuery(ast, fields, { date = null, id = '', cache = {} } = {}) {
  const { ask, problems } = read(fields, date && validDate(date) ? date : null);
  const model = { id, label: ask.label, show: ask.show, start: ask.start, end: ask.end, stat: ask.stat, head: [], cells: [], rows: [], total: 0, stats: [], summary: '', problems };
  if (!problems.length && ask.show === 'numbers' && ask.metrics.length) { // a misspelt metric would otherwise just find nothing
    const known = cache.known || (cache.known = [...collectNumbers(ast).metrics.keys()]);
    for (const m of ask.metrics) if (!known.includes(m)) problems.push({ field: 'metric', message: `metric: this journal has no "${m}"${known.length ? ` (it has ${known.slice(0, 12).join(', ')})` : ''}.` });
  }
  const title = ask.label || (ask.show ? `${NOUN[ask.show][1][0].toUpperCase()}${NOUN[ask.show][1].slice(1)}` : 'Query');
  if (problems.length) { model.summary = `${title}: this query can't be shown. ${problems.map((p) => p.message).join(' ')}`; return model; }
  const has = (all, want) => want.every((w) => all.includes(w));
  const found = items(ast, ask.show, cache).filter((x) => (!ask.start || (x.date && x.date >= ask.start)) && (!ask.end || (x.date && x.date <= ask.end))
    && (!ask.status.length || ask.status.includes(x.status)) && (!ask.priority || x.priority === ask.priority)
    && has(x.tags, ask.tags) && has(x.contexts, ask.contexts) && (!ask.metrics.length || ask.metrics.includes(x.metric))
    && (!ask.text || String(x.words).toLowerCase().includes(ask.text)));
  model.total = found.length;
  model.rows = found.slice(0, ask.limit).map((r) => { const o = { ...r }; delete o.words; return o; }); // words is only for matching
  model.head = COLUMNS[ask.show].map(([h]) => h);
  model.cells = model.rows.map((r) => COLUMNS[ask.show].map(([, f]) => f(r)));
  const what = describe(ask), [one, many] = NOUN[ask.show];
  if (ask.show === 'numbers' && ask.stat !== 'count') {
    const by = new Map(); for (const x of found) { const a = by.get(x.metric) || { metric: x.metric, unit: x.unit || '', values: [] }; a.values.push(x.value); by.set(x.metric, a); }
    for (const m of ask.metrics) if (!by.has(m)) by.set(m, { metric: m, unit: '', values: [] });
    model.stats = [...by.values()].map(({ metric, unit, values: v }) => {
      const n = v.length, sum = v.reduce((a, b) => a + b, 0), value = !n ? null : ask.stat === 'sum' ? sum : ask.stat === 'average' ? sum / n : ask.stat === 'min' ? Math.min(...v) : Math.max(...v);
      return { metric, unit, stat: ask.stat, n, value: value === null ? null : Math.round(value * 100) / 100 };
    });
    const when = range(ask) + (ask.text ? ` (metrics containing “${ask.text}”)` : '');
    model.summary = model.stats.length
      ? `${model.stats.map((s) => `${metricLabel(s.metric)}${when}: ${s.n ? `${s.stat} ${fmt(s.value)}${s.unit ? ` ${s.unit}` : ''} over ${s.n} ${s.n === 1 ? 'day' : 'days'}` : 'no numbers yet'}`).join('; ')}.`
      : `No numbers${when} yet.`;
  } else model.summary = found.length ? `${found.length} ${found.length === 1 ? what.replace(new RegExp(`\\b${many}\\b`), one) : what}.` : `No ${what} yet.`;
  if (found.length > model.rows.length) model.summary += ` Showing the first ${model.rows.length}.`;
  model.summary = model.summary.charAt(0).toUpperCase() + model.summary.slice(1);
  return model;
}

/** The view a query record asks for; period counts from the record's own date: (or the date part of at:) when valid, else the dated
 *  entry it is written in, as a number's date does (spec 5.2.1). */
export function queryModel(ast, node, cache = {}) {
  const own = /^\d{4}-\d{2}-\d{2}/.exec(fieldOf(node, 'date') || fieldOf(node, 'at')), i = ast.nodes.indexOf(node);
  const date = own && validDate(own[0]) ? own[0] : i >= 0 ? (cache.dates || (cache.dates = entryDates(ast)))[i] : null;
  return runQuery(ast, node.fields, { date, id: node.id || '', cache });
}
/** Every query record in the journal, in order: [{ node, model }] */
const seenAsts = new WeakMap(); // the preview and the workspace's checks ask for the same journal's queries: work them out once
export function queries(ast) {
  if (seenAsts.has(ast)) return seenAsts.get(ast);
  const cache = {}, out = ast.nodes.filter((n) => n.type === 'record' && n.recordType === 'query').map((node) => ({ node, model: queryModel(ast, node, cache) }));
  seenAsts.set(ast, out); return out;
}
/** The queries' problems as diagnostics, beside the parser's (ast.diagnostics): one warning per problem, spanning its record. */
export function queryDiagnostics(ast) {
  return queries(ast).flatMap(({ node, model }) => model.problems.map((p) => ({ severity: 'warning', code: 'invalid-query', message: `Query${node.id ? ` #${node.id}` : ''}: ${p.message}`, start: node.start, end: node.end })));
}
/** A view as plain text: its summary, then its rows in columns. */
export function queryText(model) {
  const L = [model.summary];
  if (model.cells.length) {
    const w = model.head.map((h, c) => Math.max(h.length, ...model.cells.map((r) => r[c].length)));
    const line = (r) => r.map((x, c) => (c === r.length - 1 ? x : x.padEnd(w[c]))).join('  ').trimEnd();
    L.push('', line(model.head), ...model.cells.map(line));
  }
  return L.join('\n');
}

export default { TAGGED, marks, SHOW, runQuery, queryModel, queries, queryDiagnostics, queryText };
