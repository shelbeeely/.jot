// Local capture/export rules shared by browser tools. No requests or storage side effects.
import { parse } from './jot/jot.mjs';
import { pack, readDocument, safePath, sha256, LIMITS } from './jot/container.mjs';
import { isLocked } from './jot/lock.mjs';
export const TRANSFER_LIMIT = LIMITS.packageBytes;
const enc = new TextEncoder();
export const captureId = () => crypto.randomUUID();
export function entriesOf(source) {
  const ast = parse(source), bytes = enc.encode(source), decode = byte => new TextDecoder().decode(bytes.subarray(0, byte)).length;
  const headings = ast.nodes.filter(n => n.type === 'heading' && n.date);
  return headings.map((n, i) => ({ start: decode(n.start), end: headings[i + 1] ? decode(headings[i + 1].start) : source.length, label: n.text }));
}
export function dependencies(source, assets) {
  const available = new Map(assets.map(a => [a.path, a])), wanted = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (['link', 'image'].includes(value.type) && typeof value.href === 'string' && /^(assets|media)\//.test(value.href)) wanted.add(value.href);
    if (value.name && typeof value.value === 'string' && /^(assets|media)\//.test(value.value) && safePath(value.value)) wanted.add(value.value);
    for (const child of Object.values(value)) if (Array.isArray(child)) child.forEach(visit); else if (child && typeof child === 'object') visit(child);
  };
  visit(parse(source));
  for (const path of wanted) {
    const asset = available.get(path);
    if (!asset) throw Error('A referenced attachment is missing: ' + path);
    if (path.endsWith('.jot-ink.json')) {
      const ink = JSON.parse(new TextDecoder().decode(asset.data));
      if (ink.background) { if (!safePath(ink.background) || !/^(assets|media)\//.test(ink.background)) throw Error('Unsafe ink background.'); wanted.add(ink.background); }
    }
  }
  return [...wanted].map(path => { const item = available.get(path); if (!item) throw Error('A referenced attachment is missing: ' + path); return item; });
}
export async function excerptFile(source, assets, name = 'excerpt') {
  if (!source.trim() || enc.encode(source).length > LIMITS.sourceBytes) throw Error('Choose writing under 1 MiB.');
  const errors = parse(source).diagnostics.filter(d => d.severity === 'error');
  if (errors.length) throw Error('Choose complete entries or writing outside structured blocks.');
  const kept = dependencies(source, assets);
  const bytes = kept.length ? await pack({ source, assets: kept }) : enc.encode(source);
  return new File([bytes], name.replace(/\.(jotz?|jotlock)$/i, '') + (kept.length ? '.jotz' : '.jot'), { type: kept.length ? 'application/zip' : 'text/plain' });
}
export async function reviewCapture(item) {
  if (!item || typeof item.id !== 'string' || !Array.isArray(item.files) || typeof item.text !== 'string') throw Error('Invalid incoming capture.');
  let source = item.text, assets = [], journal = null;
  if (enc.encode(source).length > LIMITS.sourceBytes) throw Error('Shared text exceeds 1 MiB.');
  for (const file of item.files) {
    if (!(file instanceof Blob) || file.size > TRANSFER_LIMIT) throw Error('Invalid or oversized shared file.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (isLocked(bytes)) return { locked: true, file, source: '', assets: [] };
    if (/\.(jotz?|md|txt)$/i.test(file.name)) {
      if (journal || item.files.length !== 1) throw Error('Open or add each journal separately.');
      journal = await readDocument(bytes); source = [source, journal.source].filter(Boolean).join('\n\n'); assets = journal.assets;
    } else {
      if (bytes.length > LIMITS.assetBytes) throw Error('Attachments must be under 32 MiB.');
      const leaf = String(file.name || 'attachment').replace(/[^\p{L}\p{N}._-]/gu, '-').slice(0, 100) || 'attachment';
      const path = 'assets/shared-' + item.id + '-' + assets.length + '-' + leaf;
      assets.push({ path, mediaType: file.type || 'application/octet-stream', data: bytes });
      source += (source ? '\n\n' : '') + `[Shared attachment](${path})`;
    }
  }
  if (enc.encode(source).length > LIMITS.sourceBytes || assets.length > LIMITS.entries - 2 || assets.reduce((n, a) => n + a.data.length, 0) > LIMITS.totalBytes - LIMITS.sourceBytes - LIMITS.manifestBytes) throw Error('Incoming content exceeds document limits.');
  return { source, assets, locked: false };
}
export async function mergedAssets(existing, incoming) {
  const result = [...existing], map = new Map(result.map(a => [a.path, a]));
  for (const a of incoming) {
    if (!safePath(a.path) || !/^(assets|media)\//.test(a.path)) throw Error('Unsafe attachment path.');
    const previous = map.get(a.path);
    if (previous) { if (await sha256(previous.data) !== await sha256(a.data)) throw Error('Attachment name conflict. Open this capture separately.'); }
    else { result.push(a); map.set(a.path, a); }
  }
  if (result.length > 254 || result.some(a => a.data.length > LIMITS.assetBytes) || result.reduce((n, a) => n + a.data.length, 0) > 62 * 1024 * 1024) throw Error('The combined attachments exceed the journal limits.');
  return result;
}
export function appendCapture(source, position, text) {
  if (!text.trim()) throw Error('This capture has no writing.');
  const old = parse(source), incoming = parse(text), ids = new Set(old.nodes.map(n => n.id).filter(Boolean));
  if (old.diagnostics.some(d => d.severity === 'error') || incoming.diagnostics.some(d => d.severity === 'error')) throw Error('Fix syntax problems or open this as a separate journal.');
  if (incoming.nodes.some(n => n.id && ids.has(n.id))) throw Error('A record ID already exists. Open this capture as a separate journal.');
  if (incoming.metadataRange) throw Error('This journal has document metadata. Open it separately, or review and remove the metadata before adding.');
  if (!Number.isInteger(position) || position < 0 || position > source.length) throw Error('Choose a new caret position.');
  const at = enc.encode(source.slice(0, position)).length;
  if (old.metadataRange && at < old.metadataRange.end || old.nodes.some(n => !['paragraph', 'blank', 'heading'].includes(n.type) && at > n.start && at < n.end)) throw Error('Choose a caret outside structured blocks.');
  const prefix = source.slice(0, position), suffix = source.slice(position), insertion = (prefix && !prefix.endsWith('\n\n') ? '\n\n' : '') + text + (text.endsWith('\n\n') ? '' : '\n\n');
  const result = prefix + insertion + suffix;
  if (enc.encode(result).length > LIMITS.sourceBytes || parse(result).diagnostics.some(d => d.severity === 'error')) throw Error('This insertion creates syntax problems or exceeds the source limit.');
  return { start: position, end: position, text: insertion };
}
