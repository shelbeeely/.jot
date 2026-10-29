/** Jot page preview, draft 0.1: a parsed journal drawn into a DOM element. Shared by the workspace, the template editor and the
 * VS Code extension, so a journal looks the same in each. DOM only: Markdown becomes elements built one by one (never innerHTML), raw
 * HTML is never rendered, links are only http(s), mailto and #, and images come only from the attachments the caller lends.
 * A `:::record chart` becomes one Chart.js chart per metric (charts.mjs chartConfig, vendor/chart.mjs), each with a text summary as its
 * accessible name and the numbers as a table. A `:::record query` (query.mjs) becomes its summary sentence and a table of what it found,
 * or, when a field can't be read, says what is wrong instead.
 * A `:::record palette` becomes swatch chips (palette.mjs): each names its color and hex in text, in black or white, whichever has the
 * higher contrast; a color that is not #RRGGBB or #RGB shows a note. A `:::record moodboard` is a grid of its attached pictures (with
 * descriptions, captions and credits), and a paragraph of two or more pictures alone is drawn as the same grid.
 *
 * Fuller formatting (spec 4.2.1): ==highlight==, ++underline++, ^superscript^, footnotes ([^1] and [^1]: …, gathered at the end),
 * callouts (> [!NOTE]) and centred lines (-> … <-).
 *
 *   renderPreview(ast, target, { asset(path) -> {url, mediaType} | null, sample: false, empty: 'A little room …',
 *                                style: 'journal' | 'notes' | 'plain' | null (styles.mjs; a typed page only),
 *                                hand: null | { hand: 'pen', ink: 'blue', pitchMm: 5, dots: true, seed: 1, pageRows: 0 },
 *                                include(path) -> text | null, from: '', reference(href) -> void })
 *     `![label](other.jot#id)` on a line of its own shows that part of another journal in place, framed and labelled with where it
 *     came from (include.mjs). The host reads the file and lends its text through opts.include (the path is already checked to stay
 *     inside the root; `from` is this document's own path there); a missing, unsafe, looping or too-deep include says so on the page.
 *     With `hand`, the page is written in a handwriting font on a dot grid (handwriting.mjs); target.jotReady resolves when it is
 *     aligned (after the fonts load).
 *   drawChart(section, model)   one chart record's figures into an element (the home page uses it on its own)
 *
 * Jot's own marks get their own look, in every style: a dated heading reads as a date ("Monday 26 October 2026", the rest of the
 * heading kept as a note), tasks show their state (open, done, moved, scheduled, cancelled, high), events, questions and ideas
 * their sign, [[margin notes]] sit beside the writing, `.0830 - KITCHEN` time labels read "08:30 · KITCHEN", and #tags and
 * @contexts are marked. opts.locale sets how dates are written (default en-GB).
 */
import { charts, chartConfig, summaryText, fmt, CHART_CSS, metricLabel } from './charts.mjs';
import { Chart } from './vendor/chart.mjs';
import { queries, TAGGED } from './query.mjs';
import { HANDS, handwrite, alignToGrid, handwritingCSS, pitchPx, blockLayoutFromComment, paintHighlights } from './handwriting.mjs';
import { parse, mediaURL } from './jot.mjs';
import { styleCSS, isStyle } from './styles.mjs';
import { includeLines, excerpt, notice, MAX_DEPTH } from './include.mjs';
import { isPaletteRecord, paletteOf, moodboardOf } from './palette.mjs';
export { CHART_CSS };
const CALLOUTS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };

const themeOf = (el) => {
  const cs = el.ownerDocument.defaultView.getComputedStyle(el), v = (k, d) => cs.getPropertyValue(k).trim() || d;
  const hand = el.closest('.jot-hand');
  return { series: hand ? cs.color : v('--jc-series', v('--jot-ink', '#2a78d6')), muted: hand ? cs.color : v('--jc-muted', v('--jot-muted', '#5f675f')),
    grid: v('--jc-grid', v('--jot-edge', '#e2e3dc')), ink: hand ? cs.color : v('--jc-ink', v('--jot-ink', '#242927')),
    surface: v('--jc-surface', v('--jot-paper', '#fffefa')), font: el.ownerDocument.defaultView.getComputedStyle(hand || el).fontFamily };
};
/** Draws one chart record into section (an element already in the page): a figure per metric, then the numbers as a table. */
export function drawChart(section, model) {
  const doc = section.ownerDocument, el = (tag, text, cls) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  for (const c of section.querySelectorAll('canvas')) { const old = Chart.getChart(c); if (old) old.destroy(); }
  section.replaceChildren();
  if (!model) { section.append(el('p', 'A chart with nothing to draw yet: give it metrics, or a start and end date.', 'jot-chart-note')); return; }
  if (model.empty) { section.append(el('p', `No numbers to chart between ${model.start} and ${model.end} yet.`, 'jot-chart-note')); return; }
  const theme = themeOf(section), grid = el('div', undefined, 'jot-chart-grid');
  section.append(grid);
  for (const s of model.series) {
    const fig = el('figure', undefined, 'jot-chart-one'), cap = el('figcaption'), name = el('span', s.label, 'jc-name'), unit = s.unit ? ` ${s.unit}` : '';
    if (s.unit) name.append(' ', el('span', `(${s.unit})`, 'jc-unit'));
    const sum = el('span', s.sample ? 'sample numbers · ' : '', 'jc-sum');
    if (s.stats.n) sum.append('avg ', el('b', `${fmt(s.stats.avg)}${unit}`), ` · ${fmt(s.stats.low)}–${fmt(s.stats.high)}${unit} · ${s.stats.n}/${s.stats.of} days`);
    else sum.append(`${s.stats.of} days, nothing written yet`);
    cap.append(name, sum);
    const box = el('div', undefined, 'jc-canvas'), canvas = el('canvas');
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', summaryText(model, s));
    canvas.textContent = summaryText(model, s); // read where canvas is not drawn
    box.append(canvas); fig.append(cap, box);
    if (s.anchors && (s.anchors.lo || s.anchors.hi)) fig.append(el('span', `${fmt(s.min)} = ${s.anchors.lo || 'low'}, ${fmt(s.max)} = ${s.anchors.hi || 'high'}`, 'jc-anchors'));
    grid.append(fig);
    new Chart(canvas, chartConfig(model, s, theme));
  }
  const det = el('details', undefined, 'jot-chart-table'), wrap = el('div', undefined, 'jc-scroll'), table = el('table'), thead = el('thead'), hr = el('tr'), tbody = el('tbody');
  wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'The numbers');
  hr.append(el('td')); for (const d of model.days) { const th = el('th', d.short); th.scope = 'col'; hr.append(th); }
  thead.append(hr);
  for (const s of model.series) { const tr = el('tr'), th = el('th', `${s.label}${s.unit ? ` (${s.unit})` : ''}`); th.scope = 'row'; tr.append(th); for (const v of s.points) tr.append(el('td', v === null ? '–' : fmt(v))); tbody.append(tr); }
  table.append(thead, tbody); wrap.append(table); det.append(el('summary', 'The numbers'), wrap); section.append(det);
}

