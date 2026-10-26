// The book as a .jot file: the structure you built in the editor (content/book.json and the day layout), written as a plain-text
// Jot v1 document to fill in by hand, on a keyboard or InkDeck, instead of printed pages. Pure (no fs): render-jot.mjs writes it from
// the command line. (The new Jot template editor, site/dist/editor/, builds .jot files from a template of its own.)
// Nothing for scanning goes in: no DATE / TITLE / TAGS boxes, no page codes, no SEND TO strip, no frame. Paper sizes and page breaks
// do not apply either: a .jot is one flat file, one month long.
//
// Writing first (the Jot spec: "automatic templates must leave the actual questions in the writing"):
//   #     the month              ##  weeks and the book's own pages (theme, review, closing, safety plan, notes pages)
//   ###   a day: "2026-10-05 | Monday" (a Jot entry)             ####  a block's title
//   [ ] label        tick boxes, habits, action items (type after "[ ] "; an x marks it done)
//   label:           a blank to fill in, inside a record when it is a number or a rating
//   :::record measurement / observation ... :::   ratings, with their scale declared once at the top (`scale: #scale-...`)
//   [[a · b · c]]    words to choose from (marginalia: keep the ones that fit on the line below)
// Blocks that only make sense on paper (sketch boxes, photo frames, puzzles, tracing, spacers, dividers, the send-to strip) are left
// out; jotFile() returns their names so the editor can say so.
import { normalize, normalizeSpread, CARE_ROWS, REVIEW_ITEMS, BODYSIG, THOUGHT_BOXES, promptFor, TYPES } from './daypage.mjs';
import { STIM_SENSES } from './noteblocks.mjs';
import { chConfig, chToday, chParse } from './chores.mjs';

const JF_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const JF_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const JF_WD_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// Blocks with nothing to type: paper-only drawing and layout. (sky, notes, fact and events carry the day's data, not structure.)
export const JF_PAPER_ONLY = ['sketch', 'photoframe', 'photostrip', 'photodaily', 'contactsheet', 'wordsearch', 'crossword', 'sudoku', 'maze', 'cryptogram', 'wordladder', 'nonogram', 'kakuro', 'dottodot', 'stimtrace', 'chorerota', 'weekstrip', 'divider', 'spacer', 'sendto'];
const JF_DATA = ['sky', 'notes', 'fact'];

const jfIso = (t) => new Date(t).toISOString().slice(0, 10);
const jfSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
// One line of text: no newlines, and nothing that would start a Jot or Markdown construct by accident at the start of a line.
const jfLine = (s) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim();
// A record field name from a label: lowercase, starts with a letter, and never one of the spec's reserved fields or the ones these records
// use themselves (a rating called "Body" must not become `body:`, the record's writing): those get the spec's application prefix, x-.
const JF_RESERVED = ['method', 'privacy', 'author', 'created', 'modified', 'date', 'at', 'start', 'end', 'body', 'source', 'relation', 'label', 'scale', 'metric', 'value', 'unit', 'status'];
const jfField = (s) => { const k = jfSlug(s); return /^[a-z]/.test(k) && !JF_RESERVED.includes(k) ? k : `x-${k}`; };

// One day's dated parts: { date, weekday, d } for every day of a YYYY-MM month.
export function jfMonthDays(month) {
  const [y, m] = month.split('-').map(Number), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => { const t = Date.UTC(y, m - 1, i + 1); return { date: jfIso(t), weekday: new Date(t).getUTCDay(), d: i + 1, t }; });
}
// Monday-to-Sunday weeks, cut at the month's edges (a week keeps only its days in this month).
export function jfWeeks(days) {
  const out = [];
  for (const d of days) { if (!out.length || d.weekday === 1) out.push({ days: [] }); out[out.length - 1].days.push(d); }
  for (const W of out) { const mon = W.days[0].t - ((W.days[0].weekday + 6) % 7) * 864e5; W.monday = jfIso(mon); }
  return out;
}
// A day page or a spread (bookrules.mjs dayFormat, the same rule): a spread day writes the spread layout's blocks.
function jfDayFormat(o, day) {
  const ok = (v) => (v === 'page' || v === 'spread' ? v : null), obj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (!obj(o)) return 'page';
  return (obj(o.dates) && ok(o.dates[day.date])) || (obj(o.weekdays) && ok(o.weekdays[JF_WD_KEYS[day.weekday]])) || ok(o.format) || 'page';
}

