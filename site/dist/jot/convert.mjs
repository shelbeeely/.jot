/** Plain-text diaries to Jot. Pure (no fs): the command line (jot-convert.mjs) and, later, the web tools use the same code.
 *
 *   convert(text, options) -> { files: [{ name, text, entries, from, to, bytes }], stats, warnings, meta }
 *
 * What it finds, at the start of a paragraph (a quote mark or _italics_ around the date are fine):
 *   2026-10-25 · January 1st, 1888 · Jan. 1st (Lord's day) · APRIL 3.— · APRIL 8, Sunday.— · 20th Jan.— · 3 April 1888: · Monday, April 3 ·
 *   and a bare ordinal ("2nd. In the morning…") once a month is known.
 * A date needs something after it that ends it (. — -- : or the end of the line), so "March 18th, 1884, the monument…" in a preface is
 * just text. Short all-capitals lines with a month or a year ("JANUARY 1659-1660", "A VISIT TO GREECE IN 1888") are headings: they set
 * the year (a dual year like 1659-1660 means the second, the modern one) and become "## " headings; so does a centred line that names a
 * year, whatever its case ("My Paris Diary of 1870"). A diary that never states its year
 * takes options.year; when the months go backwards by more than half a year (December, then January) the year moves on.
 * Each entry becomes "### YYYY-MM-DD | <the date as written>", so nothing of the original is lost. Everything before the first entry is
 * kept, undated, at the top. Text that would read as a Jot or Markdown mark (a line starting "o ", "[ ] ", "#", "1660. ", "---" …) is
 * escaped, and indentation is dropped (an indented line would otherwise turn into a code block).
 *
 * options:
 *   year       a starting year for diaries that never state one
 *   calendar   'as-written' (default) or 'julian': the dates are Old Style; the heading date is converted to the Gregorian calendar
 *              (Jot dates are Gregorian), and the original date stays after the "|"
 *   notes      'margin' (default): a paragraph that is all [ … ] (an editor's note) becomes a Jot margin note [[ … ]] on one line;
 *              'keep' leaves it as text; 'drop' leaves it out
 *   per        'auto' (default), 'none', 'year' or 'month': how to split into files. 'auto' is one file unless it is bigger than the Jot
 *              tools open (MAX_FILE_BYTES), then one a year (and a month for a year that is still too big)
 *   title, author, source   metadata; read from a Project Gutenberg header when there is one
 *   name       the file name stem (default: from the title)
 */
export const MAX_FILE_BYTES = 1024 * 1024; // the plain-source limit of the Jot parser's readDocument (parser/container.mjs LIMITS.sourceBytes)

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_NAMES = MONTHS.map((m) => m[0].toUpperCase() + m.slice(1));
const ABBR = { jan: 0, feb: 1, febr: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const monthOf = (s) => { const k = s.toLowerCase().replace(/\.$/, ''); const i = MONTHS.indexOf(k); return i >= 0 ? i : ABBR[k] ?? -1; };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const M = '(january|february|march|april|may|june|july|august|september|october|november|december|sept|febr|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\\.?';
const D = '(\\d{1,2})(?:st|nd|rd|th|d)?';
const W = '(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|wed|thurs?|fri|sat)\\.?,?\\s+(?:the\\s+)?)?';
const Y = '(?:_?,?_?\\s+(\\d{4})(?:\\s*[-–/]\\s*(\\d{2,4}))?)?';
// a weekday after the date ("April 8, Sunday")
const WA = '(?:,?\\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\\b)?';
const PAREN = '(?:\\s*\\([^)\\n]{1,40}\\))?';
// what ends a date label: a dash or a colon (the text may follow at once), or a full stop, a space or the end of the line (and _italics_ around it)
const END = '_?\\.?_?(?:\\s*(?:—|--|:)|\\s*-(?=\\s)|(?=\\s|$))';
const RX = {
  iso: new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})${PAREN}${END}`),
  md: new RegExp(`^${W}${M}\\s+${D}${Y}${WA}${PAREN}${END}`, 'i'),
  dm: new RegExp(`^${W}${D}\\s+(?:of\\s+)?${M}${Y}${WA}${PAREN}${END}`, 'i'),
  day: new RegExp(`^${W}(\\d{1,2})(?:st|nd|rd|th|d)${PAREN}${END}`, 'i'),
};
const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${String(y).padStart(4, '0')}-${pad(m + 1)}-${pad(d)}`;
// Julian calendar date -> Gregorian (through the Julian day number)
export function julianToGregorian(y, m, d) {
  const a = Math.floor((14 - (m + 1)) / 12), yy = y + 4800 - a, mm = m + 1 + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
  const t = (jdn - 2440588) * 864e5, g = new Date(t);
  return [g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate()];
}
const weekdayOf = (y, m, d) => new Date(Date.UTC(y, m, d)).getUTCDay();

