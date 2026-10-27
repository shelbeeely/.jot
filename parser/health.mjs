/** Jot health import, draft 0.1: daily numbers from a health app's own export, ready for addNumbers (automation.mjs). Pure: text in,
 * numbers out; no DOM, no network, no accounts. The workspace, the `jot` command line and the tests all use these same functions.
 *
 *   appleHealthScanner()                 push(chunk) the text of Apple Health's export.xml as it is read, then end(): a summary
 *   readAppleHealth(text)                the same for text already in memory
 *   readHealthCSV(text, opts)            a CSV from Health Connect, Google Fit, Fitbit, Garmin, Oura or another app: a summary
 *   summary.numbers({ metrics, since, until })   [{ date, metric, value, unit, aggregation }] for addNumbers
 *
 * Only the kinds of numbers listed in APPLE and CSV_COLUMNS are read; everything else is left in the file it came from. Medications,
 * lab results, clinical records, reproductive and sexual health, and location are never read (see LEFT_OUT), and nothing here
 * interprets a number as a health state. Units are written as the app wrote them; the one change is HealthKit's percent, which
 * export.xml writes as a fraction (0.97 with unit %) and Jot writes as the percent it means (97 %).
 */
import { parseCSV, csvDate, readCSV } from './automation.mjs';
import { metricKey } from './charts.mjs';

/** export.xml is read as a stream, so its size is limited only to keep a browser tab responsive; a CSV is read whole. */
export const LIMITS = { xmlBytes: 2 * 1024 ** 3, csvBytes: 50 * 1024 ** 2 }; // callers check the file's size; the scanner counts characters as a backstop
/** What is never imported, and why: kept in the export, out of a journal that may be shared or synced. */
export const LEFT_OUT = 'medications, lab results and clinical records, reproductive and sexual health, and location';

const ASLEEP = /^HKCategoryValueSleepAnalysisAsleep/; // Asleep (older exports), AsleepCore, AsleepDeep, AsleepREM, AsleepUnspecified; not InBed or Awake
/** Apple Health record types read, and how a day's records become one number. sum: per source, the largest daily total is used, so a
 *  phone and a watch counting the same steps are not added together. mean: every reading that day. last: the latest reading. */
export const APPLE = {
  HKQuantityTypeIdentifierStepCount: { metric: 'steps', label: 'Steps', combine: 'sum' },
  HKQuantityTypeIdentifierDistanceWalkingRunning: { metric: 'distance', label: 'Walking and running distance', combine: 'sum' },
  HKQuantityTypeIdentifierActiveEnergyBurned: { metric: 'active-energy', label: 'Active energy', combine: 'sum' },
  HKQuantityTypeIdentifierFlightsClimbed: { metric: 'flights', label: 'Flights climbed', combine: 'sum' },
  HKQuantityTypeIdentifierAppleExerciseTime: { metric: 'exercise', label: 'Exercise minutes', combine: 'sum' },
  HKQuantityTypeIdentifierHeartRate: { metric: 'heart-rate', label: 'Heart rate', combine: 'mean', range: true },
  HKQuantityTypeIdentifierRestingHeartRate: { metric: 'resting-heart-rate', label: 'Resting heart rate', combine: 'mean' },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { metric: 'hrv', label: 'Heart rate variability (SDNN)', combine: 'mean', range: true },
  HKQuantityTypeIdentifierOxygenSaturation: { metric: 'spo2', label: 'Blood oxygen', combine: 'mean', range: true },
  HKQuantityTypeIdentifierRespiratoryRate: { metric: 'respiratory-rate', label: 'Respiratory rate', combine: 'mean', range: true, units: { 'count/min': 'breaths/min' } },
  HKQuantityTypeIdentifierBodyMass: { metric: 'body-mass', label: 'Body mass', combine: 'last' },
  HKQuantityTypeIdentifierBodyFatPercentage: { metric: 'body-fat', label: 'Body fat', combine: 'last' },
  HKCategoryTypeIdentifierSleepAnalysis: { metric: 'sleep', label: 'Sleep (hours asleep)', combine: 'sleep' },
  HKCategoryTypeIdentifierMindfulSession: { metric: 'mindful', label: 'Mindful minutes', combine: 'time' },
};
const UNIT = { count: '', 'count/min': 'bpm' }; // HealthKit's names for a plain count and for beats (or breaths) per minute
const SLEEP_GAP = 4 * 3600e3; // asleep spans less than four hours apart are one night

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const round = (x) => Math.round(x * 100) / 100;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()]));
/** "2026-10-25 23:10:00 -0700" -> milliseconds; the date part is taken as written (the device's local day), never shifted. */
const instant = (s) => { const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(String(s).trim()); if (!m) return NaN; const z = !m[3] || m[3] === 'Z' ? 'Z' : `${m[3].slice(0, 3)}:${m[3].slice(-2)}`; return Date.parse(`${m[1]}T${m[2].length === 5 ? `${m[2]}:00` : m[2]}${z}`); };
const dayOf = (s) => { const d = String(s || '').slice(0, 10); return DATE.test(d) ? d : null; };
/** Merges [start, end] spans; returns the merged spans in order. */
const union = (spans) => { const out = []; for (const [s, e] of [...spans].sort((a, b) => a[0] - b[0])) { const l = out[out.length - 1]; if (l && s <= l[1]) l[1] = Math.max(l[1], e); else out.push([s, e]); } return out; };