// The writer: lines, the scales declared once, record ids kept unique, paper-only blocks noted.
function jfWriter() {
  const lines = [], scales = new Map(), ids = new Map(), skipped = new Set();
  const W = {
    out: (...ls) => lines.push(...ls),
    blank: () => { if (lines.length && lines[lines.length - 1] !== '') lines.push(''); },
    h: (level, text) => { W.blank(); lines.push(`${'#'.repeat(level)} ${jfLine(text)}`, ''); },
    id: (base) => { const k = jfSlug(base), n = (ids.get(k) || 0) + 1; ids.set(k, n); return n === 1 ? k : `${k}-${n}`; },
    // A scale: declared once (same name and range = same scale), referenced by its id.
    scale: (name, min, max, lo = '', hi = '', unit = '') => {
      const key = `${jfSlug(name)}|${min}|${max}|${lo}|${hi}|${unit}`;
      if (!scales.has(key)) scales.set(key, { id: `scale-${W.id(`scale-${name}`).replace(/^scale-/, '')}`, name, min, max, lo, hi, unit });
      return scales.get(key).id;
    },
    record: (type, idBase, fields) => {
      W.blank(); lines.push(`:::record ${type} #${W.id(idBase)}`);
      for (const [k, v] of fields) lines.push(v ? `${k}: ${jfLine(v)}` : `${k}:`); // an empty field is the blank to fill in
      lines.push(':::', '');
    },
    tasks: (labels) => { W.blank(); for (const l of labels) lines.push(`[ ] ${jfLine(l)}`); lines.push(''); }, // "[ ] " with nothing after it is a box to write a task in
    list: (n, prefix = '- ') => { W.blank(); for (let i = 0; i < n; i++) lines.push(typeof prefix === 'function' ? prefix(i) : prefix); lines.push(''); },
    choose: (words) => { if (words && words.length) { W.blank(); lines.push(`[[${words.map(jfLine).filter(Boolean).join(' · ')}]]`); } },
    skip: (type) => skipped.add(TYPES[type] ? TYPES[type].name : type),
    lines, scales, skipped,
  };
  return W;
}
// A blank "label:" line for writing a word or a number on (in prose, outside records).
const jfBlankLine = (W, label) => W.out(`${jfLine(label)}: `);
// One rating that lives in a measurement record: the scale is declared at the top.
function jfMeasure(W, at, metric, scaleId, unit = '') {
  W.record('measurement', `${metric}-${at}`, [['metric', jfSlug(metric)], ['scale', `#${scaleId}`], ...(unit ? [['unit', unit]] : []), ['value', '']]);
}
// Several ratings on one scale: one observation record, a field each.
function jfRatings(W, at, name, labels, scaleId) {
  W.record('observation', `${name}-${at}`, [['label', name], ['scale', `#${scaleId}`], ...labels.map((l) => [jfField(l), ''])]);
}
const jfSignedRange = (steps) => { const h = Math.floor(steps / 2); return [-h, h]; };

