/** Jot charts, draft 0.1: the numbers a journal holds, drawn as small charts. Pure (no DOM), so the workspace, the template
 * editor, the VS Code preview and the tests all read the numbers the same way.
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
 * Each metric gets its own small chart (one value axis each: sleep hours and steps never share a scale), drawn by Chart.js
 * (vendor/chart.mjs) from chartConfig(); this module stays pure, so the numbers and the configuration are tested in Node.
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
    if (n.type !== 'record' || n.recordType === 'scale' || n.recordType === 'chart' || n.recordType === 'query') return; // views hold no numbers (a query's limit: 20 is not a metric)
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

// ---- drawing (Chart.js) ----
// chartConfig is pure: the Chart.js configuration for one metric. preview.mjs makes the canvas and hands it to Chart.js (vendor/chart.mjs).
export const fmt = (v) => (v === null || v === undefined ? '' : Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));
/** The words a chart is read by (its accessible name, and the line above it): "Sleep (h), Mon 26 Oct to Sun 1 Nov: 6 of 7 days, average 7.2 h, from 6 to 8.5 h" */
export function summaryText(model, s) {
  const unit = s.unit ? ` ${s.unit}` : '';
  const what = s.stats.n ? `${s.stats.n} of ${s.stats.of} days, average ${fmt(s.stats.avg)}${unit}, from ${fmt(s.stats.low)} to ${fmt(s.stats.high)}${unit}` : 'no numbers yet';
  const span = model.days.length ? `${model.days[0].label} to ${model.days[model.days.length - 1].label}` : '';
  return `${s.label}${s.unit ? ` (${s.unit})` : ''}${s.sample ? ' (sample numbers)' : ''}, ${span}: ${what}`;
}
/** Chart.js configuration for one metric: its own value axis, gaps for empty days, the average as a dashed line.
 *  theme: { series, muted, grid, ink } colours (preview.mjs reads them from the page's CSS). */
export function chartConfig(model, s, theme = {}) {
  const t = { series: '#2a78d6', muted: '#5f675f', grid: '#e2e3dc', ink: '#242927', ...theme }, unit = s.unit ? ` ${s.unit}` : '', bars = model.style === 'bars';
  const datasets = [{
    label: s.label, data: s.points, spanGaps: false,
    borderColor: t.series, backgroundColor: t.series, borderWidth: 2,
    pointRadius: 4, pointHoverRadius: 6, pointBorderColor: t.surface || '#fff', pointBorderWidth: 2, tension: 0,
    borderRadius: 4, borderSkipped: 'start', maxBarThickness: 28, categoryPercentage: 0.7,
  }];
  if (s.stats.n > 1) datasets.push({ type: 'line', label: 'Average', data: model.days.map(() => s.stats.avg), borderColor: t.muted, borderWidth: 1, borderDash: [3, 3], pointRadius: 0, pointHoverRadius: 0, pointHitRadius: 0, fill: false });
  return {
    type: bars ? 'bar' : 'line',
    data: { labels: model.days.map((d) => d.short), datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { top: 6, right: 4 } }, // room for a point at the top of the range
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (item) => item.datasetIndex === 0,
          callbacks: {
            title: (items) => (items[0] ? model.days[items[0].dataIndex].label : ''),
            label: (item) => (item.raw === null || item.raw === undefined ? 'nothing written' : `${s.label}: ${fmt(item.raw)}${unit}`),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { color: t.muted }, ticks: { color: t.muted, autoSkip: true, maxRotation: 0, ...(t.font ? { font: { family: t.font, size: 15 } } : {}) } },
        y: { min: s.min, max: s.max, grid: { color: t.grid }, border: { display: false }, ticks: { color: t.muted, maxTicksLimit: 6, callback: (v) => fmt(v), ...(t.font ? { font: { family: t.font, size: 15 } } : {}) } },
      },
    },
  };
}

/** The styles the charts need, light and dark. Readers add it once (a <style> element). */
export const CHART_CSS = `.jot-chart{--jc-ink:#242927;--jc-muted:#5f675f;--jc-grid:#e2e3dc;--jc-series:#2a78d6;--jc-surface:#fffefa;margin:14px 0;padding:12px;border:1px solid var(--jc-grid);border-radius:10px;background:var(--jc-surface);color:var(--jc-ink);font:12px/1.4 ui-sans-serif,system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])) .jot-chart{--jc-ink:#e8eae4;--jc-muted:#a8afa6;--jc-grid:#343a35;--jc-series:#3987e5;--jc-surface:#1f2320}}
:root[data-theme="dark"] .jot-chart{--jc-ink:#e8eae4;--jc-muted:#a8afa6;--jc-grid:#343a35;--jc-series:#3987e5;--jc-surface:#1f2320}
.jot-chart-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px 16px}
.jot-chart-one{margin:0;min-width:0}.jot-chart-one figcaption{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px;margin-bottom:2px}
.jc-name{font-weight:650}.jc-unit,.jc-sum,.jc-anchors{color:var(--jc-muted)}.jc-sum b{color:var(--jc-ink);font-weight:650}.jc-anchors{display:block;font-size:11px}
.jc-canvas{position:relative;height:140px}.jc-canvas canvas{display:block}
.jot-chart-table{margin-top:6px}.jot-chart-table summary{cursor:pointer;color:var(--jc-muted);min-height:24px}.jc-scroll{overflow-x:auto}
.jot-chart-table table{border-collapse:collapse;font-variant-numeric:tabular-nums;margin-top:4px}.jot-chart-table th,.jot-chart-table td{padding:2px 6px;text-align:right;border-bottom:1px solid var(--jc-grid)}.jot-chart-table th[scope=row]{text-align:left;font-weight:600}
.jot-chart-note{color:var(--jc-muted);font-style:italic}`;

export default { NUMBER, collectNumbers, chartModel, charts, chartConfig, summaryText, fmt, CHART_CSS, metricKey, metricLabel, mondayOf };