/** Daily values, collected per metric and unit, made into the summary both readers return. */
function collector() {
  const sums = new Map(), means = new Map(), lasts = new Map(), extremes = new Map(), info = new Map();
  const key = (metric, unit, date) => `${metric}\u0000${unit}\u0000${date}`;
  const meta = (metric, label, combine, range) => { if (!info.has(metric)) info.set(metric, { label, combine, range }); };
  return {
    meta,
    sum(metric, unit, date, v, source = '') { const k = key(metric, unit, date), m = sums.get(k) || new Map(); m.set(source, (m.get(source) || 0) + v); sums.set(k, m); },
    mean(metric, unit, date, v) { const k = key(metric, unit, date), a = means.get(k) || { s: 0, n: 0, min: Infinity, max: -Infinity }; a.s += v; a.n++; a.min = Math.min(a.min, v); a.max = Math.max(a.max, v); means.set(k, a); },
    last(metric, unit, date, v, t) { const k = key(metric, unit, date), a = lasts.get(k); if (!a || !(t < a.t)) lasts.set(k, { v, t }); },
    extreme(metric, unit, date, v, which) { const k = key(metric, unit, date), a = extremes.get(k); extremes.set(k, { v: a === undefined ? v : which === 'min' ? Math.min(a.v, v) : Math.max(a.v, v), which }); },
    finish(extra = {}) {
      const rows = []; // [metric, unit, date, value, aggregation, derived: a day's lowest/highest of a mean, offered but not chosen by default]
      for (const [k, m] of sums) rows.push([...k.split('\u0000'), Math.max(...m.values()), 'sum']);
      for (const [k, a] of means) { const [metric, unit, date] = k.split('\u0000'); rows.push([metric, unit, date, a.s / a.n, 'mean']); if (info.get(metric)?.range) rows.push([`${metric}-min`, unit, date, a.min, 'minimum', metric], [`${metric}-max`, unit, date, a.max, 'maximum', metric]); }
      for (const [k, a] of lasts) rows.push([...k.split('\u0000'), a.v, 'latest']);
      for (const [k, a] of extremes) rows.push([...k.split('\u0000'), a.v, a.which === 'min' ? 'minimum' : 'maximum']);
      // One metric written in two units (kg one year, lb the next) is two metrics, never merged or converted: body-mass-kg, body-mass-lb.
      const units = new Map(); for (const [metric, unit] of rows) { if (!units.has(metric)) units.set(metric, new Set()); units.get(metric).add(unit); }
      const series = new Map();
      for (const [metric, unit, date, value, aggregation, of] of rows) {
        const name = units.get(metric).size > 1 ? metricKey(`${metric}-${unit || 'count'}`) : metric;
        if (!series.has(name)) { const label = of ? `${info.get(of).label}, ${aggregation === 'minimum' ? 'lowest' : 'highest'}` : info.get(metric)?.label || name; series.set(name, { metric: name, unit, aggregation, label: `${label}${name !== metric ? ` (${unit || 'count'})` : ''}`, optional: Boolean(of), days: new Map() }); }
        series.get(name).days.set(date, round(value));
      }
      const metrics = [...series.values()].map((s) => { const d = [...s.days.keys()].sort(); return { metric: s.metric, label: s.label, unit: s.unit, aggregation: s.aggregation, days: d.length, first: d[0], last: d[d.length - 1], optional: s.optional }; }).sort((a, b) => (a.metric < b.metric ? -1 : 1));
      const dates = metrics.flatMap((m) => [m.first, m.last]).sort();
      return {
        ...extra, metrics, first: dates[0] || null, last: dates[dates.length - 1] || null,
        /** The chosen metrics (default: every one that is not a lowest/highest) between since and until, inclusive. */
        numbers({ metrics: chosen = null, since = '', until = '' } = {}) {
          const want = chosen ? new Set([...chosen].map(metricKey)) : null, out = [];
          for (const s of series.values()) {
            if (want ? !want.has(s.metric) : s.optional) continue;
            for (const [date, value] of s.days) if ((!since || date >= since) && (!until || date <= until)) out.push({ date, metric: s.metric, value, unit: s.unit, aggregation: s.aggregation });
          }
          return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric < b.metric ? -1 : 1));
        },
      };
    },
  };
}