// ---- one block ----
// at: the record id stem ("2026-10-05", or the page id on a notes page); day: { date, weekday } or null (a page with no date).
function jfBlock(W, b, at, day, opt) {
  if (b.on === false) return;
  const t = (x, d) => jfLine(x || d || (TYPES[b.type] ? TYPES[b.type].name : b.type));
  if (JF_PAPER_ONLY.includes(b.type)) { W.skip(b.type); return; }
  if (JF_DATA.includes(b.type)) return; // the day's printed data (moon, holidays, history): nothing to fill in
  switch (b.type) {
    case 'events': {
      const ev = (day && opt.events && opt.events[day.date]) || [];
      const one = ev.filter((e) => !e.routine);
      if (one.length) { W.blank(); for (const e of one) W.out(`o ${e.allDay || !e.time ? '' : `${e.time} `}${jfLine(e.title)}`); W.out(''); }
      return;
    }
    case 'actions': {
      W.h(4, 'Action items');
      const pre = b.routines && day && opt.events && opt.events[day.date] ? opt.events[day.date].filter((e) => e.routine).map((e) => `${e.time ? `${e.time} ` : ''}${e.title}`) : [];
      W.tasks([...pre, ...Array(Math.max(1, b.count - pre.length)).fill('')]);
      return;
    }
    case 'review': for (const [k, name] of Object.entries(REVIEW_ITEMS)) if (!b.items || b.items[k]) { W.h(4, name); } return;
    case 'body': W.h(4, 'Writing'); return;
    case 'care': {
      W.h(4, 'Care');
      const ticks = [];
      for (const r of b.rows || []) {
        if (!r.on) continue;
        if (r.id === 'meds') for (const [k, l] of Object.entries(CARE_ROWS.meds.items)) { if (!r.items || r.items[k]) ticks.push(`Meds: ${l.toLowerCase()}`); }
        if (r.id === 'meals') { for (let i = 1; i <= (r.meals || 3); i++) ticks.push(`Meal ${i}`); if (r.snack) ticks.push('Snack'); }
        if (r.id === 'self_care') for (const [k, l] of Object.entries(CARE_ROWS.self_care.items)) { if (!r.items || r.items[k]) ticks.push(l); }
      }
      if (ticks.length) W.tasks(ticks);
      for (const r of b.rows || []) {
        if (!r.on) continue;
        if (r.id === 'work' && r.work) { W.blank(); jfBlankLine(W, 'Work shift'); }
        if (r.id === 'work' && r.sleep) jfMeasure(W, at, 'sleep', W.scale('sleep', 0, 24, '', '', 'h'), 'h');
        if (r.id === 'checkin') { const [lo, hi] = jfSignedRange(r.steps || 7); jfMeasure(W, at, 'mood', W.scale('mood', lo, hi, 'low', 'high')); }
        if (r.id === 'anxiety') jfMeasure(W, at, 'anxiety', W.scale('anxiety', 0, 3, 'calm', 'high'));
        if (r.id === 'water') jfMeasure(W, at, 'water', W.scale('water', 0, r.count || 8, '', '', 'glasses'), 'glasses');
      }
      return;
    }
    case 'spoons': W.h(4, 'Spoons left'); jfMeasure(W, at, 'spoons', W.scale('spoons', 0, b.count || 12)); return;
    case 'checks': case 'habits': W.h(4, t(b.title)); W.tasks(b.labels || []); return;
    case 'scale': {
      W.h(4, t(b.title));
      const [mn, mx] = b.signed ? jfSignedRange(b.steps) : [b.zero ? 0 : 1, b.zero ? b.steps - 1 : b.steps];
      jfMeasure(W, at, b.title || 'scale', W.scale(b.title || 'scale', mn, mx, b.lo, b.hi));
      return;
    }
    case 'range': { W.h(4, t(b.title)); const s = W.scale(b.title || 'range', 1, b.steps, b.lo, b.hi); jfRatings(W, at, b.title || 'range', ['Low', 'High'], s); return; }
    case 'pixel': W.h(4, 'Day pixel'); jfMeasure(W, at, 'day', W.scale('day', 1, b.levels || 5, 'hard', 'good')); return;
    case 'words': W.h(4, t(b.title)); W.choose(b.words); W.out(`${t(b.title)}: `, ''); return;
    case 'sensory': {
      W.h(4, 'Sensory load');
      const senses = { sound: 'Sound', light: 'Light', crowd: 'Crowds', touch: 'Touch', smell: 'Smell', social: 'Social', temp: 'Temperature', move: 'Movement' };
      jfRatings(W, at, 'sensory load', Object.entries(senses).filter(([k]) => !b.items || b.items[k]).map(([, l]) => l), W.scale('sensory load', 0, 3, 'quiet', 'too much'));
      return;
    }
    case 'sleeptimes': W.h(4, 'Sleep'); W.record('observation', `sleep-${at}`, [['label', 'sleep'], ['bed', ''], ['wake', ''], ...(b.quality ? [['quality', ''], ['scale', `#${W.scale('sleep quality', 1, 5, 'poor', 'good')}`]] : [])]); return;
    case 'fields': W.h(4, t(b.title)); W.record('observation', `${b.title || 'fields'}-${at}`, [['label', t(b.title)], ...(b.labels || []).map((l) => [jfField(l), ''])]); return;
    case 'weather': W.h(4, 'Weather'); W.record('observation', `weather-${at}`, [['label', 'weather'], ['sky', ''], ['high', ''], ['low', ''], ...(b.aqi ? [['air-quality', '']] : [])]); return;
    case 'feelings': W.h(4, t(b.title)); jfRatings(W, at, b.title || 'feelings', b.labels || [], W.scale('feelings', 0, 5, 'none', 'strong')); return;
    case 'skills': W.h(4, t(b.title)); jfMeasure(W, at, b.title || 'skills', W.scale('skills', 0, 7, 'not thought of', 'used them, they helped')); return;
    case 'urge': {
      W.h(4, t(b.title));
      const s = W.scale('urge', 0, 5, 'none', 'strong');
      W.record('observation', `${b.title || 'urges'}-${at}`, [['label', t(b.title)], ['scale', `#${s}`], ...(b.labels || []).flatMap((l) => [[jfField(l), ''], [`${jfField(l)}-acted`, '']])]);
      return;
    }
    case 'thought': W.h(4, 'Thought record'); W.record('observation', `thought-${at}`, [['label', 'thought record'], ...(THOUGHT_BOXES[b.cols] || THOUGHT_BOXES[3]).map((l) => [jfField(l), ''])]); return;
    case 'sites': W.h(4, t(b.title)); W.choose(b.labels); W.out(`${t(b.title)}: `); if (b.time) W.out('Time: '); W.out(''); return;
    case 'bodysig': W.h(4, 'Body signals'); W.choose(Object.entries(BODYSIG).filter(([k]) => !b.items || b.items[k]).map(([, l]) => l)); W.list(b.n || 2, (i) => `- Check ${i + 1}: `); return;
    case 'lines': case 'dump': case 'later': W.h(4, t(b.title)); return;
    case 'good': W.h(4, t(b.label, 'Small good things')); W.list(b.n || 3, b.because ? '-  because ' : '- '); return;
    case 'bullets': W.h(4, t(b.title)); W.list(b.n || 5); return;
    case 'done': W.h(4, t(b.title)); W.list(b.n || 1, b.gutter ? '[x] ' : '- '); return;
    case 'split': W.h(4, t(b.left, 'Left')); W.h(4, t(b.right, 'Right')); return;
    case 'top': W.h(4, t(b.title)); W.tasks(Array(b.n || 3).fill('')); return;
    case 'reach': W.h(4, 'Reach out'); W.tasks(Array(b.n || 2).fill('')); return;
    case 'money': W.h(4, 'Spending'); W.out('| What | How much |', '| --- | --- |', ...Array(b.n || 4).fill('|  |  |'), ''); return;
    case 'shift': W.h(4, 'Work shift'); W.record('observation', `shift-${at}`, [['label', 'work shift'], ['in', ''], ['out', ''], ['break', ''], ...(b.n ? [['notes', '']] : [])]); return;
    case 'bus': W.h(4, 'Bus plan'); for (let i = 0; i < (b.n || 1); i++) W.record('observation', `trip-${at}`, [['label', 'trip'], ['route', ''], ['stop', ''], ['leave', ''], ['back', '']]); return;
    case 'timeline': case 'tl24': {
      W.h(4, b.type === 'tl24' ? 'Time line' : 'Time blocks');
      const from = b.type === 'tl24' ? b.start : b.from, to = b.type === 'tl24' ? b.start + 24 : b.to, hrs = [];
      for (let h = from; h < to; h += b.every || 1) hrs.push(`- ${String(h % 24).padStart(2, '0')}:00 `);
      W.list(hrs.length, (i) => hrs[i]);
      return;
    }
    case 'stamps': W.h(4, t(b.title)); W.list(b.n || 1, '- 00:00 → '); return;
    case 'rounds': W.h(4, t(b.title)); for (let i = 0; i < (b.n || 1); i++) W.out(`[ ] `, `Rounds (${b.len || '25 min'}): `, ...(b.marks ? ['Interruptions: '] : []), ''); return;
    case 'energy': W.h(4, t(b.title)); jfRatings(W, at, b.title || 'energy left', b.labels || [], W.scale('energy left', 0, (b.steps || 3) - 1, 'none', 'plenty')); return;
    case 'accounts': W.h(4, t(b.title)); W.out('Start: '); W.list(b.n || 2, '- '); return;
    case 'keep': W.h(4, t(b.title)); if (b.source) W.out('Source: ', ''); if (b.moved) W.tasks(['Moved to my commonplace pages']); return;
    case 'lookback': {
      if (!day) return;
      const back = b.period === 'year' ? `${+day.date.slice(0, 4) - 1}${day.date.slice(4)}` : jfIso(Date.UTC(+day.date.slice(0, 4), +day.date.slice(5, 7) - 2, Math.min(+day.date.slice(8), new Date(Date.UTC(+day.date.slice(0, 4), +day.date.slice(5, 7) - 1, 0)).getUTCDate())));
      W.h(4, `${b.period === 'year' ? 'A year' : 'A month'} ago today (${back})`);
      return;
    }
    case 'prompt': { if (!day) { W.h(4, 'Prompt'); return; } const [, text] = promptFor(day.date, b.every); W.h(4, text); return; }
    case 'wall': W.h(4, t(b.title)); W.choose(b.words); W.out('In the way: '); W.choose(b.ways); W.out('A way past: ', ''); return;
    case 'chores': {
      W.h(4, t(b.title));
      const cfg = chConfig(), n = day ? chParse(day.date) : null, list = chToday(cfg, n, b.groups).slice(0, b.n || 5);
      W.tasks(list.length ? list.map((e) => `${e.it.name}${e.who ? ` (${e.who})` : ''}`) : Array(b.n || 5).fill(''));
      return;
    }
    case 'cornell': W.h(4, t(b.title)); if (b.head) W.out('Topic: ', ''); W.h(5, 'Cues'); W.h(5, 'Notes'); W.h(5, 'Summary'); return;
    case 'notearea': W.h(4, t(b.title)); if (b.topic) W.out('Topic: '); if (b.date) W.out(`Date: ${day ? day.date : ''}`); if (b.source) W.out('Source: '); W.out(''); return;
    case 'conceptmap': W.h(4, t(b.title)); W.out('Centre: '); W.list(b.branches || 5); return;
    case 'questions': W.h(4, t(b.title)); W.list(b.n || 4, (i) => `${i + 1}. `); return;
    case 'summarybox': W.h(4, t(b.title)); if (b.prompt === 'one') W.out('In one sentence:', ''); if (b.prompt === 'own') W.out('In my own words:', ''); return;
    case 'flashstrip': W.h(4, t(b.title)); W.out('| Term | Answer |', '| --- | --- |', ...Array(b.n || 6).fill('|  |  |'), ''); return;
    case 'reviewtracker': {
      W.h(4, t(b.title));
      const cols = Object.entries({ d1: '1 day', d3: '3 days', d7: '7 days', d14: '14 days', d21: '21 days', d30: '30 days' }).filter(([k]) => b.every && b.every[k]).map(([, l]) => l);
      W.out(`| Topic |${cols.map((c) => ` ${c} |`).join('')}`, `| --- |${cols.map(() => ' --- |').join('')}`, ...Array(b.n || 5).fill(`|  |${cols.map(() => '  |').join('')}`), '');
      return;
    }
    case 'stimlog': {
      W.h(4, t(b.title));
      const cols = ['When', 'What felt good', ...(b.where ? ['Where', 'What helped'] : []), ...(b.ba ? ['Settled before', 'Settled after'] : [])];
      W.out(`|${cols.map((c) => ` ${c} |`).join('')}`, `|${cols.map(() => ' --- |').join('')}`, ...Array(b.n || 3).fill(`|${cols.map(() => '  |').join('')}`), '');
      return;
    }
    case 'stimmenu': {
      W.h(4, t(b.title));
      for (const [k, l] of Object.entries(STIM_SENSES)) if (!b.senses || b.senses[k]) { W.h(5, l); W.list(b.rows || 2); }
      if (b.ideas) { W.h(5, 'New ideas'); W.list(b.ideas); }
      return;
    }
    default: W.h(4, t(b.title)); // a block added later than this file: its title and room to write
  }
}
function jfBlocks(W, L, at, day, opt) { for (const b of L.blocks) jfBlock(W, b, at, day, opt); }

