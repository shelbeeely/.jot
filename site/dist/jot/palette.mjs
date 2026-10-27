/** Jot palettes and moodboards, draft 0.1: what a `:::record palette` or `:::record moodboard` holds, as plain data. No DOM, so the
 * preview (preview.mjs), the workspace's copy tool and the tests all read a palette the same way.
 *
 *   :::record palette #autumn-zine
 *   label: Autumn zine
 *   color: #C0392B brick red
 *   color: #f4d03f mustard
 *   color: #234 deep slate        (three digits are shorthand: #223344)
 *   :::
 *
 *   parseColor('#C0392B brick red') -> { hex: '#c0392b', name: 'brick red', raw } | null   (#RRGGBB or #RGB, then an optional name)
 *   contrast(a, b)                   WCAG 2 contrast ratio of two #rrggbb colors (1–21)
 *   labelInk(hex)                    '#000000' or '#ffffff', whichever reads better on hex; always at least 4.5:1
 *   paletteOf(record)                { title, swatches: [{ hex, name, raw, ink, variable }], invalid: [raw], rest: [{ name, value }] }
 *   moodboardOf(record)              { title, images: [{ path, alt, caption, credit }], swatches, invalid, rest: [{ name, value }] }
 *   isPaletteRecord(node)            a palette or moodboard record (or one using the moodboard-and-palette profile)
 *   paletteCSS(palette) / paletteJSON(palette)   the colors as CSS custom properties on :root, or as JSON
 *
 * A color is never carried by color alone: every swatch keeps its name and hex as text. Colors that are not #RRGGBB or #RGB are kept
 * as written, listed in `invalid`, and the parser warns about them (`invalid-color`); they are never silently dropped.
 */
export const COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})(?:[ \t]+(.*))?$/i;
const TYPES = new Set(['palette', 'moodboard']);

export function parseColor(value) {
  const raw = String(value ?? '').trim(), m = COLOR.exec(raw);
  if (!m) return null;
  const digits = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return { hex: '#' + digits.toLowerCase(), name: (m[2] || '').trim(), raw };
}
export function luminance(hex) {
  const c = String(hex).match(/[0-9a-f]{2}/gi).slice(0, 3).map((v) => parseInt(v, 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export const labelInk = (hex) => (contrast(hex, '#000000') >= contrast(hex, '#ffffff') ? '#000000' : '#ffffff');

/** A CSS custom property name from a swatch's name: letters and digits kept (any script), the rest a dash. */
export function variableName(name, index = 0, taken = new Set()) {
  const base = String(name || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `color-${index + 1}`;
  let v = `--${base}`, n = 2;
  while (taken.has(v)) v = `--${base}-${n++}`;
  taken.add(v); return v;
}
const field = (record, k) => ((record.fields || []).find((f) => f.name === k) || {}).value || '';
const titleOf = (record, fallback) => field(record, 'label') || field(record, 'name') || record.id || fallback;
const titleField = (record) => (field(record, 'label') ? 'label' : field(record, 'name') ? 'name' : '');

export const isPaletteRecord = (n) => !!n && n.type === 'record' && (TYPES.has(n.recordType) || (n.fields || []).some((f) => f.name === 'method' && /^moodboard-and-palette@/.test(f.value)));

function colorsOf(record) {
  const swatches = [], invalid = [], taken = new Set();
  for (const f of record.fields || []) {
    if (f.name !== 'color') continue;
    const c = parseColor(f.value);
    if (!c) { invalid.push(f.value); continue; }
    swatches.push({ ...c, ink: labelInk(c.hex), variable: variableName(c.name, swatches.length, taken) });
  }
  return { swatches, invalid };
}
/** A palette's colors; its other fields (method, body, notes …) stay in `rest`, in order. */
export function paletteOf(record) { const t = titleField(record); return { title: titleOf(record, 'Palette'), ...colorsOf(record), rest: (record.fields || []).filter((f) => f.name !== 'color' && f.name !== t) }; }

/** A moodboard's pictures, in order: `image:` or `asset:` is a path, then optionally a description; `alt:`, `caption:` and `credit:`
 * after it describe the picture before them. Other fields (body, notes, method …) stay in `rest`, in order. */
export function moodboardOf(record) {
  const images = [], rest = [], t = titleField(record);
  for (const f of record.fields || []) {
    if (f.name === 'image' || f.name === 'asset') {
      const m = /^(\S+)(?:[ \t]+(.*))?$/.exec(f.value.trim());
      if (m) { images.push({ path: m[1], alt: (m[2] || '').trim(), caption: '', credit: '' }); continue; }
    } else if (['alt', 'caption', 'credit'].includes(f.name) && images.length) { images[images.length - 1][f.name] = f.value; continue; }
    else if (f.name === 'color' || f.name === t) continue;
    rest.push(f);
  }
  return { title: titleOf(record, 'Moodboard'), images, rest, ...colorsOf(record) };
}

const comment = (s) => String(s).replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ');
export function paletteCSS(palette) {
  const lines = palette.swatches.map((s) => `  ${s.variable}: ${s.hex};${s.name ? ` /* ${comment(s.name)} */` : ''}`);
  return `/* ${comment(palette.title)}: a Jot palette */\n:root {\n${lines.join('\n')}\n}\n`;
}
export function paletteJSON(palette) {
  return JSON.stringify({ name: palette.title, colors: palette.swatches.map((s) => ({ name: s.name, hex: s.hex, variable: s.variable })) }, null, 2) + '\n';
}

export default { COLOR, parseColor, luminance, contrast, labelInk, variableName, isPaletteRecord, paletteOf, moodboardOf, paletteCSS, paletteJSON };
