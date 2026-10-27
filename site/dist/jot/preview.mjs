/** Jot page preview, draft 0.1: a parsed journal drawn into a DOM element. Shared by the workspace, the template editor and the
 * VS Code extension, so a journal looks the same in each. DOM only: Markdown becomes elements built one by one (never innerHTML), raw
 * HTML is never rendered, links are only http(s), mailto and #, and images come only from the attachments the caller lends.
 * A `:::record chart` becomes one Chart.js chart per metric (charts.mjs chartConfig, vendor/chart.mjs), each with a text summary as its
 * accessible name and the numbers as a table.
 *
 * Fuller formatting (spec 4.2.1): ==highlight==, ++underline++, ^superscript^, footnotes ([^1] and [^1]: …, gathered at the end),
 * callouts (> [!NOTE]) and centred lines (-> … <-).
 *
 *   renderPreview(ast, target, { asset(path) -> {url, mediaType} | null, sample: false, empty: 'A little room …',
 *                                style: 'journal' | 'notes' | 'plain' | null (styles.mjs; a typed page only),
 *                                hand: null | { hand: 'pen', ink: 'blue', pitchMm: 5, dots: true, seed: 1, pageRows: 0 } })
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
import { HANDS, handwrite, alignToGrid, handwritingCSS, pitchPx, blockLayoutFromComment, paintHighlights } from './handwriting.mjs';
import { parse } from './jot.mjs';
import { styleCSS, isStyle } from './styles.mjs';
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
    new Chart(canvas, chartConfig(model, s, theme)); // eslint-disable-line no-new
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
const TAGGED = /(^|[\s(\[])([#@][\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
/** "2026-10-26" as words; the rest of the heading after "|" is kept when it says more than the weekday. */
export function dateWords(date, rest = '', locale = 'en-GB') {
  const t = new Date(`${date}T00:00:00Z`), words = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(t);
  const note = String(rest || '').trim();
  return { words, note: note && note.toLowerCase() !== WEEKDAYS[t.getUTCDay()] ? note : '' };
}
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
          const href = t.href || '', a = asset(href);
          if (a && a.url) { n = el('a'); n.href = a.url; n.download = href.split('/').pop(); inline(t.tokens, n); break; }
          if (/^(https?:|mailto:|#)/i.test(href)) { n = el('a'); n.href = href; n.rel = 'noopener noreferrer'; if (!href.startsWith('#')) n.target = '_blank'; inline(t.tokens, n); } else { n = el('span'); inline(t.tokens, n); }
          break;
        }
        case 'image': {
          const a = asset(t.href);
          if (a && a.url && RASTER.has(a.mediaType)) { n = el('img'); n.src = a.url; n.alt = t.text || 'Handwriting or image'; n.loading = 'lazy'; }
          else n = el('span', `[Image: ${t.text || 'attachment'} · ${t.href}${a ? '' : ' · not attached'}]`);
          break;
        }
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
      case 'paragraph': case 'text': n = el('p'); inline(t.tokens || [{ type: 'text', text: t.text }], n); break;
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
  const chartOf = new Map(charts(ast, { sample: !!opts.sample }).map((c) => [c.node, c.model])), drawn = [];
  const notes = { order: [], defs: new Map(), prefix: `jotfn-${(target.id || 'page').replace(/[^\w-]/g, '')}-` };
  const hand = opts.hand ? { hand: 'pen', ink: 'blue', pitchMm: 5, dots: true, seed: 1, pageRows: 0, ...opts.hand } : null;
  target.classList.toggle('jot-hand', !!hand); // before anything is drawn, so charts size themselves to the grid
  for (const c of [...target.classList]) if (c.startsWith('jot-style-')) target.classList.remove(c);
  if (!hand && opts.style && isStyle(opts.style)) { addPageStyles(doc); target.classList.add(`jot-style-${opts.style}`); }
  if (hand) { addHandwritingStyles(doc); target.style.setProperty('--hw-pitch', `${pitchPx(hand.pitchMm)}px`); target.style.setProperty('--hw-family', `'${(HANDS[hand.hand] || HANDS.pen).family}'`); }
  else for (const k of ['--hw-pitch', '--hw-family', '--hw-size', '--hw-ink', '--hw-dots', '--hw-dx', '--hw-dy', '--hw-text-shift']) target.style.removeProperty(k);
  const root = doc.createDocumentFragment();
  let frag = root;
  for (const n of ast.nodes) {
    if (n.type === 'comment') {
      const layout = blockLayoutFromComment(n.raw);
      if (layout) {
        frag = el('section', undefined, 'jot-layout-block');
        frag.dataset.blockId = layout.id; frag.dataset.minRows = layout.rows;
        frag.dataset.gap = layout.gap; frag.dataset.newPage = layout.newPage;
        root.append(frag);
      } else if (/^\/\*\r?\njot-block-end\r?\n\*\//.test(n.raw)) frag = root;
      continue;
    }
    if (n.type === 'comment' || n.type === 'directive' || n.type === 'blank') continue;
    if (n.markdown && n.markdown.type === 'paragraph' && BLANKS.test(n.markdown.raw.trim())) { // a template's empty lines: "1. ", "- ", "[ ] " to write after
      const box = el('div', undefined, 'jot-blanks');
      for (const line of n.markdown.raw.trim().split(/\r?\n/)) { const m = line.trim(), mark = /^\[x\]/i.test(m) ? '☑' : m.startsWith('[') ? '☐' : /^\d/.test(m) ? m : '•'; const row = el('div', undefined, 'jot-blank-line'); row.append(el('span', mark, 'jot-mark'), el('span', '', 'jot-rule')); box.append(row); }
      frag.append(box); continue;
    }
    if (n.type === 'record' && (n.recordType === 'scale' || n.recordType === 'sync')) continue; // a scale is a definition (its range shows on the charts that use it); a sync record is bookkeeping for a connection
    if (n.markdown && n.markdown.type === 'blockquote' && n.callout) {
      const box = el('aside', undefined, `jot-callout jot-callout-${n.callout}`); box.setAttribute('role', 'note');
      box.append(el('p', CALLOUTS[n.callout], 'jot-callout-title')); for (const c of n.markdown.tokens || []) block(c, box);
      frag.append(box); continue;
    }
    if (n.markdown) { if (n.diagram) frag.append(el('p', n.diagram.engine + ' source · rendering adapter not installed', 'diagram-note')); block(n.markdown, frag); continue; }
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
    } else if (n.type === 'record' && n.recordType === 'measurement' && n.fields.some((f) => f.name === 'metric')) {
      const get = (k) => (n.fields.find((f) => f.name === k) || {}).value || '';
      const box = el('section', undefined, 'jot-record jot-measure');
      box.append(el('strong', metricLabel(get('metric').replace(/[^a-z0-9]+/gi, '-').toLowerCase()) + ':'), doc.createTextNode(' '));
      box.append(get('value') ? el('span', `${get('value')}${get('unit') ? ' ' + get('unit') : ''}`, 'jot-value') : el('span', '____', 'jot-blank'));
      frag.append(box);
    } else if (n.type === 'record') {
      const box = el('section', undefined, 'jot-record'); box.append(el('strong', n.recordType));
      const dl = el('dl'); for (const f of n.fields) dl.append(el('dt', f.name), el('dd', f.value)); box.append(dl); frag.append(box);
    } else if (n.type === 'pagebreak') frag.append(el('hr', undefined, 'pagebreak'));
    else if (n.type === 'scene') { const m = /^(\d{2})(\d{2})\s*[-–]\s*(.+)$/.exec(n.text); frag.append(el('p', m ? `${m[1]}:${m[2]} · ${m[3]}` : n.text, 'jot-scene eyebrow')); }
    else if (n.type === 'annotation') { const a = el('aside', undefined, 'jot-margin'); a.setAttribute('aria-label', 'Margin note'); inline(inlineOf(n.text), a); frag.append(a); }
    else if (SIGN[n.type]) { const [sym, said] = SIGN[n.type], p = el('p', undefined, `jot-sign jot-${n.type}`), b = el('span', sym, 'jot-sym'); b.setAttribute('role', 'img'); b.setAttribute('aria-label', said); p.append(b, ' '); inline(inlineOf(n.text), p); frag.append(p); }
    else frag.append(el('p', n.text || n.raw));
  }
  frag = root;
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
.jot-center{text-align:center}.jot-fn-ref a{text-decoration:none}.jot-footnotes{border-top:1px solid currentColor;border-top-color:color-mix(in srgb,currentColor 25%,transparent);margin-top:1.5em;font-size:.92em}.jot-footnotes ol{padding-left:1.5em}
.jot-callout{border-left:3px solid var(--jot-callout,#2a78d6);padding:.2em .9em;margin:.8em 0;background:color-mix(in srgb,var(--jot-callout,#2a78d6) 7%,transparent)}.jot-callout-title{font-weight:650;margin:0 0 .2em;color:var(--jot-callout,#2a78d6)}
.jot-callout-tip{--jot-callout:#1a7f37}.jot-callout-important{--jot-callout:#8250df}.jot-callout-warning{--jot-callout:#9a6700}.jot-callout-caution{--jot-callout:#cf222e}
.jot-date{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2em .6em}.jot-date-note{font-size:.72em;font-weight:400;opacity:.7;letter-spacing:.02em}
.jot-task{display:flex;gap:.45em;align-items:baseline;margin:.15em 0}.jot-box{flex:none;width:1.1em;text-align:center}.jot-task-completed .jot-task-text,.jot-task-cancelled .jot-task-text{opacity:.72}.jot-task-cancelled .jot-task-text{text-decoration:line-through}.jot-priority{font-weight:700;color:#cf222e}
.jot-sign{display:flex;gap:.45em;align-items:baseline}.jot-sym{flex:none;width:1.1em;text-align:center;font-weight:700;opacity:.7}
.jot-margin{font-size:.88em;font-style:italic;opacity:.8;border-left:2px solid color-mix(in srgb,currentColor 25%,transparent);padding-left:.7em;margin:.4em 0}
.jot-tag,.jot-context{white-space:nowrap}.jot-tag{color:var(--jot-tag-ink,#8250df)}.jot-context{color:var(--jot-context-ink,#1a7f37)}
.jot-blanks{margin:6px 0}.jot-blank-line{display:flex;align-items:flex-end;gap:8px;min-height:1.8em}.jot-mark{min-width:1.4em;opacity:.75}.jot-rule{flex:1;border-bottom:1px dotted currentColor;opacity:.4;margin-bottom:.35em}`;
export function addChartStyles(doc) {
  if (doc.getElementById('jot-chart-css')) return;
  const s = doc.createElement('style'); s.id = 'jot-chart-css'; s.textContent = PREVIEW_CSS; doc.head.append(s);
}

export default { renderPreview, addChartStyles, addHandwritingStyles, addPageStyles, drawChart, dateWords, CHART_CSS, PREVIEW_CSS };