// ---- the book's own pages ----
function jfPage(W, entry, month, opt) {
  const label = JF_MONTHS[+month.slice(5) - 1] + ' ' + month.slice(0, 4), o = entry.options || {};
  switch (entry.type) {
    case 'theme':
      W.h(2, 'Season theme');
      W.h(4, `My theme for ${label}`); W.h(4, 'What it means to me'); W.h(4, 'Three small ways to live it'); W.list(3, (i) => `${i + 1}. `); W.h(4, 'What I want to feel');
      return true;
    case 'contacts':
      W.h(2, 'Quick contacts');
      W.h(4, 'In an emergency'); W.out('| Name | Phone | Text OK |', '| --- | --- | --- |', '|  |  |  |', '|  |  |  |', '');
      W.h(4, 'This month'); W.out('| Name | Phone | Text OK |', '| --- | --- | --- |', ...Array(6).fill('|  |  |  |'), '');
      return true;
    case 'safety':
      W.h(2, 'My safety plan'); W.out('Last reviewed: ', '', 'Fill this in on a good day, so it is ready on a hard one. Work down the list until you feel safer.', '');
      for (const [i, q] of ['Signs a hard time is starting (thoughts, moods, situations)', 'Things I can do on my own to feel a little better', 'People or places that help me get my mind off it'].entries()) W.h(4, `${i + 1}. ${q}`);
      W.h(4, '4. People I can text or call for help'); W.out('| Name | Phone | Text OK |', '| --- | --- | --- |', '|  |  |  |', '|  |  |  |', '|  |  |  |', '');
      W.h(4, `5. Professionals and crisis lines: my therapist, my prescriber${opt.crisis && opt.crisis.length ? `; ${opt.crisis.join('; ')}` : ''}`);
      W.h(4, '6. How I can make my space safer'); W.h(4, '7. What matters to me, worth staying for');
      W.out('A text I can send when talking is too hard: "Hey, I\'m having a hard time. I\'m not up for a call. Can you text with me for a bit?"', '');
      return true;
    case 'month_review':
      W.h(2, 'Looking back on the month');
      for (const q of ['My theme was', 'What the trackers showed me', 'Which parts of this journal I actually used', 'What to change in the next edition']) W.h(4, q);
      return true;
    case 'closing':
      W.h(2, `Closing ${label}`); W.h(4, 'Total the month'); W.h(4, 'Carry forward');
      W.tasks(['Mark unfinished tasks with [>] and copy them forward', 'Copy the carry-forward list into next month']);
      return true;
    case 'notes': case 'collection': {
      W.h(2, jfLine(o.title) || (entry.type === 'notes' ? 'Notes' : 'Collection'));
      if (entry.layout) jfBlocks(W, normalize(entry.layout, opt.size, entry.type), jfSlug(entry.id), null, opt);
      else if (entry.type === 'collection') W.list(5);
      return true;
    }
    default: return false; // printed reference pages (title, key, support lists, bus times, sky ...) have nothing to fill in
  }
}