// ---- Project Gutenberg: the header gives the title, author and number; everything outside START/END is theirs, not the diary ----
export function stripGutenberg(text) {
  const meta = {};
  const s = text.search(/^\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG/im);
  if (s < 0) return { text, meta };
  const head = text.slice(0, s), afterStart = text.indexOf('\n', s) + 1;
  const e = text.slice(afterStart).search(/^\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/im);
  let body = e < 0 ? text.slice(afterStart) : text.slice(afterStart, afterStart + e);
  body = body.replace(/^[ \t]*End of (the )?Project Gutenberg.*$/gim, ''); // older ebooks end the text with their own line too
  const field = (k) => { const m = new RegExp(`^${k}:\\s*(.+(?:\\n {6,}.+)*)`, 'im').exec(head); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
  meta.title = field('Title'); meta.author = field('Author');
  const n = /\[E(?:Book|Text) #(\d+)\]/i.exec(head); if (n) meta.source = `https://www.gutenberg.org/ebooks/${n[1]}`;
  return { text: body, meta };
}

// ---- escaping: a line of the diary must stay a line of writing ----
const one = (s) => String(s).replace(/\s+/g, ' ').trim();
function escapeLine(line) {
  const t = line.replace(/^[ \t]+/, '');
  if (/^\d+[.)](\s|$)/.test(t)) return t.replace(/^(\d+)([.)])/, '$1\\$2'); // "1660. The year" is not a numbered list
  if (/^(\[[ x><!\-]\]\s|[o?!=] |#|>|:::|===|\/\*|\*\/|\.\S|[-*+](\s|$)|\[\[|@[a-z][a-z0-9-]*:|::voice|\||-{3,}\s*$|_{3,}\s*$|```|~~~|<)/.test(t)) return `\\${t}`;
  return t;
}
const isHeading = (p) => {
  if (p.lines.length !== 1) return false;
  const t = p.lines[0].trim(), letters = t.replace(/[^A-Za-z]/g, '');
  if (t.length > 80 || letters.length < 3 || /[.!?]$/.test(t.replace(/\]$/, ''))) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length / letters.length;
  // a centred line that names a year is a heading too, whatever its case ("My Paris Diary of 1870")
  if (/^\s{8,}[A-Z]/.test(p.lines[0]) && !/[,;:]$/.test(t) && /\b(1[0-9]{3}|20[0-9]{2})\b/.test(t)) return true;
  return upper > 0.8 && (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(t) || new RegExp(`\\b${M}\\b`, 'i').test(t) || /^(chapter|book|part|volume|vol\.?)\b/i.test(t));
};
const isNote = (p) => { const t = p.lines.map((l) => l.trim()).join(' '); return t.startsWith('[') && t.endsWith(']') && t.length > 2 && !t.slice(1, -1).includes('[') ; };

// ---- shared by the command line and the browser page (site/dist/convert/), so both offer the same things ----
export const CHOICES = { calendar: ['as-written', 'julian'], notes: ['margin', 'keep', 'drop'], per: ['auto', 'none', 'year', 'month'] };
// Options as typed (strings, or empty for "not given") -> options for convert(); throws an Error that says what to fix.
export function checkOptions(raw = {}) {
  const o = {}, given = (k) => raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '';
  if (given('year')) { const y = String(raw.year).trim(); if (!/^\d{1,4}$/.test(y)) throw new Error('the year is a number, like 1888'); o.year = +y; }
  for (const k of Object.keys(CHOICES)) if (given(k)) { if (!CHOICES[k].includes(raw[k])) throw new Error(`${k} is ${CHOICES[k].slice(0, -1).join(', ')} or ${CHOICES[k].at(-1)}`); o[k] = raw[k]; }
  for (const k of ['title', 'author', 'source']) if (given(k)) o[k] = one(raw[k]);
  if (given('name')) { const n = String(raw.name).trim(); if (!/^[\w.-]+$/.test(n) || n.startsWith('.')) throw new Error('the file name is letters, digits, dots, dashes and underscores'); o.name = n; }
  return o;
}
// UTF-8 bytes -> text; anything else (Latin-1, UTF-16) fails here rather than turning into mojibake
export function decodeText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new Error('this is not UTF-8 text (save it as UTF-8 and try again)'); }
}
// What a conversion found, in words: [the result, the weekday check]
export function summary(r, options = {}) {
  const s = r.stats, out = [], dates = r.files.flatMap((f) => [f.from, f.to]).filter(Boolean).sort();
  out.push(`${r.meta.title}${r.meta.author ? ` (${r.meta.author})` : ''}: ${s.entries} entries${dates.length ? ` from ${dates[0]} to ${dates[dates.length - 1]}` : ''}, ${s.headings} headings, ${s.notes} notes`);
  const jul = options.calendar === 'julian';
  if (s.weekday.mentioned) out.push(`weekdays named in the dates: ${s.weekday.mentioned}; they fit the dates ${jul ? 'as Old Style' : 'as written'} ${jul ? s.weekday.julian : s.weekday.asWritten} times`);
  return out;
}