const TAG = /<Record\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g, ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/** Reads Apple Health's export.xml in pieces (it is often hundreds of megabytes): only <Record> tags of the types in APPLE are kept, and
 *  only as daily totals, so memory stays small. A record belongs to the date its startDate is written with; sleep to the date the
 *  night's sleep ends (the morning you wake up), naps to the day they end. -> { push(text), end(): summary } */
export function appleHealthScanner() {
  const c = collector(), sleep = [], mindful = [];
  let buf = '', bytes = 0, records = 0, used = 0, other = 0, malformed = 0, head = true;
  for (const t of Object.values(APPLE)) c.meta(t.metric, t.label, t.combine, t.range);
  const record = (attrs) => {
    records++;
    const a = {}; for (const m of attrs.matchAll(ATTR)) a[m[1]] = unxml(m[2] ?? m[3]);
    const t = APPLE[a.type]; if (!t) { other++; return; }
    const date = dayOf(a.startDate), start = instant(a.startDate), end = instant(a.endDate);
    if (!date) { malformed++; return; }
    if (t.combine === 'sleep' || t.combine === 'time') {
      if (!(end > start) || !dayOf(a.endDate)) { malformed++; return; }
      if (t.combine === 'sleep') { if (ASLEEP.test(a.value || '')) { sleep.push([start, end, dayOf(a.endDate)]); used++; } return; }
      mindful.push([start, end, date]); used++; return;
    }
    let v = Number(a.value), unit = a.unit ?? ''; if (!/^-?\d+(\.\d+)?$/.test(String(a.value || '').trim()) || !Number.isFinite(v)) { malformed++; return; }
    if (unit === '%') v *= 100; // HealthKit's percent is a fraction: 0.97 is 97 %
    unit = t.units?.[unit] ?? UNIT[unit] ?? unit;
    if (t.combine === 'sum') c.sum(t.metric, unit, date, v, a.sourceName || '');
    else if (t.combine === 'mean') c.mean(t.metric, unit, date, v);
    else c.last(t.metric, unit, date, v, Number.isFinite(start) ? start : 0);
    used++;
  };
  return {
    push(chunk) {
      bytes += chunk.length; if (bytes > LIMITS.xmlBytes) throw new Error(`This export.xml is larger than ${LIMITS.xmlBytes / 1024 ** 3} GB, more than Jot reads at once. Export again from a phone with less history, or bring in a CSV of the numbers you want.`);
      buf += chunk;
      if (head) { if (/^\s*PK/.test(buf)) throw new Error('This is a ZIP file. Unzip export.zip first, then choose apple_health_export/export.xml.'); if (/<ClinicalDocument\b/.test(buf.slice(0, 4096))) throw new Error('This is export_cda.xml, the clinical document. Choose export.xml instead; clinical records are never imported.'); if (buf.length > 64) head = false; }
      TAG.lastIndex = 0; let at = 0;
      for (let m; (m = TAG.exec(buf));) { record(m[1]); at = TAG.lastIndex; }
      const open = buf.lastIndexOf('<'); buf = buf.slice(Math.max(at, open >= at ? open : buf.length));
      if (buf.length > 1024 * 1024) { malformed++; buf = ''; } // one tag never runs to a megabyte
    },
    end() {
      // Sleep: every asleep span from every source merged (a watch and a sleep app overlapping count once), joined into nights, and each
      // night's time asleep given to the date it ends on, in the time zone it was written with.
      const spans = sleep.sort((a, b) => a[0] - b[0]); let night = null;
      const close = () => { if (night) c.sum('sleep', 'h', night.date, union(night.spans).reduce((k, [s, e]) => k + (e - s), 0) / 3600e3); };
      for (const s of spans) { if (night && s[0] - night.end <= SLEEP_GAP) { night.spans.push(s); if (s[1] >= night.end) { night.end = s[1]; night.date = s[2]; } } else { close(); night = { spans: [s], end: s[1], date: s[2] }; } }
      close();
      const byDay = new Map(); for (const [s, e, d] of mindful) { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push([s, e]); }
      for (const [d, list] of byDay) c.sum('mindful', 'min', d, union(list).reduce((k, [s, e]) => k + (e - s), 0) / 60e3);
      return c.finish({ kind: 'apple', name: 'Apple Health', records, used, other, malformed, bytes });
    },
  };
}
export function readAppleHealth(text) { const s = appleHealthScanner(); s.push(String(text)); return s.end(); }