// The whole month.
//   jotFile({ book, month: 'YYYY-MM', day: <day layout>, spread?: <spread layout>, title?, size?, crisis?: [lines], events?: { date: [{ time, title, allDay, routine }] },
//             range?: { from, to } })
//   -> { text, skipped: [block names left out], file: '<slug>-YYYY-MM.jot' (with a range: '<slug>-<from>.jot') }
// A range keeps only its days (and the weeks they are in); the book's pages before the weeks go with the month's first day, the ones after
// with its last. jotFiles() cuts a month that way, a file a week or a day.
export function jotFile(o) {
  const month = o.month, size = o.size || 'small', opt = { size, events: o.events || null, crisis: o.crisis || null };
  const L = normalize(o.day || null, size), S = o.spread ? normalizeSpread(o.spread, size) : L.spread ? normalizeSpread(L.spread, size) : null;
  const book = o.book && o.book.default ? o.book : { default: [] };
  const entries = (book.months && book.months[month] && book.months[month].pages) || book.default;
  const allDays = jfMonthDays(month), rg = o.range || null, inRange = (d) => !rg || (d.date >= rg.from && d.date <= rg.to);
  const days = allDays.filter(inRange), weeks = jfWeeks(allDays).map((Wk) => ({ ...Wk, days: Wk.days.filter(inRange) })).filter((Wk) => Wk.days.length);
  const label = `${JF_MONTHS[+month.slice(5) - 1]} ${month.slice(0, 4)}`, hasFirst = inRange(allDays[0]), hasLast = inRange(allDays[allDays.length - 1]);
  const W = jfWriter();
  const on = (e) => e && e.on !== false;
  const weeksEntry = entries.find((e) => e.type === 'weeks');
  const weekList = (weeksEntry && weeksEntry.options && weeksEntry.options.week) || [];
  const at = (type) => weekList.find((e) => e.type === type && on(e));
  W.h(1, label);
  let afterWeeks = false;
  for (const e of entries) {
    if (!on(e)) continue;
    if (e.type !== 'weeks') { if (afterWeeks ? hasLast : hasFirst) jfPage(W, e, month, opt); continue; }
    afterWeeks = true;
    for (const Wk of weeks) {
      const first = Wk.days[0].date, last = Wk.days[Wk.days.length - 1].date, weekEnds = last === jfIso(Date.parse(Wk.monday) + 6 * 864e5) || last === allDays[allDays.length - 1].date;
      W.h(2, `Week of ${Wk.monday}`);
      if (at('week_left') || at('week_right')) { W.h(4, 'Priorities'); W.tasks(['', '', '']); W.h(4, 'Words to keep'); }
      for (const we of weekList) {
        if (!on(we)) continue;
        if (we.type === 'days') {
          for (const d of Wk.days) {
            W.h(3, `${d.date} | ${JF_WEEKDAYS[d.weekday]}`);
            jfBlocks(W, S && jfDayFormat(we.options, d) === 'spread' ? S : L, d.date, d, opt);
          }
        }
        if (we.type === 'week_review' && weekEnds) {
          W.h(2, `Week review · ${first} to ${last}`);
          for (const q of ['What did I do well?', 'Where did I fall short, and was it about capacity or choice?', 'What will I change, move forward (>) or drop?', 'Carry forward']) W.h(4, q);
        }
        if (we.type === 'week_exchange' && weekEnds) { W.h(2, `Exchange · ${first} to ${last}`); W.out('From: ', 'To: ', '', `This week's prompt: ${jfLine(o.weekPrompt && o.weekPrompt(Wk.monday)) || 'Anything you want to tell me.'}`, ''); W.h(4, 'Reply'); }
      }
    }
  }
  // the header: metadata, then every scale the month uses, declared once
  const span = rg ? (days.length === 1 ? days[0].date : `${days[0].date} to ${days[days.length - 1].date}`) : label;
  const head = ['---', 'Jot: 1.0', `Title: ${jfLine(o.title || 'Journal')} · ${span}`, `Date: ${days.length ? days[0].date : `${month}-01`}`, 'Made-with: Journalwright journal editor (fill-in template)', '---', ''];
  if (W.scales.size) {
    for (const s of W.scales.values()) {
      head.push(`:::record scale #${s.id}`, `name: ${jfSlug(s.name)}`, 'kind: ordinal', `minimum: ${s.min}`, `maximum: ${s.max}`, ...(s.lo ? [`anchor-low: ${jfLine(s.lo)}`] : []), ...(s.hi ? [`anchor-high: ${jfLine(s.hi)}`] : []), ...(s.unit ? [`unit: ${s.unit}`] : []), ':::', '');
    }
  }
  const body = W.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: `${head.join('\n')}\n${body}\n`, skipped: [...W.skipped], file: `${jfSlug(o.slug || o.title || 'journal')}-${rg && days.length ? days[0].date : month}.jot` };
}
// A month as several files: per 'month' (one), 'week' (Monday to Sunday, cut at the month) or 'day'. InkDeck holds 16 KB a file.
export function jotFiles(o, per = 'month') {
  if (per === 'month') return [jotFile(o)];
  const days = jfMonthDays(o.month), groups = per === 'day' ? days.map((d) => [d]) : jfWeeks(days).map((Wk) => Wk.days);
  return groups.map((g) => jotFile({ ...o, range: { from: g[0].date, to: g[g.length - 1].date } }));
}
export const JF_INKDECK_BYTES = 16383; // InkDeck's editor buffer (INKDECK_DOC_CAPACITY - 1): a bigger file opens cut short
