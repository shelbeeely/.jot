/** Jot template editor: the model and the generator. Pure (no DOM, no storage), so the page and the tests run the same code.
 *
 * A template is the structure of a journal; it becomes plain Jot v1 text to fill in by hand (on a keyboard, a phone or InkDeck):
 *   { v: 1, title, month: 'YYYY-MM', per: 'month' | 'week' | 'day',
 *     zones: { front: [block], weekStart: [block], day: [block], weekEnd: [block], back: [block] } }
 * A block is { id, type, title, ...its options } (BLOCKS lists the types and their options).
 *
 * The file, top to bottom:
 *   metadata (Jot: 1.0, Title, Date)  ·  every scale the template uses, declared once (:::record scale)  ·  # October 2026
 *   front blocks  ·  for each week: ## Week of <Monday>, week-start blocks, then each day: ### 2026-10-05 | Monday and the day's blocks,
 *   then ## Week review · <first> to <last> and the week-end blocks  ·  back blocks
 * Writing first: a block is a #### heading with room to write, [ ] boxes to tick, "label:" blanks (in a record when they are numbers),
 * [[a · b]] choices. Nothing for scanning or page layout: no codes, boxes, page breaks or paper size.
 */

export const TEMPLATE_VERSION = 1;
export const INKDECK_BYTES = 16383; // InkDeck's editor buffer: a bigger file opens cut short
export const ZONES = [
  { id: 'front', name: 'Before the days', hint: 'Once, at the start: a theme, contacts, a plan for the month.' },
  { id: 'weekStart', name: 'Each week begins', hint: 'Under "Week of …", before the week\'s days.' },
  { id: 'day', name: 'Each day', hint: 'Every day of the month, under its date.' },
  { id: 'weekEnd', name: 'Each week ends', hint: 'After the week\'s last day: a review, a carry-forward list.' },
  { id: 'back', name: 'After the days', hint: 'Once, at the end: looking back, closing the month.' },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- block types: what each one is called, what it is for, and its options ----
// option kinds: text {max} · num {lo, hi} · list {max items} · choice {choices}
const T = (def, label = 'Title') => ({ k: 'title', kind: 'text', label, def, max: 80 });
const N = (k, label, lo, hi, def) => ({ k, kind: 'num', label, lo, hi, def });
const L = (k, label, def, max = 12) => ({ k, kind: 'list', label, def, max });
const W = (k, label, def) => ({ k, kind: 'text', label, def, max: 24 });
export const BLOCKS = {
  page: { name: 'Page title', icon: '§', hint: 'Starts a named page, like "Season theme" (before or after the days).', zones: ['front', 'back'], opts: [T('Season theme')] },
  writing: { name: 'Writing space', icon: '✎', hint: 'A heading and room to write.', opts: [T('Notes')] },
  prompt: { name: 'Prompt', icon: '?', hint: 'A question to write under. Several questions take turns, one a day.', opts: [L('questions', 'Questions (one a day, in turn)', ['What do I need today?'], 60)] },
  checks: { name: 'Checkboxes', icon: '☐', hint: 'Things to tick: habits, care, a routine.', opts: [T('Habits'), L('labels', 'Boxes', ['Stretch', 'Outside', 'Read'], 20)] },
  tasks: { name: 'Task lines', icon: '☑', hint: 'Empty boxes to write tasks in.', opts: [T('To do'), N('n', 'Lines', 1, 12, 3)] },
  scale: { name: 'Scale', icon: '±', hint: 'One number between two words, like energy 1–5.', opts: [T('Energy'), N('min', 'From', -10, 10, 1), N('max', 'To', -9, 100, 5), W('lo', 'Low word', 'low'), W('hi', 'High word', 'high')] },
  ratings: { name: 'Ratings', icon: '▤', hint: 'Several things rated on one scale, like feelings 0–5.', opts: [T('Feelings'), L('labels', 'Rate', ['Calm', 'Tired', 'Worried'], 12), N('min', 'From', -10, 10, 0), N('max', 'To', -9, 100, 5), W('lo', 'Low word', 'none'), W('hi', 'High word', 'strong')] },
  blanks: { name: 'Fill-in blanks', icon: '▭', hint: 'A label and a blank each: sleep hours, steps, water.', opts: [T('Today'), L('labels', 'Blanks', ['Sleep hours', 'Water'], 12)] },
  choose: { name: 'Choose words', icon: '○', hint: 'Words to choose from, and a line to write the ones that fit.', opts: [T('Feeling'), L('words', 'Words', ['calm', 'tired', 'hopeful', 'flat', 'proud'], 20)] },
  list: { name: 'List', icon: '•', hint: 'Bullet or numbered lines.', opts: [T('Small good things'), N('n', 'Lines', 1, 20, 3), { k: 'style', kind: 'choice', label: 'Style', choices: [['bullets', 'Bullets'], ['numbers', 'Numbers']], def: 'bullets' }] },
  times: { name: 'Time blocks', icon: '◷', hint: 'The hours of the day, one line each.', opts: [T('Plan'), N('from', 'From (hour)', 0, 23, 8), N('to', 'To (hour)', 1, 24, 20), N('every', 'Every (hours)', 1, 6, 2)] },
  table: { name: 'Table', icon: '▦', hint: 'Columns and empty rows: spending, contacts, a log.', opts: [T('Spending'), L('columns', 'Columns', ['What', 'How much'], 8), N('rows', 'Rows', 1, 20, 3)] },
  text: { name: 'Words to keep', icon: '❝', hint: 'Your own words, written into the file as they are: an instruction, a reminder, a quote.', opts: [T('', 'Title (optional)'), { k: 'body', kind: 'text', label: 'Text', def: 'Be gentle with yourself today.', max: 600, long: true }] },
  manual: { name: 'My manual', icon: '❖', hint: 'Your own manual: why you keep this journal, what you do, what your marks mean. "What I do" is written from this template.', zones: ['front', 'back'],
    opts: [T('My manual'), { k: 'hints', kind: 'choice', label: 'Hints', choices: [['on', 'A short hint under each heading'], ['off', 'Headings only']], def: 'on' }] },
  record: { name: 'Record', icon: '{}', hint: 'A Jot record with named fields to fill in (for apps that read Jot data).', opts: [{ k: 'recordType', kind: 'text', label: 'Record type', def: 'observation', max: 32 }, T('Sleep'), L('fields', 'Fields', ['bed', 'wake', 'quality'], 16)] },
};
export const BLOCK_ORDER = ['writing', 'prompt', 'checks', 'tasks', 'scale', 'ratings', 'blanks', 'choose', 'list', 'times', 'table', 'text', 'record', 'page', 'manual'];
export const allowedIn = (type, zone) => !!BLOCKS[type] && (!BLOCKS[type].zones || BLOCKS[type].zones.includes(zone));

// ---- starting points ----
const b = (type, o = {}) => ({ type, ...o });
export const STARTERS = [
  { id: 'checkin', name: 'Daily check-in', blurb: 'Energy, a few boxes, a line for the day, a weekly look back.', zones: {
    front: [], weekStart: [b('tasks', { title: 'This week', n: 3 })],
    day: [b('scale', { title: 'Energy', min: 1, max: 5, lo: 'empty', hi: 'full' }), b('checks', { title: 'Care', labels: ['Meds', 'Water', 'Outside'] }), b('writing', { title: 'Today' })],
    weekEnd: [b('writing', { title: 'What went well' }), b('writing', { title: 'What to change' })], back: [] } },
  { id: 'bullet', name: 'Rapid log', blurb: 'Tasks, events and notes as they come; a monthly plan and a migration review.', zones: {
    front: [b('page', { title: 'Month plan' }), b('tasks', { title: 'Goals', n: 5 })], weekStart: [],
    day: [b('text', { title: '', body: 'Log: [ ] task, o event, - note, ! idea. Mark [x] done, [>] moved.' }), b('list', { title: 'Log', n: 6 })],
    weekEnd: [b('writing', { title: 'Carry forward' })], back: [b('page', { title: 'Looking back' }), b('writing', { title: 'What moved forward' })] } },
  { id: 'pages', name: 'Morning pages', blurb: 'A prompt and room to write, every day.', zones: {
    front: [], weekStart: [],
    day: [b('prompt', { questions: ['What is on my mind?', 'What would make today feel good?', 'What am I avoiding?', 'What do I need to let go of?'] }), b('writing', { title: 'Pages' })],
    weekEnd: [], back: [] } },
  { id: 'gratitude', name: 'Gratitude', blurb: 'Three small good things a day.', zones: {
    front: [], weekStart: [], day: [b('list', { title: 'Small good things', n: 3 })], weekEnd: [b('writing', { title: 'The best of the week' })], back: [] } },
  { id: 'planner', name: 'Day planner', blurb: 'Top three, time blocks and a done list.', zones: {
    front: [], weekStart: [b('tasks', { title: 'Priorities', n: 3 })],
    day: [b('tasks', { title: 'Top 3', n: 3 }), b('times', { title: 'Plan', from: 8, to: 20, every: 2 }), b('list', { title: 'Done', n: 3 })],
    weekEnd: [b('writing', { title: 'Review' })], back: [] } },
  { id: 'blank', name: 'Start empty', blurb: 'Just the dates. Add what you want.', zones: { front: [], weekStart: [], day: [b('writing', { title: 'Today' })], weekEnd: [], back: [] } },
];

// ---- normalising: anything read back (storage, an opened file) is checked and filled in, never trusted ----
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const str = (v, max, def = '') => (typeof v === 'string' ? v : def).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, max);
const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : def; };
let seq = 0;
export const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`;
export function normalizeBlock(raw, zone = 'day', fallbackId = null) {
  if (!isObj(raw) || !BLOCKS[raw.type] || !allowedIn(raw.type, zone)) return null;
  const B = BLOCKS[raw.type], out = { id: typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : fallbackId || newId(), type: raw.type };
  for (const o of B.opts) {
    const v = raw[o.k];
    if (o.kind === 'text') out[o.k] = v === undefined ? o.def : str(v, o.max);
    else if (o.kind === 'num') out[o.k] = num(v, o.lo, o.hi, o.def);
    else if (o.kind === 'list') out[o.k] = Array.isArray(v) ? v.map((x) => str(x, 80)).slice(0, o.max) : [...o.def];
    else if (o.kind === 'choice') out[o.k] = o.choices.some(([c]) => c === v) ? v : o.def;
  }
  if ((out.type === 'scale' || out.type === 'ratings') && out.max <= out.min) out.max = out.min + 1;
  if (out.type === 'times' && out.to <= out.from) out.to = Math.min(24, out.from + 1);
  return out;
}
export const newBlock = (type, zone = 'day') => normalizeBlock({ type }, zone);
const thisMonth = () => new Date().toISOString().slice(0, 7);
export function normalizeTemplate(raw) {
  const t = isObj(raw) ? raw : {};
  const zones = {};
  // a block with no id (or one another block already has) gets one from where it is, so the same template always writes the same file
  const seen = new Set();
  for (const z of ZONES) zones[z.id] = (isObj(t.zones) && Array.isArray(t.zones[z.id]) ? t.zones[z.id] : []).map((x, i) => {
    const b = normalizeBlock(x, z.id, `${z.id}-${i + 1}`);
    if (b && seen.has(b.id)) b.id = `${z.id}-${i + 1}-${seen.size}`;
    if (b) seen.add(b.id);
    return b;
  }).filter(Boolean).slice(0, 60);
  return {
    v: TEMPLATE_VERSION,
    title: str(t.title, 80, 'My journal') || 'My journal',
    month: typeof t.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(t.month) ? t.month : thisMonth(),
    per: ['month', 'week', 'day'].includes(t.per) ? t.per : 'month',
    zones,
  };
}
export const fromStarter = (id, keep = {}) => { const s = STARTERS.find((x) => x.id === id) || STARTERS[0]; return normalizeTemplate({ ...keep, zones: JSON.parse(JSON.stringify(s.zones)) }); };

// ---- text safety: what a person types can never break the file's structure ----
const one = (s) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const slug = (s) => one(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
const RESERVED = ['method', 'privacy', 'author', 'created', 'modified', 'date', 'at', 'start', 'end', 'body', 'source', 'relation', 'label', 'scale', 'metric', 'value', 'unit', 'status'];
const field = (s) => { const k = slug(s); return /^[a-z]/.test(k) && !RESERVED.includes(k) ? k : `x-${k}`; }; // a label that is a reserved Jot field gets the x- prefix
const cell = (s) => one(s).replace(/\|/g, '\\|');
const choice = (s) => one(s).replace(/\]\]/g, '] ]');
// A line of free text that must stay prose: a leading marker ([ ], o, ?, !, #, :::, ===, /*, -, 1.) is escaped so it reads as words.
const prose = (s) => { const t = one(s); return /^(\[.\] |[o?!=] |#|:::|===|\/\*|\.\S|- |\d+\. |>|@\w+:|\[\[)/.test(t) ? `\\${t}` : t; };
const recType = (s) => { const k = slug(s); return /^[a-z][a-z0-9-]*$/.test(k) ? k : 'observation'; };

// ---- dates ----
const iso = (t) => new Date(t).toISOString().slice(0, 10);
export function monthDays(month) {
  const [y, m] = month.split('-').map(Number), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => { const t = Date.UTC(y, m - 1, i + 1); return { date: iso(t), weekday: new Date(t).getUTCDay(), t }; });
}
export function monthWeeks(days) {
  const out = [];
  for (const d of days) { if (!out.length || d.weekday === 1) out.push({ days: [] }); out[out.length - 1].days.push(d); }
  for (const w of out) w.monday = iso(w.days[0].t - ((w.days[0].weekday + 6) % 7) * 864e5);
  return out;
}

// ---- the writer ----
function writer() {
  const lines = [], scales = new Map(), ids = new Map();
  const W = {
    lines, scales,
    out: (...ls) => lines.push(...ls),
    gap: () => { if (lines.length && lines[lines.length - 1] !== '') lines.push(''); },
    h: (level, text) => { W.gap(); lines.push(`${'#'.repeat(level)} ${one(text)}`, ''); },
    id: (base) => { const k = slug(base), n = (ids.get(k) || 0) + 1; ids.set(k, n); return n === 1 ? k : `${k}-${n}`; },
    scale: (name, min, max, lo, hi) => {
      const key = `${slug(name)}|${min}|${max}|${one(lo)}|${one(hi)}`;
      if (!scales.has(key)) scales.set(key, { id: W.id(`scale-${name}`), name, min, max, lo: one(lo), hi: one(hi) });
      return scales.get(key).id;
    },
    record: (type, idBase, fields) => { W.gap(); lines.push(`:::record ${type} #${W.id(idBase)}`, ...fields.map(([k, v]) => (v ? `${k}: ${one(v)}` : `${k}:`)), ':::', ''); },
  };
  return W;
}
// One block. at: the record id stem (a date, or the zone); n: which day of the month (prompts take turns by it); t: the whole template.
function block(W, bl, at, n, level, t) {
  const title = one(bl.title), head = (fallback) => W.h(level, title || fallback);
  switch (bl.type) {
    case 'page': W.h(2, title || 'Page'); return;
    case 'manual': manual(W, bl, t); return;
    case 'writing': head('Notes'); return;
    case 'prompt': { const q = bl.questions.map(one).filter(Boolean); if (q.length) W.h(level, q[((n % q.length) + q.length) % q.length]); return; }
    case 'checks': head('Checkboxes'); W.gap(); W.out(...bl.labels.map((l) => `[ ] ${one(l)}`), ''); return;
    case 'tasks': head('To do'); W.gap(); W.out(...Array(bl.n).fill('[ ] '), ''); return;
    case 'scale': {
      head('Scale');
      const s = W.scale(bl.title || 'scale', bl.min, bl.max, bl.lo, bl.hi);
      W.record('measurement', `${bl.title || 'scale'}-${at}`, [['metric', slug(bl.title || 'scale')], ['scale', `#${s}`], ['value', '']]);
      return;
    }
    case 'ratings': {
      head('Ratings');
      const s = W.scale(bl.title || 'ratings', bl.min, bl.max, bl.lo, bl.hi);
      W.record('observation', `${bl.title || 'ratings'}-${at}`, [['label', title || 'ratings'], ['scale', `#${s}`], ...bl.labels.filter((l) => one(l)).map((l) => [field(l), ''])]);
      return;
    }
    case 'blanks': head('Blanks'); W.record('observation', `${bl.title || 'blanks'}-${at}`, [['label', title || 'blanks'], ...bl.labels.filter((l) => one(l)).map((l) => [field(l), ''])]); return;
    case 'choose': { head('Choose'); const w = bl.words.map(choice).filter(Boolean); W.gap(); if (w.length) W.out(`[[${w.join(' · ')}]]`); W.out(`${prose(title || 'Today')}: `, ''); return; }
    case 'list': head('List'); W.gap(); W.out(...Array.from({ length: bl.n }, (_, i) => (bl.style === 'numbers' ? `${i + 1}. ` : '- ')), ''); return;
    case 'times': { head('Plan'); W.gap(); for (let h = bl.from; h < bl.to; h += bl.every) W.out(`- ${String(h % 24).padStart(2, '0')}:00 `); W.out(''); return; }
    case 'table': {
      head('Table');
      const cols = bl.columns.map(cell).filter(Boolean);
      if (cols.length) { W.gap(); W.out(`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, ...Array(bl.rows).fill(`|${cols.map(() => '  |').join('')}`), ''); }
      return;
    }
    case 'text': { if (title) W.h(level, title); const body = String(bl.body || '').split(/\r?\n/).map(prose).filter(Boolean); if (body.length) { W.gap(); W.out(...body, ''); } return; }
    case 'record': head('Record'); W.record(recType(bl.recordType), `${bl.title || bl.recordType}-${at}`, [['label', title || recType(bl.recordType)], ...bl.fields.filter((f) => one(f)).map((f) => [field(f), ''])]); return;
    default:
  }
}
const blocks = (W, list, at, n, level, t) => { for (const bl of list) block(W, bl, at, n, level, t); };

// ---- my manual: the why of the journal, in the writer's own words; the what is read from the template itself ----
// text after "- " in a list item: Jot's line marks don't apply there, but Markdown would still read a [ ] box, a heading, a quote or a
// nested list, so only those are escaped (with Markdown backslash escapes, which never show)
const item = (s) => { const t = one(s); return /^\d+[.)](\s|$)/.test(t) ? t.replace(/^(\d+)([.)])/, '$1\\$2') : /^([[#>*+-]|=+\s*$)/.test(t) ? `\\${t}` : t; };
const range = (a, b) => `${a}–${b}`;
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const names = (xs) => xs.map(one).filter(Boolean).join(', ');
// what a block asks of you, in a few words
export function describeBlock(bl) {
  const title = one(bl.title), q = (bl.questions || []).map(one).filter(Boolean);
  switch (bl.type) {
    case 'page': return `${title || 'Page'} (a page)`;
    case 'writing': return `${title || 'Notes'} (room to write)`;
    case 'prompt': return q.length > 1 ? `A question a day, in turn: ${cut(q.join(' / '), 120)}` : `${q[0] || 'A question'} (a question to write under)`;
    case 'checks': return `${title || 'Checkboxes'} (boxes: ${names(bl.labels)})`;
    case 'tasks': return `${title || 'To do'} (${bl.n} task line${bl.n > 1 ? 's' : ''})`;
    case 'scale': return `${title || 'Scale'} (a scale, ${range(bl.min, bl.max)}${bl.lo || bl.hi ? `, ${one(bl.lo)} to ${one(bl.hi)}` : ''})`;
    case 'ratings': return `${title || 'Ratings'} (${names(bl.labels)}, each ${range(bl.min, bl.max)})`;
    case 'blanks': return `${title || 'Blanks'} (${names(bl.labels)})`;
    case 'choose': return `${title || 'Choose'} (words to choose from: ${names(bl.words)})`;
    case 'list': return `${title || 'List'} (${bl.n} line${bl.n > 1 ? 's' : ''})`;
    case 'times': return `${title || 'Plan'} (time blocks, ${String(bl.from).padStart(2, '0')}:00 to ${String(bl.to).padStart(2, '0')}:00)`;
    case 'table': return `${title || 'Table'} (a table: ${names(bl.columns)})`;
    case 'text': return `${title ? `${title}: ` : ''}“${cut(one(bl.body), 80)}”`;
    case 'record': return `${title || 'Record'} (${names(bl.fields)})`;
    default: return title;
  }
}
// Jot's marks, and what they say in general; the manual leaves room after each for what they mean to you
export const MARKS = [['[ ]', 'a task'], ['[x]', 'done'], ['[>]', 'moved to another day'], ['[<]', 'scheduled for later'], ['[-]', 'not doing it after all'],
  ['[!]', 'important'], ['o', 'an event'], ['?', 'a question to come back to'], ['!', 'an idea']];
export const MANUAL_SECTIONS = [
  ['Why I keep this', 'What I hope this journal does for me.'],
  ['What I do', 'Written from my template. After each one, why it is there; cross out what I don’t use.'],
  ['My marks', 'What each mark means to me, and when I use it.'],
  ['What I skip on purpose', 'What I leave out, so leaving it out is a choice and not a failure.'],
  ['After a gap', 'How I start again after days away, without catching up.'],
  ['When I revise this', 'When I read this manual again and change it: the start of each month, say.'],
];
function manual(W, bl, t) {
  const hint = (i) => { if (bl.hints !== 'off') { W.gap(); W.out(`[[${choice(MANUAL_SECTIONS[i][1])}]]`, ''); } };
  W.h(2, one(bl.title) || 'My manual');
  MANUAL_SECTIONS.forEach(([head], i) => {
    W.h(4, head); hint(i);
    if (i === 1) {
      const zones = ZONES.map((z) => [z, ((t && t.zones[z.id]) || []).filter((x) => x.type !== 'manual')]).filter(([, list]) => list.length);
      W.gap();
      if (!zones.length) W.out('Nothing in the template yet.', '');
      for (const [z, list] of zones) W.out(`${z.name}:`, '', ...list.map((x) => `- ${item(describeBlock(x))} — `), '');
    }
    if (i === 2) { W.gap(); W.out(...MARKS.map(([m, what]) => `- \`${m}\` ${what} — `), ''); }
  });
}
/** The manual on its own, as its own .jot: the template's first manual block (or the default one), with the template inside like any file. */
export function renderManual(tplIn) {
  const t = normalizeTemplate(tplIn), W = writer();
  const bl = [...t.zones.front, ...t.zones.back].find((x) => x.type === 'manual') || normalizeBlock({ type: 'manual' }, 'front', 'manual');
  manual(W, bl, t);
  const head = ['---', 'Jot: 1.0', `Title: ${one(t.title)} · ${one(bl.title) || 'My manual'}`, 'Made-with: Jot template editor', '---', ''];
  const text = `${head.join('\n')}\n${W.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n\n${templateComment(t)}`;
  return { text, file: `${slug(t.title)}-manual.jot`, bytes: new TextEncoder().encode(text).length };
}

