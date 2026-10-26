/** Jot charts, draft 0.1: the numbers a journal holds, drawn as small charts. Pure (no DOM), so the workspace, the template
 * editor, the VS Code preview and the tests all draw the very same SVG.
 *
 * Numbers come from records:
 *   :::record measurement     metric: sleep-hours · value: 7.5 · unit: h · scale: #scale-sleep (optional)
 *   any other record          each field whose value is a plain decimal (steps: 8200), named by its field; a `scale:` field
 *                             applies to all of them (the template editor's Ratings and Fill-in blanks)
 * Each number belongs to a date: the record's own `date` or `at` field when it starts with one, else the dated entry it is in.
 * Two numbers for one metric on one date are averaged (energy am / pm).
 *
 * A chart is a record too, so a plain-text reader still shows what it asks for:
 *   :::record chart #week-2026-10-05
 *   metrics: sleep-hours, work-hours      (optional: every metric that has numbers in the range)
 *   start: 2026-10-05                     (optional: the week of the entry it is in, else the dates that have numbers)
 *   end: 2026-10-11
 *   style: line                           (line | bars)
 *   :::
 * Each metric gets its own small chart (one value axis each: sleep hours and steps never share a scale).
 */

export const NUMBER = /^-?[0-9]+(\.[0-9]+)?$/;
const DATE = /^(\d{4}-\d{2}-\d{2})/;
const MAX_DAYS = 62;
const MAX_METRICS = 8;
// Fields that are about a record, not numbers to chart
const NOT_METRICS = new Set(['method', 'privacy', 'author', 'created', 'modified', 'date', 'at', 'start', 'end', 'body', 'source', 'relation', 'label', 'scale', 'metric', 'value', 'unit', 'status', 'minimum', 'maximum', 'name', 'kind', 'id']);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const metricKey = (s) => String(s || '').toLowerCase().replace(/^x-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
export const metricLabel = (k) => { const s = String(k).replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
const validDate = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const t = Date.parse(s + 'T00:00:00Z'); return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s; };
const dayMs = 864e5;
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * dayMs).toISOString().slice(0, 10);
const weekday = (date) => new Date(Date.parse(date + 'T00:00:00Z')).getUTCDay();
export const mondayOf = (date) => addDays(date, -((weekday(date) + 6) % 7));
const fieldOf = (n, k) => { const f = n.fields && n.fields.find((x) => x.name === k); return f ? String(f.value).trim() : ''; };

/** The date each node belongs to (its dated entry), by node index. */
function entryDates(ast) {
  const out = new Array(ast.nodes.length).fill(null);
  for (const e of ast.entries || []) for (let j = e.startNode; j < e.endNode && j < out.length; j++) out[j] = e.date;
  return out;
}