/** Column headers a health app's CSV uses, lowercased with units in brackets removed: metric, default unit, and how rows on one day
 *  combine. Vendor scores (readiness, sleep score, body battery, stress) are calculations, not measurements, and are left out, as are
 *  latitude, longitude and anything else not listed. */
const C = (metric, unit, combine, ...names) => names.map((n) => [n, { metric, unit, combine }]);
export const CSV_COLUMNS = new Map([
  ...C('steps', '', 'sum', 'steps', 'step count', 'total steps', 'daily steps'),
  ...C('distance', '', 'sum', 'distance', 'total distance', 'walking running distance'),
  ...C('energy', 'kcal', 'sum', 'calories', 'calories burned', 'total calories'),
  ...C('active-energy', 'kcal', 'sum', 'active calories', 'activity calories', 'active energy', 'active energy burned'),
  ...C('flights', '', 'sum', 'floors', 'floors climbed', 'flights climbed'),
  ...C('exercise', 'min', 'sum', 'exercise minutes', 'exercise time', 'active minutes', 'intensity minutes', 'move minutes count', 'move minutes'),
  ...C('very-active-minutes', 'min', 'sum', 'minutes very active', 'very active minutes'),
  ...C('heart-rate', 'bpm', 'mean', 'heart rate', 'average heart rate', 'avg heart rate', 'mean heart rate'),
  ...C('heart-rate-min', 'bpm', 'min', 'min heart rate', 'minimum heart rate', 'lowest heart rate'),
  ...C('heart-rate-max', 'bpm', 'max', 'max heart rate', 'maximum heart rate', 'highest heart rate'),
  ...C('resting-heart-rate', 'bpm', 'mean', 'resting heart rate', 'average resting heart rate', 'resting hr', 'lowest resting heart rate'),
  ...C('hrv', 'ms', 'mean', 'hrv', 'average hrv', 'heart rate variability', 'hrv status', 'overnight hrv'),
  ...C('spo2', '%', 'mean', 'spo2', 'average spo2', 'oxygen saturation', 'blood oxygen'),
  ...C('respiratory-rate', 'breaths/min', 'mean', 'respiratory rate', 'average respiratory rate', 'breathing rate', 'average breathing rate'),
  // Sleep in minutes or seconds keeps its unit and its own name, so it never shares a chart axis with sleep in hours.
  ...C('sleep-minutes', 'min', 'sum', 'minutes asleep', 'sleep minutes'),
  ...C('sleep-seconds', 's', 'sum', 'total sleep duration'),
  ...C('sleep', 'h', 'sum', 'sleep', 'hours asleep', 'sleep hours', 'sleep duration', 'total sleep'),
  ...C('body-mass', '', 'last', 'weight', 'body weight', 'average weight', 'body mass'),
  ...C('body-fat', '%', 'last', 'body fat', 'fat', 'body fat percentage'),
  ...C('mindful', 'min', 'sum', 'mindful minutes', 'mindfulness minutes', 'meditation minutes'),
]);
/** Which app wrote a CSV, from headers only it uses; the name goes into source:. */
const PRESETS = [
  ['Google Fit', /^(move minutes count|heart points|heart minutes)$/],
  ['Fitbit', /^(minutes sedentary|minutes asleep|minutes lightly active|calories burned)$/],
  ['Oura', /^(readiness score|total sleep duration|average hrv)$/],
  ['Garmin', /^(body battery|avg stress|intensity minutes|stress level)$/],
  ['Health Connect', /^(total steps|exercise time|active energy burned)$/],
];
const DATE_HEAD = /^(date|day|calendar date|datum|fecha|summary date|start(\s*date|\s*time)?|time(stamp)?|when)$/i;
const LOCATION = /\b(lat|latitude|lon|lng|longitude|location|gps|place|address)\b/i;
/** Columns never read even by the generic fallback (LEFT_OUT): medication, lab and clinical values, reproductive and sexual health. */
const SENSITIVE = /medic|\bmeds?\b|\bdose|dosage|\bpill|insulin|glucose|sugar|a1c|cholesterol|\blab\b|blood pressure|systolic|diastolic|clinical|diagnos|menstrua|\bperiod|\bcycle|ovulat|cervical|basal|pregnan|contracept|sexual|\bsex\b|fertil|lh test/i;
const unbracket = (h) => h.replace(/\s*[([][^()[\]]{1,12}[)\]]\s*$/, '').trim();