// ---- the reading pass ----
export function convert(input, options = {}) {
  const o = { calendar: 'as-written', notes: 'margin', per: 'auto', ...options };
  const warnings = [];
  let text = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const g = stripGutenberg(text); text = g.text;
  const meta = { title: o.title || g.meta.title || 'Diary', author: o.author || g.meta.author || '', source: o.source || g.meta.source || '' };
  // paragraphs: runs of non-blank lines
  const paras = []; let cur = null;
  for (const line of text.split('\n')) { if (!line.trim()) { cur = null; continue; } if (!cur) paras.push((cur = { lines: [] })); cur.lines.push(line); }

  let year = Number.isInteger(o.year) ? o.year : null, month = null, lastMonth = null, lastDay = 0, started = false;
  const front = [], entries = []; // entry: { date, label, written: [y,m,d], blocks: [] }
  const stats = { paragraphs: paras.length, entries: 0, headings: 0, notes: 0, undatedCandidates: 0, weekday: { mentioned: 0, asWritten: 0, julian: 0 } };
  const push = (block) => (entries.length ? entries[entries.length - 1].blocks : front).push(block);

  for (const p of paras) {
    // headings set the year (and the month, when they name one)
    if (isHeading(p)) {
      const t = p.lines[0].trim(); stats.headings++;
      const mm = new RegExp(`\\b${M}\\b`, 'i').exec(t), hm = mm ? monthOf(mm[1]) : null;
      const dual = /\b(1[0-9]{3}|20[0-9]{2})\s*[-–/]\s*(\d{2,4})\b/.exec(t), single = /\b(1[0-9]{3}|20[0-9]{2})\b/.exec(t);
      if (dual) { const a = +dual[1], b = dual[2].length === 2 ? Math.floor(a / 100) * 100 + +dual[2] : +dual[2]; year = b === a + 1 && hm !== null ? b : a; }
      else if (single) year = +single[1];
      if (dual || single) { month = hm; lastMonth = hm; lastDay = 0; started = true; }
      push({ kind: 'heading', text: t });
      continue;
    }
    if (isNote(p)) {
      stats.notes++;
      if (o.notes === 'drop') continue;
      if (o.notes === 'margin') { push({ kind: 'note', text: one(p.lines.join(' ').trim().slice(1, -1)).replace(/\]\]/g, '] ]') }); continue; }
    }
    // a date at the start of the paragraph's first line (only at column 0: indented lines are quotations and notes)
    const first = p.lines[0];
    const lead = /^([“"‘']?)/.exec(first)[1], body = first.slice(lead.length).replace(/^_(?=[\w])/, '');
    let hit = null;
    if (!/^\s/.test(first)) {
      let m;
      if ((m = RX.iso.exec(body))) hit = { y: +m[1], m: +m[2] - 1, d: +m[3], len: m[0].length, explicitYear: true };
      else if ((m = RX.md.exec(body))) hit = { m: monthOf(m[1]), d: +m[2], y: m[3] ? +m[3] : null, y2: m[4], len: m[0].length };
      else if ((m = RX.dm.exec(body))) hit = { d: +m[1], m: monthOf(m[2]), y: m[3] ? +m[3] : null, y2: m[4], len: m[0].length };
      else if ((m = RX.day.exec(body)) && month !== null && year !== null && +m[1] > lastDay) hit = { d: +m[1], m: month, y: null, len: m[0].length, dayOnly: true };
    }
    if (hit && hit.m >= 0) {
      if (hit.y2 && hit.y) { const b = hit.y2.length === 2 ? Math.floor(hit.y / 100) * 100 + +hit.y2 : +hit.y2; if (b === hit.y + 1) hit.y = b; }
      let y = hit.y;
      if (y === null) {
        if (year === null || (!started && !Number.isInteger(o.year))) { stats.undatedCandidates++; hit = null; }
        else { y = year; if (!hit.dayOnly && lastMonth !== null && hit.m < lastMonth - 5) y = ++year; }
      }
      if (hit && (hit.d < 1 || hit.d > daysIn(y, hit.m))) hit = null;
      if (hit) {
        year = y; month = hit.m; lastMonth = hit.m; lastDay = hit.d; started = true;
        const label = one(body.slice(0, hit.len).replace(/[_]+/g, '').replace(/\s*(—|--|-|:)\s*$/, '').replace(/[.,]\s*$/, ''));
        let [gy, gm, gd] = [y, hit.m, hit.d];
        if (o.calendar === 'julian') [gy, gm, gd] = julianToGregorian(y, hit.m, hit.d);
        // a weekday in the label ("Lord's day", "Sunday", "(Monday)") says which calendar the writer used
        const wd = /lord.s day|sabbath/i.test(label) ? 0 : WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`, 'i').test(label));
        if (wd >= 0) { stats.weekday.mentioned++; if (weekdayOf(y, hit.m, hit.d) === wd) stats.weekday.asWritten++; const [jy, jm, jd] = julianToGregorian(y, hit.m, hit.d); if (weekdayOf(jy, jm, jd) === wd) stats.weekday.julian++; }
        const restFirst = body.slice(hit.len).replace(/^[\s_—:-]+/, '');
        const lines = [...(restFirst ? [lead + restFirst] : lead ? [lead] : []), ...p.lines.slice(1)];
        entries.push({ date: iso(gy, gm, gd), label, written: iso(y, hit.m, hit.d), blocks: lines.length ? [{ kind: 'text', lines }] : [] });
        stats.entries++;
        continue;
      }
    }
    push({ kind: 'text', lines: p.lines });
  }
  if (!entries.length) warnings.push(Number.isInteger(o.year) ? 'No dated entries found.' : 'No dated entries found. If the diary never says the year, give one (--year).');
  if (stats.undatedCandidates && !entries.length) warnings.push(`${stats.undatedCandidates} paragraphs start with a date but no year is known: give a starting year (--year).`);
  const wk = stats.weekday;
  if (o.calendar === 'as-written' && wk.mentioned >= 5 && wk.julian / wk.mentioned > 0.8 && wk.asWritten / wk.mentioned < 0.5)
    warnings.push(`The weekdays the diary names fit the Julian (Old Style) calendar (${wk.julian} of ${wk.mentioned}), not the dates as written (${wk.asWritten}): try --calendar julian.`);

  // ---- writing the .jot ----
  const renderBlocks = (blocks) => blocks.map((b) => (b.kind === 'heading' ? `## ${escapeHeading(b.text)}` : b.kind === 'note' ? `[[${b.text}]]` : b.lines.map(escapeLine).join('\n'))).join('\n\n');
  const header = (subtitle) => ['---', 'Jot: 1.0', `Title: ${one(meta.title)}${subtitle ? ` · ${subtitle}` : ''}`, ...(meta.author ? [`Author: ${one(meta.author)}`] : []), ...(meta.source ? [`Source: ${one(meta.source)}`] : []),
    ...(o.calendar === 'julian' ? ['Calendar: julian (dates converted to the Gregorian calendar; the date as written follows each "|")'] : []), 'Converted-with: jot-convert', '---', ''].join('\n');
  const entryText = (e) => `### ${e.date} | ${e.label}${o.calendar === 'julian' && e.written !== e.date ? ` (${e.written} Old Style)` : ''}\n\n${renderBlocks(e.blocks)}`.trimEnd();
  const doc = (subtitle, frontBlocks, list) => `${header(subtitle)}\n${[frontBlocks.length ? renderBlocks(frontBlocks) : '', ...list.map(entryText)].filter(Boolean).join('\n\n')}\n`;
  const stem = o.name || slug(meta.title.split(/\s*[,:;(]|\s+[—–-]\s+/)[0]);  // "My diaries, being a …" -> my-diaries
  const size = (s) => new TextEncoder().encode(s).length;
  const fileOf = (name, subtitle, frontBlocks, list) => { const t = doc(subtitle, frontBlocks, list); return { name, text: t, entries: list.length, from: list[0] && list[0].date, to: list.length ? list[list.length - 1].date : undefined, bytes: size(t) }; };
  let files;
  const whole = fileOf(`${stem}.jot`, '', front, entries);
  const groupBy = (list, key) => { const out = new Map(); for (const e of list) { const k = key(e); if (!out.has(k)) out.set(k, []); out.get(k).push(e); } return [...out]; };
  if (o.per === 'none' || (o.per === 'auto' && whole.bytes <= MAX_FILE_BYTES) || !entries.length) files = [whole];
  else if (o.per === 'month') files = groupBy(entries, (e) => e.date.slice(0, 7)).map(([k, list], i) => fileOf(`${stem}-${k}.jot`, `${MONTH_NAMES[+k.slice(5) - 1]} ${k.slice(0, 4)}`, i ? [] : front, list));
  else {
    files = [];
    for (const [k, list] of groupBy(entries, (e) => e.date.slice(0, 4))) {
      const f = fileOf(`${stem}-${k}.jot`, k, files.length ? [] : front, list);
      if (o.per === 'auto' && f.bytes > MAX_FILE_BYTES) for (const [mk, ml] of groupBy(list, (e) => e.date.slice(0, 7))) files.push(fileOf(`${stem}-${mk}.jot`, `${MONTH_NAMES[+mk.slice(5) - 1]} ${mk.slice(0, 4)}`, files.length ? [] : front, ml));
      else files.push(f);
    }
  }
  for (const f of files) if (f.bytes > MAX_FILE_BYTES) warnings.push(`${f.name} is ${(f.bytes / 1048576).toFixed(1)} MiB, more than the ${MAX_FILE_BYTES / 1048576} MiB the Jot tools open (split it with --per year or --per month).`);
  return { files, stats, warnings, meta };
}
const escapeHeading = (t) => t.replace(/^#+\s*/, '');
const slug = (s) => one(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '') || 'diary';
