/** Jot page preview, draft 0.1: a parsed journal drawn into a DOM element. Shared by the workspace, the template editor and the
 * VS Code extension, so a journal looks the same in each. DOM only: Markdown becomes elements built one by one (never innerHTML), raw
 * HTML is never rendered, links are only http(s), mailto and #, and images come only from the attachments the caller lends.
 * Charts (charts.mjs) are the one exception to "no markup strings": their SVG is generated here from numbers and escaped text.
 *
 *   renderPreview(ast, target, { asset(path) -> {url, mediaType} | null, sample: false, empty: 'A little room …' })
 */
import { charts, chartHTML, CHART_CSS, metricLabel } from './charts.mjs';
export { CHART_CSS };

const BLANKS = /^(?:(?:\d+\.|[-*+]|\[[ x]\])[ \t]*(?:\r?\n|$))+$/i;
const RASTER = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function renderPreview(ast, target, opts = {}) {
  const doc = target.ownerDocument, asset = opts.asset || (() => null);
  const el = (tag, text, cls) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  function inline(tokens, into) {
    for (const t of tokens || []) {
      let n;
      switch (t.type) {
        case 'text': if (t.tokens) { inline(t.tokens, into); continue; } n = el('span', decode(t.text)); break;
        case 'escape': n = el('span', t.text); break;
        case 'strong': n = el('strong'); inline(t.tokens, n); break;
        case 'em': n = el('em'); inline(t.tokens, n); break;
        case 'del': n = el('del'); inline(t.tokens, n); break;
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
        default: n = el('span', t.text || t.raw || '');
      }
      into.append(n);
    }
  }
  function block(t, into) {
    let n;
    switch (t.type) {
      case 'space': case 'checkbox': return;
      case 'heading': n = el('h' + Math.min(6, t.depth)); inline(t.tokens, n); break;
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
      default: n = el('p', t.text || t.raw || '');
    }
    into.append(n);
  }
  const chartOf = new Map(charts(ast, { sample: !!opts.sample }).map((c) => [c.node, c.model]));
  const frag = doc.createDocumentFragment();
  for (const n of ast.nodes) {
    if (n.type === 'comment' || n.type === 'directive' || n.type === 'blank') continue;
    if (n.markdown && n.markdown.type === 'paragraph' && BLANKS.test(n.markdown.raw.trim())) { // a template's empty lines: "1. ", "- ", "[ ] " to write after
      const box = el('div', undefined, 'jot-blanks');
      for (const line of n.markdown.raw.trim().split(/\r?\n/)) { const m = line.trim(), mark = /^\[x\]/i.test(m) ? '☑' : m.startsWith('[') ? '☐' : /^\d/.test(m) ? m : '•'; const row = el('div', undefined, 'jot-blank-line'); row.append(el('span', mark, 'jot-mark'), el('span', '', 'jot-rule')); box.append(row); }
      frag.append(box); continue;
    }
    if (n.type === 'record' && n.recordType === 'scale') continue; // a scale is a definition: its range shows on the charts and ratings that use it
    if (n.markdown) { if (n.diagram) frag.append(el('p', n.diagram.engine + ' source · rendering adapter not installed', 'diagram-note')); block(n.markdown, frag); continue; }
    if (n.type === 'task') frag.append(el('div', (n.status === 'completed' ? '☑ ' : '☐ ') + n.text, 'jot-task'));
    else if (n.type === 'record' && n.recordType === 'chart') {
      const box = el('section', undefined, 'jot-chart'); box.setAttribute('aria-label', 'Chart');
      box.insertAdjacentHTML('beforeend', chartHTML(chartOf.get(n))); // generated from numbers, every text escaped (charts.mjs)
      frag.append(box);
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
    else if (n.type === 'scene') frag.append(el('p', n.text, 'eyebrow'));
    else if (n.type === 'synopsis') frag.append(el('p', n.text));
    else frag.append(el('p', n.text || n.raw));
  }
  target.replaceChildren(frag);
  if (!target.childNodes.length) target.append(el('p', opts.empty || 'A little room for whatever comes next.'));
  return target;
}

/** Adds the chart styles to a document once. */
export const PREVIEW_CSS = `${CHART_CSS}
.jot-blanks{margin:6px 0}.jot-blank-line{display:flex;align-items:flex-end;gap:8px;min-height:1.8em}.jot-mark{min-width:1.4em;opacity:.75}.jot-rule{flex:1;border-bottom:1px dotted currentColor;opacity:.4;margin-bottom:.35em}`;
export function addChartStyles(doc) {
  if (doc.getElementById('jot-chart-css')) return;
  const s = doc.createElement('style'); s.id = 'jot-chart-css'; s.textContent = PREVIEW_CSS; doc.head.append(s);
}

export default { renderPreview, addChartStyles, CHART_CSS, PREVIEW_CSS };