/** A health app's CSV: known columns (CSV_COLUMNS) with their units; the rest are listed in leftOut, not read. With no known column it
 *  falls back to readCSV, without columns that look like a location. dayFirst as in csvDate. -> summary, plus preset, rows, skipped,
 *  ambiguous, leftOut */
export function readHealthCSV(text, { dayFirst = null } = {}) {
  if (String(text).length > LIMITS.csvBytes) throw new Error(`This CSV is larger than ${LIMITS.csvBytes / 1024 ** 2} MB. Export a shorter date range.`);
  const rows = parseCSV(text), head = (rows[0] || []).map((h) => h.trim()), body = rows.slice(1), c = collector();
  const norm = head.map((h) => { const m = /^(.*?)\s*[([]([^()[\]]{1,12})[)\]]\s*$/.exec(h); return { name: (m ? m[1] : h).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(), unit: m ? m[2].trim() : null }; });
  const dateCol = (() => { const named = head.findIndex((h) => DATE_HEAD.test(h)); if (named >= 0) return named; return head.findIndex((_, i) => body.slice(0, 20).filter((r) => csvDate(r[i], { dayFirst })).length >= Math.min(3, body.length)); })();
  const cols = norm.map((h, i) => ({ i, ...h, known: CSV_COLUMNS.get(h.name) })).filter((x) => x.i !== dateCol && x.known && !LOCATION.test(x.name) && !SENSITIVE.test(x.name));
  const preset = (PRESETS.find(([, re]) => norm.some((h) => re.test(h.name))) || [cols.length ? 'Health app' : 'CSV'])[0];
  if (!cols.length) { // not a layout Jot knows: the generic reader, minus anything that looks like a place
    if (dateCol < 0 && rows.length > 1) throw new Error('No column of dates found (a column named date, or one with dates like 2026-10-26)');
    const out = (h) => LOCATION.test(h) || SENSITIVE.test(h), keep = head.filter((h, i) => i !== dateCol && !out(h)).map(unbracket);
    const r = rows.length < 2 || !keep.length ? { numbers: [], rows: body.length, skipped: 0, ambiguous: 0 } : readCSV(text, { combine: 'sum', dayFirst, only: keep });
    for (const n of r.numbers) { c.meta(n.metric, n.metric, 'sum'); c.sum(n.metric, n.unit, n.date, n.value); }
    return c.finish({ kind: 'csv', name: preset, preset: 'generic', rows: r.rows, skipped: r.skipped, ambiguous: r.ambiguous, leftOut: head.filter((h, i) => i !== dateCol && out(h)) });
  }
  if (dateCol < 0) throw new Error('No column of dates found (a column named date, or one with dates like 2026-10-26)');
  for (const x of cols) c.meta(x.known.metric, head[x.i].replace(/\s*[([].*$/, ''), x.known.combine);
  let skipped = 0, ambiguous = 0, n = 0;
  for (const r of body) {
    const d = csvDate(r[dateCol], { dayFirst }); n++;
    if (!d) { if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/.test(String(r[dateCol]).trim())) ambiguous++; else skipped++; continue; }
    for (const x of cols) {
      let v = String(r[x.i] ?? '').trim(); if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, ''); else v = v.replace(/(\d),(\d{1,2})$/, '$1.$2'); // 8,200 steps; 7,5 h
      if (!/^-?\d+(\.\d+)?$/.test(v)) continue;
      const { metric, combine } = x.known, unit = x.unit ?? x.known.unit, num = Number(v);
      if (combine === 'sum') c.sum(metric, unit, d, num); else if (combine === 'last') c.last(metric, unit, d, num, n);
      else if (combine === 'mean') c.mean(metric, unit, d, num); else c.extreme(metric, unit, d, num, combine);
    }
  }
  return c.finish({ kind: 'csv', name: preset, preset, rows: body.length, skipped, ambiguous, leftOut: head.filter((_, i) => i !== dateCol && !cols.some((x) => x.i === i)) });
}

/** Which reader a file needs, from its name and first characters: 'apple', 'csv', or an Error explaining what to choose instead. */
export function healthKind(name, start = '') {
  const s = String(start).replace(/^\uFEFF/, '').trimStart();
  if (s.startsWith('PK')) return new Error('This is a ZIP file. Unzip export.zip first, then choose apple_health_export/export.xml.');
  if (/<ClinicalDocument\b/.test(s)) return new Error('This is export_cda.xml, the clinical document. Choose export.xml instead; clinical records are never imported.');
  if (s.startsWith('<') || /\.xml$/i.test(name)) return 'apple';
  return 'csv';
}

export default { LIMITS, LEFT_OUT, APPLE, CSV_COLUMNS, appleHealthScanner, readAppleHealth, readHealthCSV, healthKind };
