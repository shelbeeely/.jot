// Sticker packs: the pure part. A placed sticker is an ordinary image reference, `![Bus or transit](assets/stickers/…png)`,
// to a picture attached to the journal, so it reads in any text editor and needs nothing outside the .jotz to show.
// A pack is an ordinary .jotz whose writing lists one `planner-sticker-and-deco-culture@1` attachment record per sticker
// (spec 13.31): path, media-type, alt (the words a reader hears, and the label shown under it) and role.
// Jot's own pack is functional, black and white and shape-distinct, drawn here as path data on a 24-unit grid.
import { parse } from './jot/jot.mjs';

export const METHOD = 'planner-sticker-and-deco-culture@1';
export const STICKER_SIZE = 96; // pixels: about an inch on the page, which is what the picture's own size gives it
export const MAX_STICKERS = 60;
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const PICTURE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']); // the renderer's raster allowlist
export const BUILTIN_ID = 'jot-functional';

// The functional icon bank of docs/methods/planner-sticker-and-deco-culture.md, section 22 (line 418): one shape each,
// never a color for meaning, with the words beside it. Jot's own drawings, CC0 like the rest of the site.
export const FUNCTIONAL = [
  ['shift-day', 'Day shift', 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8'],
  ['shift-night', 'Night shift', 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10zM18 3v3M16.5 4.5h3'],
  ['day-off', 'Day off', 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4M12 18l-2.8-2.8a1.7 1.7 0 0 1 2.8-2a1.7 1.7 0 0 1 2.8 2z'],
  ['bus', 'Bus or transit', 'M7 3h10a3 3 0 0 1 3 3v11H4V6a3 3 0 0 1 3-3zM4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01'],
  ['meds', 'Medication or refill', 'M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 7l7 7'],
  ['hrt', 'HRT dose or appointment', 'M9 3h6M10 3v5l-4.5 9.5A2 2 0 0 0 7.3 20.5h9.4a2 2 0 0 0 1.8-3L14 8V3M7.5 14h9'],
  ['clinic', 'Doctor or clinic', 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM12 8v8M8 12h8'],
  ['payday', 'Payday', 'M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0'],
  ['bill', 'Bill due', 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5zM9 8h6M9 12h6M9 16h3'],
  ['call', 'Call someone', 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2'],
  ['text', 'Text someone', 'M4 5h16v11H10l-4 4v-4H4zM8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01'],
  ['laundry', 'Laundry', 'M5 3h14v18H5zM5 7h14M8 5h.01M8 14a4 4 0 1 0 8 0a4 4 0 1 0-8 0'],
  ['groceries', 'Groceries', 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2'],
  ['bins', 'Bins out', 'M4 6h16M9 6V4h6v2M6 6l1 15h10l1-15M10 10v7M14 10v7'],
  ['walk', 'Outside or walk', 'M12 3a5 5 0 0 1 5 5a4 4 0 0 1-1 7.5H8A4 4 0 0 1 7 8a5 5 0 0 1 5-5zM12 15.5V21M9 21h6'],
  ['rest', 'Rest day', 'M3 6v14M3 14h18v6M21 14v-2a3 3 0 0 0-3-3h-7v5M6.5 11.5h.01'],
  ['air', 'Smoke or air quality', 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7'],
  ['weather', 'Weather alert', 'M7 16a4 4 0 0 1-.5-8a6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 16M13 11l-3 5h4l-3 5'],
  ['birthday', 'Birthday', 'M4 21h16M5 21v-8h14v8M5 16.5c2 1.5 4.5 1.5 7 0s5-1.5 7 0M12 13V9.5M12 5a1 1.5 0 0 1 0 3a1 1.5 0 0 1 0-3'],
  ['important', 'Important', 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'],
  ['moved', 'Moved forward', 'M5 12h13M13 6l6 6-6 6'],
  ['done', 'Done', 'M5 12.5l4.5 4.5L19 7'],
  ['plain', 'Plain day', 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0'] // section 22, item 26: not decorating is a choice, not a failure
].map(([id, alt, d]) => ({ id, alt, d, role: 'functional' }));

export const builtinPack = () => ({
  id: BUILTIN_ID, title: 'Jot functional stickers', builtin: true, license: 'CC0-1.0', creator: 'Jot',
  stickers: FUNCTIONAL.map(s => ({ ...s, name: s.id, path: `assets/stickers/${BUILTIN_ID}/${s.id}.png`, mediaType: 'image/png', license: 'CC0-1.0', creator: 'Jot' }))
});

const oneLine = (value, max = 200) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export const slug = (value, fallback = 'sticker') => oneLine(value).normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || fallback;
/** The words a picture name gives before anyone writes better ones: "rain-cloud_2.png" → "rain cloud 2". */
export const labelFromName = name => oneLine(String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')) || 'Sticker';

/** What goes in at the cursor: an image reference whose words are the sticker's description. */
export function stickerReference(alt, path) {
  const words = oneLine(alt).replace(/[[\]\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!words) throw new Error('A sticker needs a few words saying what it shows.');
  if (!/^(assets|media)\/[A-Za-z0-9._/-]+$/.test(path) || path.split('/').includes('..')) throw new Error('That sticker has no usable attachment path.');
  return `![${words}](${path})`;
}

/** A path under assets/stickers/ that no other attachment uses. */
export function stickerPath(packId, name, taken = new Set()) {
  const base = `assets/stickers/${slug(packId, 'pack')}/${slug(name)}`;
  let path = base + '.png', n = 2;
  while (taken.has(path)) path = `${base}-${n++}.png`;
  return path;
}

export const sameBytes = (a, b) => a && b && a.length === b.length && a.every((x, i) => x === b[i]);
/** An attachment already in the journal with exactly these bytes, so the same sticker placed twice is attached once. */
export const attachedCopy = (assets, bytes) => assets.find(a => sameBytes(a.data, bytes)) || null;

/** The writing of a pack's .jotz: a heading, one line about it, and one attachment record per sticker. */
export function packSource(pack) {
  if (!pack.stickers?.length) throw new Error('This pack has no stickers.');
  const used = new Set(), lines = ['# ' + (oneLine(pack.title) || 'Stickers'), '', 'A sticker pack for Jot Writer: one attachment record for each sticker. Open it in Writer under Stickers.', ''];
  for (const s of pack.stickers) {
    let id = 'sticker-' + slug(s.name || s.alt), n = 2;
    while (used.has(id)) id = `sticker-${slug(s.name || s.alt)}-${n++}`;
    used.add(id);
    lines.push(`:::record attachment #${id}`, `method: ${METHOD}`, `path: ${s.path}`, `media-type: ${s.mediaType}`, `alt: ${oneLine(s.alt) || 'Sticker'}`, `role: ${s.role === 'functional' ? 'functional' : 'decorative'}`);
    for (const key of ['license', 'creator']) if (oneLine(s[key] ?? pack[key])) lines.push(`${key}: ${oneLine(s[key] ?? pack[key])}`);
    lines.push(':::', '');
  }
  return lines.join('\n');
}

/**
 * The stickers a pack's writing and attachments describe. Everything here is untrusted: only records with the sticker
 * method, a picture type the renderer shows and an attached file count; the rest is reported as skipped, never guessed.
 */
export function readPack(source, assets, fallbackTitle = 'Stickers') {
  const { nodes } = parse(String(source || ''));
  const title = oneLine(nodes.find(n => n.type === 'heading')?.text?.replace(/^#+\s*/, '') || fallbackTitle, 80) || 'Stickers';
  const byPath = new Map(assets.map(a => [a.path, a])), stickers = [], seen = new Set();
  let skipped = 0;
  for (const n of nodes) {
    if (n.type !== 'record' || n.recordType !== 'attachment') continue;
    const f = Object.fromEntries(n.fields.map(x => [x.name, x.value]));
    if (f.method !== METHOD) continue;
    const a = byPath.get(f.path), mediaType = f['media-type'] || a?.mediaType;
    if (!a || !PICTURE_TYPES.has(mediaType) || a.mediaType !== mediaType || !a.data?.length || seen.has(f.path) || stickers.length >= MAX_STICKERS) { skipped++; continue; }
    seen.add(f.path);
    stickers.push({ name: n.anchor?.replace(/^sticker-/, '') || slug(f.alt), alt: oneLine(f.alt) || labelFromName(f.path.split('/').pop()), role: f.role === 'functional' ? 'functional' : 'decorative', path: f.path, mediaType, data: a.data, license: oneLine(f.license) || undefined, creator: oneLine(f.creator) || undefined });
  }
  return { title, stickers, skipped };
}

// Free placement (spec 13.31): a placed sticker is its own record, written after the paragraph at the cursor and anchored
// there. x is the left edge as a percentage of the writing's width, y the top in em below the record's place.
export const PLACE = { x: 78, y: -3, width: 4, rotate: 0 };
const num = (v, digits) => String(Number(v.toFixed(digits)));
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const placementValues = ({ x, y, width, rotate }) => ({
  ...(x === undefined ? {} : { x: num(clamp(x, 0, 100), 1) + '%' }), ...(y === undefined ? {} : { y: num(clamp(y, -200, 200), 2) + 'em' }),
  ...(width === undefined ? {} : { width: num(clamp(width, 1, 20), 2) + 'em' }), ...(rotate === undefined ? {} : { rotate: num(((rotate + 540) % 360) - 180, 1) + 'deg' })
});

/** A record ID for this sticker that the journal does not use yet. */
export function stickerId(source, name) {
  const used = new Set(parse(String(source || '')).nodes.map(n => n.anchor).filter(Boolean)), base = 'sticker-' + slug(name);
  let id = base, n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  return id;
}

/** The record for a sticker or stamp placed freely. */
export function placedRecord({ id, path, mediaType = 'image/png', alt, role, finish = 'sticker', place = PLACE }) {
  const words = oneLine(alt, 120);
  if (!words) throw new Error('A sticker needs a few words saying what it shows.');
  stickerReference(words, path); // the same path rules as a sticker in the line
  const v = placementValues(place);
  return [`:::record attachment #${id}`, `method: ${METHOD}`, `path: ${path}`, `media-type: ${mediaType}`, `alt: ${words}`, `role: ${role === 'functional' ? 'functional' : 'decorative'}`,
    ...(finish === 'stamp' ? ['finish: stamp'] : []), `x: ${v.x}`, `y: ${v.y}`, `width: ${v.width}`, ...(Number(place.rotate) ? [`rotate: ${v.rotate}`] : []), ':::'].join('\n');
}

/** Where a placed sticker's record goes: after the paragraph (or block) the cursor is in, never inside it. */
export function blockEnd(source, caret) {
  const text = String(source || ''), at = clamp(caret, 0, text.length);
  const node = parse(text).nodes.find(n => n.type !== 'blank' && n.start <= at && at < n.end) || null;
  if (node) return node.end;
  return at;
}

/** The change that inserts a record as its own block at offset, with a blank line on each side. */
export function blockInsertion(source, offset, record) {
  if (source.startsWith('\r\n', offset)) offset += 2; else if (source[offset] === '\n') offset += 1; // after the block's own line break
  const before = source.slice(0, offset), after = source.slice(offset);
  const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const tail = !after || /^\r?\n/.test(after) ? '' : '\n';
  return { start: offset, end: offset, text: lead + record + '\n' + tail, recordStart: offset + lead.length };
}

/** A record's source with some fields set (replaced in place, or added before its closing line) and others removed. */
export function setRecordFields(raw, values, remove = []) {
  const newline = raw.includes('\r\n') ? '\r\n' : '\n', lines = raw.split(/\r?\n/), close = lines.findLastIndex(l => /^:::\s*$/.test(l));
  if (close < 1) throw new Error('That sticker’s record is not complete.');
  const left = new Map(Object.entries(values)), out = [];
  lines.forEach((line, i) => {
    const m = /^([a-z][a-z0-9-]*):/.exec(line);
    if (i === close) for (const [k, v] of left) out.push(`${k}: ${v}`);
    if (i > 0 && i < close && m && remove.includes(m[1])) return;
    if (i > 0 && i < close && m && left.has(m[1])) { out.push(`${m[1]}: ${left.get(m[1])}`); left.delete(m[1]); return; }
    out.push(line);
  });
  return out.join(newline);
}
