// The files of a fixed-layout EPUB made from Page view's sheets (page-view-frame.mjs jotBook, jot/epub.mjs). Pure: no DOM, so
// Node tests read the same book Writer saves.
//   bookParts({ css, pages }, { modelBytes(path) -> Uint8Array | null, three, viewer, decoderBytes(name) -> Uint8Array })
//     -> Promise<{ css, pages, files, models, missing }>
// Pictures and fonts the page carries as data: URLs become files in the book (once each, named by their SHA-256). A sheet with a 3D
// model whose bytes are in the journal gets Jot's viewer scripts and the model's bytes as a script (books never fetch); a model
// without them keeps its still, and is counted in `missing`. A compressed model (Draco meshes, Basis Universal textures) brings the
// decoders it needs, once per book, as scripts too.
import { EPUB_MEDIA_TYPES, EPUB_MODELS_JS, modelScript, decoderScript } from './jot/epub.mjs';
import { decodersFor } from './jot/model3d.mjs';

const EXT = Object.fromEntries(Object.entries(EPUB_MEDIA_TYPES).filter(([e]) => e !== 'jpeg').map(([e, t]) => [t, e]));
const ALIAS = { 'audio/mp3': 'audio/mpeg', 'audio/x-wav': 'audio/wav', 'audio/x-flac': 'audio/flac', 'image/jpg': 'image/jpeg' }; // older names for the same files
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function base64(bytes) {
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
/** 'data:image/png;base64,…' or 'data:image/svg+xml,%3Csvg…' -> { type, bytes } | null */
export function decodeDataURL(url) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)?((?:;[a-z0-9-]+=[^;,]*)*)(;base64)?,(.*)$/is.exec(url.trim()); if (!m) return null;
  const type = (m[1] || 'text/plain').toLowerCase();
  try {
    if (m[3]) { const bin = atob(m[4].replace(/\s+/g, '')), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return { type, bytes }; }
    return { type, bytes: new TextEncoder().encode(decodeURIComponent(m[4])) };
  } catch { return null; }
}
async function sha(bytes) { const h = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)); return [...h.slice(0, 10)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

export async function bookParts({ css, pages }, { modelBytes = () => null, three, viewer, decoderBytes = () => null } = {}) {
  const files = [], byURL = new Map(), byHash = new Map();
  async function keep(url) { // a data: URL -> the book's file for it, or null to leave it as written
    if (byURL.has(url)) return byURL.get(url);
    const d = decodeDataURL(url); if (d) d.type = ALIAS[d.type] || d.type;
    const ext = d && EXT[d.type]; let path = null;
    if (ext && ext !== 'js' && ext !== 'css') { // pictures, fonts and attached recordings
      const hash = await sha(d.bytes);
      path = byHash.get(hash) || `${d.type.startsWith('font/') ? 'fonts' : 'media'}/${hash}.${ext}`;
      if (!byHash.has(hash)) { byHash.set(hash, path); files.push({ path, mediaType: d.type, data: d.bytes }); }
    }
    byURL.set(url, path); return path;
  }
  // url("data:…"), url('data:…'), url(data:…) in the stylesheet; src="data:…" and url(&quot;data:…&quot;) in the serialized pages
  const CSS_URL = /url\(\s*(?:"(data:[^"]*)"|'(data:[^']*)'|(data:[^)'"\s]*))\s*\)/gi;
  const BODY_URL = /url\(&quot;(data:.*?)&quot;\)|\bsrc="(data:[^"]*)"/gi;
  async function rewrite(text, re, wrap, decode = (s) => s) {
    const found = [...text.matchAll(re)], parts = []; let at = 0;
    for (const m of found) {
      const raw = m.slice(1).find((x) => x !== undefined), path = await keep(decode(raw));
      parts.push(text.slice(at, m.index), path ? wrap(m[0], path) : m[0]); at = m.index + m[0].length;
    }
    return parts.join('') + text.slice(at);
  }
  // Pages were laid out for print, where a recording is a quiet box; in the book the player takes that box's place.
  const outCSS = await rewrite(css, CSS_URL, (_, p) => `url("../${p}")`) + '\n.pagedjs_pages .jot-media audio,.pagedjs_pages .jot-media video{display:block!important}.pagedjs_pages .jot-media-still{display:none!important}';
  const models = new Map(), needs = new Map(), decoders = new Map(), missing = new Set(), outPages = [];
  for (const page of pages) {
    const body = await rewrite(page.body, BODY_URL, (m, p) => (m.startsWith('src=') ? `src="../${p}"` : `url(&quot;../${p}&quot;)`), unescape);
    const scripts = [];
    for (const file of page.models || []) {
      if (!models.has(file)) {
        const bytes = await modelBytes(file);
        if (!bytes?.length) { missing.add(file); models.set(file, null); continue; }
        const path = `js/models/${await sha(bytes)}.js`; models.set(file, path); needs.set(file, decodersFor(bytes));
        files.push({ path, mediaType: 'application/javascript', data: modelScript(file, base64(bytes)) });
        for (const name of needs.get(file)) if (!decoders.has(name)) {
          const data = await decoderBytes(name); if (!data?.length) throw new Error(`The ${name} decoder could not be read for the book.`);
          const at = `js/decoders/${name.replace(/\./g, '-')}.js`; decoders.set(name, at);
          files.push({ path: at, mediaType: 'application/javascript', data: decoderScript(name, base64(data instanceof Uint8Array ? data : new Uint8Array(data))) });
        }
      }
      if (models.get(file) && !scripts.includes(models.get(file))) scripts.push(models.get(file));
    }
    const used = [...new Set((page.models || []).filter((f) => models.get(f)).flatMap((f) => needs.get(f)))].map((n) => decoders.get(n));
    outPages.push({ body, headings: page.headings || [], label: page.label, ...(scripts.length ? { scripts: ['js/three.js', 'js/model3d-view.js', ...used, ...scripts, 'js/models.js'] } : {}) });
  }
  if (outPages.some((p) => p.scripts)) {
    if (!three || !viewer) throw new Error('The 3D viewer could not be read for the book.');
    files.push({ path: 'js/three.js', mediaType: 'application/javascript', data: three }, { path: 'js/model3d-view.js', mediaType: 'application/javascript', data: viewer },
      { path: 'js/models.js', mediaType: 'application/javascript', data: EPUB_MODELS_JS });
  }
  return { css: outCSS, pages: outPages, files, models: [...models.values()].filter(Boolean).length, missing: [...missing] };
}
export default { bookParts, decodeDataURL, base64 };