/** One file. range: { from, to } (dates) keeps only those days; front blocks go with the month's first day, back blocks with its last.
 *  -> { text, file, days, bytes } */
export function renderJot(tplIn, range = null) {
  const t = normalizeTemplate(tplIn), Z = t.zones;
  const all = monthDays(t.month), inR = (d) => !range || (d.date >= range.from && d.date <= range.to);
  const days = all.filter(inR), weeks = monthWeeks(all).map((w) => ({ ...w, days: w.days.filter(inR) })).filter((w) => w.days.length);
  const label = `${MONTHS[+t.month.slice(5) - 1]} ${t.month.slice(0, 4)}`, lastOfMonth = all[all.length - 1].date;
  const W = writer();
  W.h(1, label);
  if (inR(all[0])) blocks(W, Z.front, `${t.month}-start`, 0, 4, t);
  for (const w of weeks) {
    const first = w.days[0].date, last = w.days[w.days.length - 1].date;
    if (Z.weekStart.length || Z.weekEnd.length) W.h(2, `Week of ${w.monday}`);
    blocks(W, Z.weekStart, `week-${w.monday}`, 0, 4, t);
    for (const d of w.days) {
      W.h(3, `${d.date} | ${WEEKDAYS[d.weekday]}`);
      blocks(W, Z.day, d.date, Math.round(d.t / 864e5), 4, t);
    }
    const weekEnds = last === iso(Date.parse(w.monday) + 6 * 864e5) || last === lastOfMonth;
    if (Z.weekEnd.length && weekEnds) { W.h(2, `Week review · ${first} to ${last}`); blocks(W, Z.weekEnd, `review-${w.monday}`, 0, 4, t); }
  }
  if (inR(all[all.length - 1])) blocks(W, Z.back, `${t.month}-end`, 0, 4, t);
  const span = range ? (days.length === 1 ? days[0].date : `${days[0].date} to ${days[days.length - 1].date}`) : label;
  const head = ['---', 'Jot: 1.0', `Title: ${one(t.title)} · ${span}`, `Date: ${days[0].date}`, 'Made-with: Jot template editor', '---', ''];
  for (const s of W.scales.values()) head.push(`:::record scale #${s.id}`, `name: ${slug(s.name)}`, 'kind: ordinal', `minimum: ${s.min}`, `maximum: ${s.max}`, ...(s.lo ? [`anchor-low: ${s.lo}`] : []), ...(s.hi ? [`anchor-high: ${s.hi}`] : []), ':::', '');
  // The template rides at the end in a hidden comment (not shown when the journal is read), so opening this .jot restores it.
  const text = `${head.join('\n')}\n${W.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n\n${templateComment(t)}`;
  const file = `${slug(t.title)}-${range ? days[0].date : t.month}.jot`;
  return { text, file, days: days.map((d) => d.date), bytes: new TextEncoder().encode(text).length };
}
/** Every file the template makes: one for the month, or one a week or a day (t.per). */
export function renderFiles(tplIn) {
  const t = normalizeTemplate(tplIn);
  if (t.per === 'month') return [renderJot(t)];
  const all = monthDays(t.month), groups = t.per === 'day' ? all.map((d) => [d]) : monthWeeks(all).map((w) => w.days);
  return groups.map((g) => renderJot(t, { from: g[0].date, to: g[g.length - 1].date }));
}
// ---- the template inside a .jot ----
// A Jot hidden comment: "/*" and "*/" on lines of their own, one JSON line between. JSON never has a raw newline, so the comment
// cannot be closed early by anything a person typed.
const TEMPLATE_KEY = 'jot-template:';
export const templateComment = (t) => `/*\n${TEMPLATE_KEY} ${JSON.stringify(normalizeTemplate(t))}\n*/\n`;
/** The template a .jot made here carries, or null (a .jot written anywhere else, or one whose comment was removed). Checked, never trusted. */
export function templateFromJot(text) {
  const m = /(?:^|\n)\/\*\r?\n(?:jot-template:) (\{[^\n]*\})\r?\n\*\/(?:\r?\n|$)/.exec(String(text || ''));
  if (!m) return null;
  try { const raw = JSON.parse(m[1]); return raw && typeof raw === 'object' && raw.zones ? normalizeTemplate(raw) : null; } catch { return null; }
}
export const monthLabel = (month) => `${MONTHS[+month.slice(5) - 1]} ${month.slice(0, 4)}`;