const BLANKS = /^(?:(?:\d+\.|[-*+]|\[[ x]\])[ \t]*(?:\r?\n|$))+$/i;
const RASTER = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
const TASK = { open: ['☐', 'to do'], completed: ['☑', 'done'], migrated: ['→', 'moved'], scheduled: ['←', 'scheduled'], cancelled: ['✕', 'cancelled'] };
const SIGN = { event: ['○', 'Event'], question: ['?', 'Question'], idea: ['!', 'Idea'], voice: ['❝', 'Voice'], synopsis: ['≡', 'Summary'] };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** "2026-10-26" as words; the rest of the heading after "|" is kept when it says more than the weekday. */
export function dateWords(date, rest = '', locale = 'en-GB') {
  const t = new Date(`${date}T00:00:00Z`), words = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(t);
  const note = String(rest || '').trim();
  return { words, note: note && note.toLowerCase() !== WEEKDAYS[t.getUTCDay()] ? note : '' };
}
const PARSED = new Map(); // included files, parsed once while their text stays the same (the page redraws on every edit)
const CHARTS = new WeakMap(), chartsOf = (a, sample) => { const k = sample ? 's' : 'r'; let m = CHARTS.get(a); if (!m) CHARTS.set(a, (m = {})); return m[k] || (m[k] = charts(a, { sample })); }; // an included file's chart models, once per text
const parsed = (text) => { let a = PARSED.get(text); if (!a) { a = parse(text); if (PARSED.size > 32) PARSED.delete(PARSED.keys().next().value); PARSED.set(text, a); } return a; };
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function renderPreview(ast, target, opts = {}) {
  const doc = target.ownerDocument, asset = opts.asset || (() => null);
  const el = (tag, text, cls) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  function inline(tokens, into) {
    for (const t of tokens || []) {
      let n;
      switch (t.type) {
        case 'text': if (t.tokens) { inline(t.tokens, into); continue; } n = tagged(decode(t.text)); break;
        case 'escape': n = el('span', t.text); break;
        case 'strong': n = el('strong'); inline(t.tokens, n); break;
        case 'em': n = el('em'); inline(t.tokens, n); break;
        case 'del': n = el('del'); n.style.setProperty('--jot-strike', 'currentColor'); inline(t.tokens, n); break;
        case 'codespan': n = el('code', decode(t.text)); break;
        case 'br': n = el('br'); break;
        case 'link': {
          const href = mediaURL(t.href || '') || t.href || '', a = asset(href);
          if (a && a.url) { n = el('a'); n.href = a.url; n.download = href.split('/').pop(); inline(t.tokens, n); break; }
          if (href.startsWith('#')) { // a link within this journal (spec 4.2.2): to its date heading or record, by this page's prefixed id
            const id = decode(href.slice(1));
            if (anchors.has(id)) { n = el('a'); n.href = `#${anchors.prefix}${id}`; }
            else if (resolved.has(id)) n = el('span'); // a target that is not drawn (a scale's definition)
            else { n = el('span', undefined, 'jot-link-unresolved'); n.title = `Nothing here is called ${id}`; }
            inline(t.tokens, n); break;
          }
          if (/^[A-Za-z0-9][A-Za-z0-9._-]*\.jot#[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(href) && typeof opts.reference === 'function') {
            n = el('a'); n.href = href; n.dataset.jotReference = href;
            n.onclick = (event) => { event.preventDefault(); opts.reference(href); };
            inline(t.tokens, n); break;
          }
          if (/^(https?:|mailto:)/i.test(href)) { n = el('a'); n.href = href; n.rel = 'noopener noreferrer'; n.target = '_blank'; inline(t.tokens, n); } else { n = el('span'); inline(t.tokens, n); }
          break;
        }
        case 'image': n = /\.jot(?:#|$)/i.test(t.href || '') ? el('span', `[Include: ${t.text || 'journal'} · ${t.href} · on a line of its own, it shows here]`, 'jot-include-inline') : picture(t.href, t.text, 'Handwriting or image'); break;
        case 'html': n = el('span', '[HTML omitted]', 'raw-html'); break;
        case 'colorSpan': {
          n = el('span', undefined, 'jot-colors');
          // Validate even caller-supplied ASTs; never accept arbitrary CSS or URLs.
          for (const [key, value] of Object.entries(t.colors || {})) {
            if (key === 'highlight-style') { if (['marker','brush','pencil'].includes(value)) n.dataset.highlightStyle = value; continue; }
            if (!/^#[0-9a-f]{6}$/i.test(value)) continue;
            if (key === 'ink') { n.style.color = value; n.style.setProperty('--jot-source-ink', value); n.dataset.ink = 'true'; }
            if (key === 'highlight') { n.style.setProperty('--jot-highlight', value); n.classList.add('jot-highlight'); }
            if (key === 'strike' || key === 'underline') {
              n.style.setProperty('--jot-' + key, value);
              const line = el(key === 'strike' ? 'del' : 'ins');
              line.style.setProperty('--jot-decoration', value); n.append(line);
            }
          }
          let content = n;
          // Nest decorations so strike and underline can have independent colors.
          for (const line of [...n.children]) { if (content !== n) content.append(line); content = line; }
          inline(t.tokens, content); break;
        }
        case 'mark': n = el('mark'); inline(t.tokens, n); break;
        case 'ins': n = el('ins'); n.style.setProperty('--jot-underline', 'currentColor'); inline(t.tokens, n); break;
        case 'sup': n = el('sup'); inline(t.tokens, n); break;
        case 'footnoteRef': {
          if (!notes.order.includes(t.id)) notes.order.push(t.id);
          const num = notes.order.indexOf(t.id) + 1, a = el('a', String(num)); a.href = `#${notes.prefix}${t.id}`; a.id = `${notes.prefix}ref-${t.id}`; a.setAttribute('aria-label', `Note ${num}`);
          n = el('sup', undefined, 'jot-fn-ref'); n.append(a); break;
        }
        default: n = el('span', t.text || t.raw || '');
      }
      into.append(n);
    }
  }
  function picture(href, alt, fallback) { // an attached picture, or a note saying what is missing; nothing outside the attachments is fetched
    const a = asset(href);
    if (a && a.url && RASTER.has(a.mediaType)) { const n = el('img'); n.src = a.url; n.alt = alt || fallback; n.loading = 'lazy'; return n; }
    return el('span', `[Image: ${alt || 'attachment'} · ${href}${a ? '' : ' · not attached'}]`, 'jot-missing');
  }
  function moodGrid(items) { // [{ path, alt, caption, credit }] as figures in a responsive grid
    const grid = el('div', undefined, 'jot-mood-grid');
    for (const it of items) {
      const fig = el('figure', undefined, 'jot-mood'), pic = picture(it.path, it.alt || it.caption, 'Moodboard picture');
      if (pic.tagName !== 'IMG') fig.classList.add('jot-mood-missing');
      fig.append(pic);
      if (it.caption || it.credit) {
        const cap = el('figcaption'); if (it.caption) { const c = el('span', undefined, 'jot-mood-caption'); inline(inlineOf(it.caption), c); cap.append(c); }
        if (it.credit) { const c = el('span', undefined, 'jot-mood-credit'); c.append('Credit: '); inline(inlineOf(it.credit), c); cap.append(c); }
        fig.append(cap);
      }
      grid.append(fig);
    }
    return grid;
  }
  function swatches(p) { // name and hex always as text; the label ink is black or white by WCAG contrast (palette.mjs labelInk)
    const ul = el('ul', undefined, 'jot-swatches'); ul.setAttribute('role', 'list');
    for (const s of p.swatches) {
      const li = el('li', undefined, 'jot-swatch'); li.style.backgroundColor = s.hex; li.style.color = s.ink; li.dataset.hex = s.hex;
      li.append(el('span', s.name || 'Unnamed', 'jot-swatch-name'), el('span', s.hex, 'jot-swatch-hex'));
      ul.append(li);
    }
    for (const raw of p.invalid) { ul.append(el('li', `Not a color: “${raw}”. Write color: #RRGGBB name.`, 'jot-swatch-invalid')); }
    return ul;
  }
  function tagged(text) { // #tags and @contexts at a word's start (spec 4.1), marked; the rest stays plain text
    const span = el('span'); let at = 0;
    for (const m of text.matchAll(TAGGED)) {
      const start = m.index + m[1].length; if (start > at) span.append(text.slice(at, start));
      span.append(el('span', m[2], m[2][0] === '#' ? 'jot-tag' : 'jot-context')); at = start + m[2].length;
    }
    if (at < text.length) span.append(text.slice(at));
    return span;
  }
  const inlineOf = (text) => { const a = parse(String(text || ''), { journal: false }), p = a.nodes.find((x) => x.markdown && x.markdown.tokens); return p ? p.markdown.tokens : [{ type: 'text', text }]; };
  function block(t, into) {
    let n;
    switch (t.type) {
      case 'space': case 'checkbox': return;
      case 'heading': {
        n = el('h' + Math.min(6, t.depth));
        const m = /^(\d{4}-\d{2}-\d{2})(?:\s*\|\s*(.*))?$/.exec(t.text || '');
        if (m && !Number.isNaN(Date.parse(m[1]))) { // a dated entry
          const { words, note } = dateWords(m[1], m[2], opts.locale), time = el('time', words); time.dateTime = m[1];
          n.classList.add('jot-date'); n.append(time); if (note) n.append(' ', el('span', note, 'jot-date-note'));
        } else inline(t.tokens, n);
        break;
      }
      case 'paragraph': {
        const tokens = t.tokens || [], pics = tokens.filter((x) => x.type === 'image');
        if (pics.length > 1 && tokens.every((x) => x.type === 'image' || x.type === 'br' || (x.type === 'text' && !x.tokens && !String(x.text).trim()))) { // a run of pictures: a moodboard
          n = moodGrid(pics.map((x) => ({ path: x.href, alt: x.text, caption: x.title ? decode(x.title) : '' }))); n.setAttribute('role', 'group'); n.setAttribute('aria-label', 'Pictures'); break;
        }
      } // falls through
      case 'text': n = el('p'); inline(t.tokens || [{ type: 'text', text: t.text }], n); break;
      case 'blockquote': n = el('blockquote'); for (const c of t.tokens || []) block(c, n); break;
      case 'list':
        n = el(t.ordered ? 'ol' : 'ul'); if (t.ordered && t.start) n.start = t.start;
        for (const item of t.items || []) {
          const li = el('li');
          if (item.task) { const cb = el('input'); cb.type = 'checkbox'; cb.disabled = true; cb.checked = item.checked; li.append(cb, doc.createTextNode(' ')); }
          for (const c of item.tokens || []) block(c, li);
          n.append(li);
        }
        break;
      case 'code': n = el('pre'); n.append(el('code', t.text)); break;
      case 'hr': n = el('hr'); break;
      case 'table': {
        n = el('table'); const head = el('thead'), row = el('tr');
        for (const c of t.header) { const cell = el('th'); inline(c.tokens, cell); row.append(cell); }
        head.append(row); n.append(head); const body = el('tbody');
        for (const r of t.rows) { const tr = el('tr'); for (const c of r) { const cell = el('td'); inline(c.tokens, cell); tr.append(cell); } body.append(tr); }
        n.append(body); break;
      }
      case 'html': n = el('p', '[Raw HTML is preserved in source and omitted from preview.]', 'raw-html'); break;
      case 'center': n = el('p', undefined, 'jot-center'); inline(t.tokens, n); break;
      case 'footnote': notes.defs.set(t.id, t.tokens); return; // gathered at the end of the page
      default: n = el('p', t.text || t.raw || '');
    }
    into.append(n);
  }
  const queryOf = new Map(queries(ast).map((q) => [q.node, q.model]));
  function drawQuery(model) { // its summary is its text alternative; the rows are a plain table, read in order
    const box = el('section', undefined, 'jot-record jot-query'), title = model.label || 'Query';
    box.setAttribute('aria-label', `Query: ${title}`); box.append(el('strong', title));
    if (model.problems.length) { // the problems, said once (the summary repeats them for plain-text readers)
      const note = el('div', undefined, 'jot-query-problem'), ul = el('ul'); note.setAttribute('role', 'note');
      note.append(el('p', 'This query can’t be shown until it is fixed:')); for (const p of model.problems) ul.append(el('li', p.message)); note.append(ul);
      box.append(note); return box;
    }
    box.append(el('p', model.summary, 'jot-query-sum'));
    if (!model.cells.length) return box;
    const wrap = el('div', undefined, 'jot-query-scroll'), table = el('table'), hr = el('tr'), tbody = el('tbody');
    wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', `${title}: results`);
    for (const h of model.head) { const th = el('th', h); th.scope = 'col'; hr.append(th); }
    for (const r of model.cells) { const tr = el('tr'); r.forEach((c, i) => { const td = el('td'); if (i === r.length - 1) td.append(tagged(c)); else td.textContent = c; tr.append(td); }); tbody.append(tr); }
    const thead = el('thead'); thead.append(hr); table.append(thead, tbody); wrap.append(table); box.append(wrap);
    return box;
  }
  const chartOf = new Map(charts(ast, { sample: !!opts.sample }).map((c) => [c.node, c.model])), drawn = [];
  const pageId = (target.id || 'page').replace(/[^\w-]/g, '');
  let notes = { order: [], defs: new Map(), prefix: `jotfn-${pageId}-` };
  // Link targets get this page's prefix too, so two previews in one document never share an id. Backlinks: target node -> linking nodes.
  const hidden = (n) => n.type === 'record' && (n.recordType === 'scale' || n.recordType === 'sync'); // targets that are never drawn
  const anchors = new Set(ast.nodes.filter((n) => n.anchor && !hidden(n)).map((n) => n.anchor)), resolved = new Set(), fieldLinks = new Set(), linkedFrom = new Map(), entryAt = [];
  anchors.prefix = `jotln-${pageId}-`;
  for (const l of ast.links || []) {
    if (l.file || !Number.isInteger(l.to)) continue;
    resolved.add(l.target); if (l.field) fieldLinks.add(`${l.node} ${l.field} ${l.target}`);
    if (l.to !== l.node) { const from = linkedFrom.get(l.to) || []; if (!from.includes(l.node)) from.push(l.node); linkedFrom.set(l.to, from); }
  }
  for (const e of ast.entries || []) for (let k = e.startNode; k < e.endNode; k++) entryAt[k] = ast.nodes[e.startNode];
  const nameOf = (n) => n.date === n.anchor ? dateWords(n.date, '', opts.locale).words : `${n.recordType} #${n.anchor}`;
  function backlinks(j) { // "Linked from" each place that links here: the linking record, or the dated entry the link is written in
    const p = el('p', undefined, 'jot-backlinks'), seen = new Set(); p.append(el('span', 'Linked from', 'jot-backlinks-title'), ' ');
    for (const k of linkedFrom.get(j)) {
      const h = entryAt[k], src = anchors.has(ast.nodes[k].anchor) ? ast.nodes[k] : h && anchors.has(h.anchor) ? h : null;
      const key = src ? src.anchor : h ? `date ${h.date}` : '';
      if (seen.has(key) || (src && src === ast.nodes[j])) continue; seen.add(key);
      if (seen.size > 1) p.append(' · ');
      if (src) { const a = el('a', nameOf(src)); a.href = `#${anchors.prefix}${src.anchor}`; p.append(a); }
      else p.append(el('span', h ? dateWords(h.date, '', opts.locale).words : 'undated writing')); // a repeated date's later heading has no id of its own
    }
    return seen.size ? p : null;
  }
  const hand = opts.hand ? { hand: 'pen', ink: 'blue', pitchMm: 5, dots: true, seed: 1, pageRows: 0, ...opts.hand } : null;
  target.classList.toggle('jot-hand', !!hand); // before anything is drawn, so charts size themselves to the grid
  for (const c of [...target.classList]) if (c.startsWith('jot-style-')) target.classList.remove(c);
  if (!hand && opts.style && isStyle(opts.style)) { addPageStyles(doc); target.classList.add(`jot-style-${opts.style}`); }
  if (hand) { addHandwritingStyles(doc); target.style.setProperty('--hw-pitch', `${pitchPx(hand.pitchMm)}px`); target.style.setProperty('--hw-family', `'${(HANDS[hand.hand] || HANDS.pen).family}'`); }
  else for (const k of ['--hw-pitch', '--hw-family', '--hw-size', '--hw-ink', '--hw-dots', '--hw-dx', '--hw-dy', '--hw-text-shift']) target.style.removeProperty(k);
  const root = doc.createDocumentFragment(), lend = typeof opts.include === 'function' ? opts.include : () => null;
  let includes = 0;
  function include(inc, into, at) { // one `![label](file.jot#id)`: the part it names, framed, or a notice saying why not
    const say = (kind) => { const p = el('p', undefined, 'jot-include jot-include-missing'); p.setAttribute('role', 'note'); p.append(el('span', '⧉', 'jot-sym'), ' ', el('span', `Include ${notice(kind, inc.href)}`)); into.append(p); };
    if (inc.error) return say(inc.error);
    if (at.stack.includes(inc.path)) return say('loop');
    if (at.level >= MAX_DEPTH) return say('too-deep');
    let text; try { text = lend(inc.path); } catch { text = null; }
    if (typeof text !== 'string') return say('not-found');
    const sub = parsed(text), list = excerpt(sub, inc.fragment);
    if (!list) return say('no-fragment');
    if (list.some((x) => x.type === 'record' && x.recordType === 'chart')) for (const c of chartsOf(sub, !!opts.sample)) chartOf.set(c.node, c.model); // only when it shows a chart
    if (list.some((x) => x.type === 'record' && x.recordType === 'query')) for (const q of queries(sub)) queryOf.set(q.node, q.model); // counted in the file it is written in
    const where = `${inc.path}${inc.fragment ? '#' + inc.fragment : ''}`, box = el('section', undefined, 'jot-include');
    box.setAttribute('aria-label', `Included from ${where}`); box.dataset.source = where;
    const head = el('p', undefined, 'jot-include-source'); head.append(el('span', '⧉', 'jot-sym'), ' ', inc.label ? `${inc.label} · ` : '', el('span', where, 'jot-include-path'));
    box.append(head);
    const outer = notes; notes = { order: [], defs: new Map(), prefix: `${outer.prefix}inc${++includes}-` }; // its footnotes stay inside the frame, with ids of their own
    draw(list, box, { level: at.level + 1, stack: [...at.stack, inc.path], from: inc.path });
    footnotes(box); notes = outer;
    into.append(box);
  }
  function draw(list, root, at) {
    let frag = root;
    for (const [j, n] of list.entries()) {
      const before = frag.lastChild, top = !at.level;
      drawOne(n, top ? j : -1);
      if (!top || !n.anchor || !frag.lastChild || frag.lastChild === before || !frag.lastChild.setAttribute) continue; // only this page's own targets carry ids
      frag.lastChild.id = `${anchors.prefix}${n.anchor}`;
      const back = linkedFrom.has(j) && backlinks(j); if (back) frag.append(back);
    }
    function drawOne(n, j) {
      const incs = includeLines(n, at.from);
      if (incs) { for (const inc of incs) include(inc, frag, at); return; }
      if (n.type === 'comment') {
        if (at.level) return; // a page layout belongs to the page, not to what it includes
        const layout = blockLayoutFromComment(n.raw);
        if (layout) {
          frag = el('section', undefined, 'jot-layout-block');
          frag.dataset.blockId = layout.id; frag.dataset.minRows = layout.rows;
          frag.dataset.gap = layout.gap; frag.dataset.newPage = layout.newPage;
          root.append(frag);
        } else if (/^\/\*\r?\njot-block-end\r?\n\*\//.test(n.raw)) frag = root;
        return;
      }
      if (n.type === 'comment' || n.type === 'directive' || n.type === 'blank') return;
      if (n.markdown && n.markdown.type === 'paragraph' && BLANKS.test(n.markdown.raw.trim())) { // a template's empty lines: "1. ", "- ", "[ ] " to write after
        const box = el('div', undefined, 'jot-blanks');
        for (const line of n.markdown.raw.trim().split(/\r?\n/)) { const m = line.trim(), mark = /^\[x\]/i.test(m) ? '☑' : m.startsWith('[') ? '☐' : /^\d/.test(m) ? m : '•'; const row = el('div', undefined, 'jot-blank-line'); row.append(el('span', mark, 'jot-mark'), el('span', '', 'jot-rule')); box.append(row); }
        frag.append(box); return;
      }
      if (n.type === 'record' && (n.recordType === 'scale' || n.recordType === 'sync')) return; // a scale is a definition (its range shows on the charts that use it); a sync record is bookkeeping for a connection
      if (n.markdown && n.markdown.type === 'blockquote' && n.callout) {
        const box = el('aside', undefined, `jot-callout jot-callout-${n.callout}`); box.setAttribute('role', 'note');
        box.append(el('p', CALLOUTS[n.callout], 'jot-callout-title')); for (const c of n.markdown.tokens || []) block(c, box);
        frag.append(box); return;
      }
      if (n.markdown) { if (n.diagram) frag.append(el('p', n.diagram.engine + ' source · rendering adapter not installed', 'diagram-note')); block(n.markdown, frag); if (n.date && n.timezoneSource) { const badge = el('span', n.timezone || 'Timezone unresolved', 'jot-timezone'); badge.setAttribute('aria-label', (n.timezoneSource === 'entry' ? 'Entry timezone: ' : 'Document timezone: ') + (n.timezone || 'unresolved')); frag.lastElementChild?.append(' ', badge); } return; }
      if (n.type === 'task') {
        const [sym, said] = TASK[n.status] || TASK.open, row = el('div', undefined, `jot-task jot-task-${n.status}${n.priority === 'high' ? ' jot-task-high' : ''}`);
        const box = el('span', sym, 'jot-box'); box.setAttribute('role', 'img'); box.setAttribute('aria-label', said); box.dataset.status = n.status;
        const words = el('span', undefined, 'jot-task-text'); const p = n.inline && n.inline.find((x) => x.tokens); inline(p ? p.tokens : [{ type: 'text', text: n.text }], words);
        row.append(box, ' ', words); if (n.priority === 'high') row.append(' ', el('span', '!', 'jot-priority'));
        frag.append(row);
      }
      else if (n.type === 'record' && n.recordType === 'chart') {
        const box = el('section', undefined, 'jot-chart'); box.setAttribute('aria-label', 'Chart');
        frag.append(box); drawn.push([box, chartOf.get(n)]);
      } else if (n.type === 'record' && n.recordType === 'query') frag.append(drawQuery(queryOf.get(n)));
      else if (n.type === 'record' && n.recordType === 'measurement' && n.fields.some((f) => f.name === 'metric')) {
        const get = (k) => (n.fields.find((f) => f.name === k) || {}).value || '';
        const box = el('section', undefined, 'jot-record jot-measure');
        box.append(el('strong', metricLabel(get('metric').replace(/[^a-z0-9]+/gi, '-').toLowerCase()) + ':'), doc.createTextNode(' '));
        box.append(get('value') ? el('span', `${get('value')}${get('unit') ? ' ' + get('unit') : ''}`, 'jot-value') : el('span', '____', 'jot-blank'));
        frag.append(box);
      } else if (isPaletteRecord(n)) {
        const board = n.recordType !== 'palette', p = board ? moodboardOf(n) : paletteOf(n);
        const box = el('section', undefined, `jot-record ${board ? 'jot-moodboard' : 'jot-palette'}`); box.setAttribute('aria-label', `${board ? 'Moodboard' : 'Palette'}: ${p.title}`);
        box.append(el('strong', p.title));
        if (board && p.images.length) box.append(moodGrid(p.images));
        if (p.swatches.length || p.invalid.length) box.append(swatches(p));
        if (p.rest.length) { const dl = el('dl'); for (const f of p.rest) dl.append(el('dt', f.name), el('dd', f.value)); box.append(dl); }
        frag.append(box);
      } else if (n.type === 'record') {
        const box = el('section', undefined, 'jot-record'); box.append(el('strong', n.recordType));
        const dl = el('dl');
        for (const f of n.fields) { // a link field (relation: kind #target, member:, source: …) that resolves here becomes a link
          const dd = el('dd'), m = /^(.*?)#([^\s#]+)$/.exec(f.value);
          if (m && anchors.has(m[2]) && fieldLinks.has(`${j} ${f.name} ${m[2]}`)) { const a = el('a', `#${m[2]}`); a.href = `#${anchors.prefix}${m[2]}`; dd.append(m[1], a); }
          else dd.textContent = f.value;
          dl.append(el('dt', f.name), dd);
        }
        box.append(dl); frag.append(box);
      } else if (n.type === 'pagebreak') frag.append(el('hr', undefined, 'pagebreak'));
      else if (n.type === 'scene') { const m = /^(\d{2})(\d{2})\s*[-–]\s*(.+)$/.exec(n.text); frag.append(el('p', m ? `${m[1]}:${m[2]} · ${m[3]}` : n.text, 'jot-scene eyebrow')); }
      else if (n.type === 'annotation') { const a = el('aside', undefined, 'jot-margin'); a.setAttribute('aria-label', 'Margin note'); inline(inlineOf(n.text), a); frag.append(a); }
      else if (SIGN[n.type]) { const [sym, said] = SIGN[n.type], p = el('p', undefined, `jot-sign jot-${n.type}`), b = el('span', sym, 'jot-sym'); b.setAttribute('role', 'img'); b.setAttribute('aria-label', said); p.append(b, ' '); inline(inlineOf(n.text), p); frag.append(p); }
      else frag.append(el('p', n.text || n.raw));
    }
  }
  function footnotes(frag) {
    if (notes.defs.size) { // footnotes, numbered by first mention; ones never mentioned come last
      const sec = el('section', undefined, 'jot-footnotes'), ol = el('ol'); sec.setAttribute('aria-label', 'Notes');
      for (const id of notes.defs.keys()) if (!notes.order.includes(id)) notes.order.push(id);
      for (const id of notes.order) {
        if (!notes.defs.has(id)) continue;
        const li = el('li'); li.id = `${notes.prefix}${id}`; li.value = notes.order.indexOf(id) + 1; inline(notes.defs.get(id), li);
        ol.append(li);
      }
      sec.append(ol); frag.append(sec);
    }
  }
  draw(ast.nodes, root, { level: 0, stack: [String(opts.from || '')], from: String(opts.from || '') });
  footnotes(root);
  for (const c of target.querySelectorAll('canvas')) { const old = Chart.getChart(c); if (old) old.destroy(); } // the last drawing's charts
  target.replaceChildren(root);
  for (const [box, model] of drawn) drawChart(box, model); // once in the page: Chart.js measures the box and reads its colours
  if (!target.childNodes.length) target.append(el('p', opts.empty || 'A little room for whatever comes next.'));
  const revision = (target.jotRevision || 0) + 1; target.jotRevision = revision;
  target.jotGrid = null;
  target.jotReady = Promise.resolve();
  if (hand) {
    handwrite(target, hand);
    const fam = (HANDS[hand.hand] || HANDS.pen).family, fonts = doc.fonts;
    const loaded = fonts && fonts.load ? Promise.all([fonts.load(`400 16px '${fam}'`), fonts.load(`700 16px '${fam}'`)]).catch(() => {}) : Promise.resolve();
    target.jotReady = loaded.then(() => {
      if (!target.isConnected || target.jotRevision !== revision) return null;
      for (const c of target.querySelectorAll('.jot-chart canvas')) { const ch = Chart.getChart(c); if (ch) ch.update('none'); } // repaint: the hand's font is there now to label the axes
      target.jotGrid = alignToGrid(target, hand); return target.jotGrid;
    });
  } else paintHighlights(target);
  return target;
}
const FONT_BASE = new URL('./fonts/', import.meta.url).href;
/** Adds the handwriting fonts and look to a document once (the fonts live beside this module, in fonts/). */
export function addHandwritingStyles(doc, fontBase = FONT_BASE) {
  if (doc.getElementById('jot-hand-css')) return;
  const s = doc.createElement('style'); s.id = 'jot-hand-css'; s.textContent = handwritingCSS(fontBase); doc.head.append(s);
}

/** Adds the page styles (journal, notes, plain) to a document once. */
export function addPageStyles(doc) {
  if (doc.getElementById('jot-style-css')) return;
  const s = doc.createElement('style'); s.id = 'jot-style-css'; s.textContent = styleCSS(); doc.head.append(s);
}
/** Adds the chart styles to a document once. */
export const PREVIEW_CSS = `${CHART_CSS}
.jot-colors{print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-highlighter-active{background-image:none!important;background-color:transparent!important;padding:0}
.jot-highlight-space{background-image:var(--jot-highlight-stroke);background-size:100% 1lh;background-position:center;background-repeat:no-repeat;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.jot-highlight-word{display:inline-block;position:relative;isolation:isolate;white-space:pre;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-highlight-word::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background-image:var(--jot-highlight-stroke);background-size:100% 100%;background-repeat:no-repeat;mix-blend-mode:multiply;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-highlight{background-color:var(--jot-highlight);box-decoration-break:clone;-webkit-box-decoration-break:clone}
.jot-colors :is(del,ins){text-decoration-color:var(--jot-decoration,currentColor)}
mark{background:#fddd13;color:inherit;padding:0 .1em;border-radius:2px}ins{text-decoration:underline;text-decoration-thickness:.08em;text-underline-offset:.15em}
.jot-center{text-align:center}.jot-backlinks{font-size:.85em;opacity:.8;margin:.2em 0 .6em}.jot-backlinks-title{font-style:italic}.jot-link-unresolved{text-decoration:underline dotted;text-underline-offset:.15em}.jot-fn-ref a{text-decoration:none}.jot-footnotes{border-top:1px solid currentColor;border-top-color:color-mix(in srgb,currentColor 25%,transparent);margin-top:1.5em;font-size:.92em}.jot-footnotes ol{padding-left:1.5em}
.jot-callout{border-left:3px solid var(--jot-callout,#2a78d6);padding:.2em .9em;margin:.8em 0;background:color-mix(in srgb,var(--jot-callout,#2a78d6) 7%,transparent)}.jot-callout-title{font-weight:650;margin:0 0 .2em;color:var(--jot-callout,#2a78d6)}
.jot-callout-tip{--jot-callout:#1a7f37}.jot-callout-important{--jot-callout:#8250df}.jot-callout-warning{--jot-callout:#9a6700}.jot-callout-caution{--jot-callout:#cf222e}
.jot-date{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2em .6em}.jot-date-note{font-size:.72em;font-weight:400;opacity:.7;letter-spacing:.02em}
.jot-task{display:flex;gap:.45em;align-items:baseline;margin:.15em 0}.jot-box{flex:none;width:1.1em;text-align:center}.jot-task-completed .jot-task-text,.jot-task-cancelled .jot-task-text{opacity:.72}.jot-task-cancelled .jot-task-text{text-decoration:line-through}.jot-priority{font-weight:700;color:#cf222e}
.jot-sign{display:flex;gap:.45em;align-items:baseline}.jot-sym{flex:none;width:1.1em;text-align:center;font-weight:700;opacity:.7}
.jot-margin{font-size:.88em;font-style:italic;opacity:.8;border-left:2px solid color-mix(in srgb,currentColor 25%,transparent);padding-left:.7em;margin:.4em 0}
.jot-timezone{font-size:.6em;line-height:1.3;font-weight:400;letter-spacing:0;white-space:normal;font-variant:normal}.jot-tag,.jot-context{white-space:nowrap}.jot-tag{color:var(--jot-tag-ink,#8250df)}.jot-context{color:var(--jot-context-ink,#1a7f37)}
.jot-include{border:1px dashed color-mix(in srgb,currentColor 35%,transparent);border-radius:6px;padding:.1em .9em .4em;margin:.8em 0}.jot-include-source{font-size:.82em;opacity:.75;margin:.4em 0;overflow-wrap:anywhere}.jot-include-path{font-style:italic}
.jot-include-missing{display:flex;gap:.45em;align-items:baseline;font-size:.9em;font-style:italic;opacity:.85;padding:.3em .9em;overflow-wrap:anywhere}.jot-include-inline{opacity:.8;font-style:italic}
.jot-query-sum{margin:.25em 0 .4em}.jot-query-scroll{max-width:100%;overflow-x:auto}.jot-query table{border-collapse:collapse;font-variant-numeric:tabular-nums}.jot-query :is(th,td){padding:2px .9em 2px 0;text-align:left;vertical-align:top;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}.jot-query th{font-weight:600}.jot-query td:first-child{white-space:nowrap}
.jot-query-problem{border-left:3px solid #b35900;padding-left:.7em}.jot-query-problem p{margin:.2em 0;font-weight:650}.jot-query-problem ul{margin:.2em 0;padding-left:1.2em}
.jot-swatches,.jot-record .jot-swatches{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,8.5rem),1fr));gap:.5em;padding:0;margin:.5em 0}
.jot-swatch{display:flex;flex-direction:column;justify-content:flex-end;gap:.1em;min-height:4.2em;margin:0;padding:.45em .6em;border-radius:6px;border:1px solid color-mix(in srgb,currentColor 28%,transparent);box-shadow:inset 0 0 0 1px rgb(127 127 127/.25);overflow-wrap:anywhere;line-height:1.25;break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-record .jot-swatches>li{margin:0}.jot-swatch-name{font-weight:650}.jot-swatch-hex{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.85em;letter-spacing:.02em}
.jot-swatch-invalid{grid-column:1/-1;margin:0;padding:.45em .6em;border:1px dashed color-mix(in srgb,currentColor 45%,transparent);border-radius:6px;font-size:.9em}
.jot-mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr));gap:.6em;align-items:start;margin:.5em 0}
.jot-mood{margin:0;min-width:0;break-inside:avoid}.jot-mood img{display:block;width:100%;height:auto;border-radius:4px}
.jot-mood figcaption{font-size:.86em;margin-top:.25em}.jot-mood-caption,.jot-mood-credit{display:block}.jot-mood-credit{font-style:italic;font-size:.92em}
.jot-mood-missing{border:1px dashed color-mix(in srgb,currentColor 35%,transparent);border-radius:4px;padding:.6em;font-size:.88em;overflow-wrap:anywhere}
.jot-blanks{margin:6px 0}.jot-blank-line{display:flex;align-items:flex-end;gap:8px;min-height:1.8em}.jot-mark{min-width:1.4em;opacity:.75}.jot-rule{flex:1;border-bottom:1px dotted currentColor;opacity:.4;margin-bottom:.35em}`;
export function addChartStyles(doc) {
  if (doc.getElementById('jot-chart-css')) return;
  const s = doc.createElement('style'); s.id = 'jot-chart-css'; s.textContent = PREVIEW_CSS; doc.head.append(s);
}

export default { renderPreview, addChartStyles, addHandwritingStyles, addPageStyles, drawChart, dateWords, CHART_CSS, PREVIEW_CSS };