/** Every number in the journal: { metrics: Map<key, { key, unit, scale, byDate: Map<date, {sum, n}> }>, scales: Map<id, {min, max, lo, hi}> } */
export function collectNumbers(ast) {
  const scales = new Map(), metrics = new Map(), dates = entryDates(ast);
  for (const n of ast.nodes) if (n.type === 'record' && n.recordType === 'scale' && n.id) {
    const lo = fieldOf(n, 'minimum'), hi = fieldOf(n, 'maximum');
    scales.set(n.id, { min: NUMBER.test(lo) ? Number(lo) : null, max: NUMBER.test(hi) ? Number(hi) : null, lo: fieldOf(n, 'anchor-low'), hi: fieldOf(n, 'anchor-high') });
  }
  const add = (key, date, value, unit, scale) => {
    if (!key) return;
    let m = metrics.get(key);
    if (!m) { m = { key, unit: '', scale: null, byDate: new Map() }; metrics.set(key, m); }
    if (unit && !m.unit) m.unit = unit;
    if (scale && !m.scale && scales.has(scale)) m.scale = scale;
    if (date === null || value === null) return; // a metric with no number yet (a template): it is known, so a chart can still draw its axes
    const d = m.byDate.get(date) || { sum: 0, n: 0 };
    d.sum += value; d.n += 1; m.byDate.set(date, d);
  };
  ast.nodes.forEach((n, i) => {
    if (n.type !== 'record' || n.recordType === 'scale' || n.recordType === 'chart') return;
    const own = DATE.exec(fieldOf(n, 'date') || fieldOf(n, 'at'));
    const date = own && validDate(own[1]) ? own[1] : dates[i];
    const scale = fieldOf(n, 'scale').replace(/^#/, '');
    if (n.recordType === 'measurement') {
      const v = fieldOf(n, 'value');
      add(metricKey(fieldOf(n, 'metric')), date, NUMBER.test(v) ? Number(v) : null, fieldOf(n, 'unit'), scale);
      return;
    }
    for (const f of n.fields || []) {
      if (NOT_METRICS.has(f.name)) continue;
      const v = String(f.value).trim();
      if (NUMBER.test(v)) add(metricKey(f.name), date, Number(v), '', scale);
      else if (v === '' && scale) add(metricKey(f.name), null, null, '', scale); // a rating left blank in a template
    }
  });
  return { metrics, scales };
}

const niceStep = (span) => { const raw = span / 4, p = 10 ** Math.floor(Math.log10(raw || 1)), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
// A stable stand-in number for a sample preview (the template editor's "with sample numbers"): same journal, same picture
const sampleValue = (key, date, lo, hi) => { let h = 2166136261; for (const c of key + date) h = Math.imul(h ^ c.charCodeAt(0), 16777619); const r = ((h >>> 0) % 1000) / 1000; const v = lo + (hi - lo) * (0.35 + 0.5 * r); return (hi - lo) > 20 ? Math.round(v) : Math.round(v * 2) / 2; };

/** The chart a chart record asks for: { title, start, end, style, days: [{date, label, short}], series: [...], empty } or null when nothing can be drawn.
 *  opts.sample: fill the missing days with stand-in numbers (the template editor's preview). */
export function chartModel(ast, node, opts = {}, numbers = collectNumbers(ast)) {
  const idx = ast.nodes.indexOf(node), dates = entryDates(ast), inEntry = idx >= 0 ? dates[idx] : null;
  let start = fieldOf(node, 'start'), end = fieldOf(node, 'end');
  start = validDate(start) ? start : ''; end = validDate(end) ? end : '';
  const wanted = fieldOf(node, 'metrics').split(/[,·]/).map(metricKey).filter(Boolean);
  const keys = (wanted.length ? wanted : [...numbers.metrics.keys()]).filter((k, i, a) => a.indexOf(k) === i).slice(0, MAX_METRICS);
  if (!start && !end && inEntry) { start = mondayOf(inEntry); end = addDays(start, 6); }
  if (!start || !end) { // the dates that have numbers, for these metrics
    const all = keys.flatMap((k) => (numbers.metrics.has(k) ? [...numbers.metrics.get(k).byDate.keys()] : [])).sort();
    if (!all.length) { if (!start && !end) return null; start = start || end; end = end || start; }
    else { start = start || all[0]; end = end || all[all.length - 1]; }
  }
  if (end < start) [start, end] = [end, start];
  const days = [];
  for (let d = start; d <= end && days.length < MAX_DAYS; d = addDays(d, 1)) {
    const wd = weekday(d), [, m, dd] = d.split('-').map(Number);
    days.push({ date: d, short: days.length > 14 ? String(dd) : WD[wd], label: `${WD[wd]} ${dd} ${MON[m - 1]}` });
  }
  const series = keys.map((key) => {
    const m = numbers.metrics.get(key) || { key, unit: '', scale: null, byDate: new Map() };
    let sc = m.scale ? numbers.scales.get(m.scale) : null;
    let points = days.map((d) => { const v = m.byDate.get(d.date); return v ? Math.round((v.sum / v.n) * 100) / 100 : null; });
    const real = points.filter((v) => v !== null);
    if (sc && real.some((v) => (sc.min !== null && v < sc.min) || (sc.max !== null && v > sc.max))) sc = null; // numbers outside the scale are not on it (steps beside a 1–5 rating)
    let min = sc && sc.min !== null ? sc.min : null, max = sc && sc.max !== null ? sc.max : null;
    if (opts.sample && !real.length) points = days.map((d) => sampleValue(key, d.date, min !== null ? min : 0, max !== null ? max : /step/.test(key) ? 12000 : /hour|sleep/.test(key) ? 10 : 10));
    const have = points.filter((v) => v !== null);
    const lo = have.length ? Math.min(...have) : 0, hi = have.length ? Math.max(...have) : 0;
    if (min === null) min = Math.min(0, lo);
    if (max === null && !have.length) max = min + 10; // nothing written and no scale: an honest empty 0–10 grid
    if (max === null || max < hi) { const step = niceStep((hi - min) || 1); max = Math.max(min + step, Math.ceil(hi / step) * step); }
    if (have.length && min > lo) min = lo;
    const n = have.length, avg = n ? have.reduce((a, b) => a + b, 0) / n : null;
    return { metric: key, label: metricLabel(key), unit: m.unit, min, max, anchors: sc ? { lo: sc.lo, hi: sc.hi } : null, points, sample: !real.length && !!opts.sample,
      stats: { n, of: days.length, avg: avg === null ? null : Math.abs(avg) >= 100 ? Math.round(avg) : Math.round(avg * 10) / 10, low: n ? lo : null, high: n ? hi : null } };
  });
  const style = fieldOf(node, 'style') === 'bars' ? 'bars' : 'line';
  return { id: node.id || '', start, end, style, days, series, empty: !series.length };
}

/** Every chart in the journal, in order: [{ node, model }] */
export function charts(ast, opts = {}) {
  const numbers = collectNumbers(ast);
  return ast.nodes.filter((n) => n.type === 'record' && n.recordType === 'chart').map((node) => ({ node, model: chartModel(ast, node, opts, numbers) }));
}

// ---- drawing ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v) => (v === null || v === undefined ? '' : Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));
const r1 = (v) => Math.round(v * 10) / 10;
let uid = 0;

/** One metric as an SVG line or bar chart (a string; every text escaped, every number computed). */
export function seriesSVG(model, s, { width = 320, height = 132 } = {}) {
  const id = `jc${(uid++).toString(36)}`, L = 36, R = 8, T = 10, B = 22, w = width - L - R, h = height - T - B, n = model.days.length || 1;
  const band = w / n, x = (i) => L + band * (i + 0.5), y = (v) => T + h - ((v - s.min) / ((s.max - s.min) || 1)) * h;
  const unit = s.unit ? ` ${s.unit}` : '';
  const step = niceStep(s.max - s.min), ticks = [];
  for (let v = Math.ceil(s.min / step) * step; v <= s.max + 1e-9 && ticks.length < 8; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const out = [];
  const summary = s.stats.n ? `${s.stats.n} of ${s.stats.of} days, average ${fmt(s.stats.avg)}${unit}, from ${fmt(s.stats.low)} to ${fmt(s.stats.high)}${unit}` : 'no numbers yet';
  out.push(`<svg class="jot-chart-svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-labelledby="${id}-t" preserveAspectRatio="xMidYMid meet">`);
  out.push(`<title id="${id}-t">${esc(s.label)}${s.sample ? ' (sample numbers)' : ''}, ${esc(model.days[0] ? model.days[0].label : '')} to ${esc(model.days.length ? model.days[model.days.length - 1].label : '')}: ${esc(summary)}</title>`);
  for (const v of ticks) out.push(`<line class="jc-grid" x1="${L}" x2="${L + w}" y1="${r1(y(v))}" y2="${r1(y(v))}"/><text class="jc-tick" x="${L - 5}" y="${r1(y(v) + 3.5)}" text-anchor="end">${esc(fmt(v))}</text>`);
  const base = y(Math.max(s.min, Math.min(s.max, 0)));
  out.push(`<line class="jc-axis" x1="${L}" x2="${L + w}" y1="${r1(base)}" y2="${r1(base)}"/>`);
  const every = n > 14 ? Math.ceil(n / 8) : 1;
  model.days.forEach((d, i) => { if (i % every === 0) out.push(`<text class="jc-day" x="${r1(x(i))}" y="${height - 6}" text-anchor="middle">${esc(d.short)}</text>`); });
  const pts = s.points.map((v, i) => (v === null ? null : [x(i), y(Math.max(s.min, Math.min(s.max, v)))]));
  if (model.style === 'bars') {
    const bw = Math.max(2, Math.min(28, band * 0.6)), rad = Math.min(4, bw / 2);
    pts.forEach((p, i) => {
      if (!p) return;
      const top = Math.min(p[1], base), bot = Math.max(p[1], base), hgt = bot - top, x0 = p[0] - bw / 2, rr = Math.min(rad, hgt);
      const up = p[1] <= base; // the rounded end is the data end, away from the baseline
      const d = up ? `M${r1(x0)},${r1(bot)}V${r1(top + rr)}Q${r1(x0)},${r1(top)} ${r1(x0 + rr)},${r1(top)}H${r1(x0 + bw - rr)}Q${r1(x0 + bw)},${r1(top)} ${r1(x0 + bw)},${r1(top + rr)}V${r1(bot)}Z`
        : `M${r1(x0)},${r1(top)}V${r1(bot - rr)}Q${r1(x0)},${r1(bot)} ${r1(x0 + rr)},${r1(bot)}H${r1(x0 + bw - rr)}Q${r1(x0 + bw)},${r1(bot)} ${r1(x0 + bw)},${r1(bot - rr)}V${r1(top)}Z`;
      out.push(`<path class="jc-bar" d="${d}"/>`);
    });
  } else {
    let d = '';
    pts.forEach((p, i) => { if (p) d += `${pts[i - 1] ? 'L' : 'M'}${r1(p[0])},${r1(p[1])}`; });
    if (d) out.push(`<path class="jc-line" d="${d}"/>`);
    for (const p of pts) if (p) out.push(`<circle class="jc-dot" cx="${r1(p[0])}" cy="${r1(p[1])}" r="4"/>`);
    if (s.stats.n > 1) out.push(`<line class="jc-avg" x1="${L}" x2="${L + w}" y1="${r1(y(s.stats.avg))}" y2="${r1(y(s.stats.avg))}"/>`);
  }
  if (!s.stats.n) out.push(`<text class="jc-empty" x="${L + w / 2}" y="${T + h / 2}" text-anchor="middle">No numbers yet</text>`);
  // the hover layer: a column per day, bigger than its mark, that names the day and its number
  model.days.forEach((d, i) => out.push(`<rect class="jc-hit" x="${r1(L + band * i)}" y="${T}" width="${r1(band)}" height="${h}"><title>${esc(d.label)}: ${s.points[i] === null ? 'nothing written' : esc(fmt(s.points[i]) + unit)}</title></rect>`));
  out.push('</svg>');
  return out.join('');
}

/** The whole chart record as HTML: a figure per metric (title, the chart, a one-line summary) and the numbers as a table. */
export function chartHTML(model) {
  if (!model) return '<p class="jot-chart-note">A chart with nothing to draw yet: give it metrics, or a start and end date.</p>';
  if (model.empty) return `<p class="jot-chart-note">No numbers to chart between ${esc(model.start)} and ${esc(model.end)} yet.</p>`;
  const parts = model.series.map((s) => {
    const unit = s.unit ? ` ${esc(s.unit)}` : '';
    const sum = s.stats.n ? `avg <b>${esc(fmt(s.stats.avg))}${unit}</b> · ${esc(fmt(s.stats.low))}–${esc(fmt(s.stats.high))}${unit} · ${s.stats.n}/${s.stats.of} days` : `${s.stats.of} days, nothing written yet`;
    const anchors = s.anchors && (s.anchors.lo || s.anchors.hi) ? ` <span class="jc-anchors">${esc(fmt(s.min))} = ${esc(s.anchors.lo || 'low')}, ${esc(fmt(s.max))} = ${esc(s.anchors.hi || 'high')}</span>` : '';
    return `<figure class="jot-chart-one"><figcaption><span class="jc-name">${esc(s.label)}${s.unit ? ` <span class="jc-unit">(${esc(s.unit)})</span>` : ''}</span><span class="jc-sum">${s.sample ? 'sample numbers · ' : ''}${sum}</span></figcaption>${seriesSVG(model, s)}${anchors}</figure>`;
  });
  const head = model.days.map((d) => `<th scope="col">${esc(d.short)}</th>`).join('');
  const rows = model.series.map((s) => `<tr><th scope="row">${esc(s.label)}${s.unit ? ` (${esc(s.unit)})` : ''}</th>${s.points.map((v) => `<td>${v === null ? '–' : esc(fmt(v))}</td>`).join('')}</tr>`).join('');
  return `<div class="jot-chart-grid">${parts.join('')}</div><details class="jot-chart-table"><summary>The numbers</summary><div class="jc-scroll" tabindex="0" role="region" aria-label="The numbers"><table><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

/** The styles the charts need, light and dark. Readers add it once (a <style> element). */
export const CHART_CSS = `.jot-chart{--jc-ink:#242927;--jc-muted:#5f675f;--jc-grid:#e2e3dc;--jc-axis:#9aa096;--jc-series:#2a78d6;--jc-surface:#fffefa;margin:14px 0;padding:12px;border:1px solid var(--jc-grid);border-radius:10px;background:var(--jc-surface);color:var(--jc-ink);font:12px/1.4 ui-sans-serif,system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])) .jot-chart{--jc-ink:#e8eae4;--jc-muted:#a8afa6;--jc-grid:#343a35;--jc-axis:#6d756e;--jc-series:#3987e5;--jc-surface:#1f2320}}
:root[data-theme="dark"] .jot-chart{--jc-ink:#e8eae4;--jc-muted:#a8afa6;--jc-grid:#343a35;--jc-axis:#6d756e;--jc-series:#3987e5;--jc-surface:#1f2320}
.jot-chart-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px 16px}
.jot-chart-one{margin:0;min-width:0}.jot-chart-one figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px;margin-bottom:2px}
.jc-name{font-weight:650}.jc-unit,.jc-sum,.jc-anchors{color:var(--jc-muted)}.jc-sum b{color:var(--jc-ink);font-weight:650}.jc-anchors{display:block;font-size:11px}
.jot-chart-svg{display:block;overflow:visible}.jc-grid{stroke:var(--jc-grid);stroke-width:1}.jc-axis{stroke:var(--jc-axis);stroke-width:1}
.jc-tick,.jc-day,.jc-empty{fill:var(--jc-muted);font-size:10px;font-family:inherit}.jc-empty{font-style:italic}
.jc-line{fill:none;stroke:var(--jc-series);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.jc-dot{fill:var(--jc-series);stroke:var(--jc-surface);stroke-width:2}
.jc-bar{fill:var(--jc-series)}.jc-avg{stroke:var(--jc-muted);stroke-width:1;stroke-dasharray:3 3}
.jc-hit{fill:transparent}.jc-hit:hover{fill:var(--jc-series);fill-opacity:.08}
.jot-chart-table{margin-top:6px}.jot-chart-table summary{cursor:pointer;color:var(--jc-muted)}.jc-scroll{overflow-x:auto}
.jot-chart-table table{border-collapse:collapse;font-variant-numeric:tabular-nums;margin-top:4px}.jot-chart-table th,.jot-chart-table td{padding:2px 6px;text-align:right;border-bottom:1px solid var(--jc-grid)}.jot-chart-table th[scope=row]{text-align:left;font-weight:600}
.jot-chart-note{color:var(--jc-muted);font-style:italic}
@media (forced-colors:active){.jc-line{stroke:CanvasText}.jc-dot,.jc-bar{fill:CanvasText}}`;

export default { NUMBER, collectNumbers, chartModel, charts, seriesSVG, chartHTML, CHART_CSS, metricKey, metricLabel, mondayOf };
